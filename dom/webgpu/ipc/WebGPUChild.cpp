/* -*- Mode: C++; tab-width: 20; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WebGPUChild.h"

#include <utility>

#include "Adapter.h"
#include "CompilationInfo.h"
#include "DeviceLostInfo.h"
#include "PipelineLayout.h"
#include "Sampler.h"
#include "Utility.h"
#include "js/RootingAPI.h"
#include "js/String.h"
#include "js/TypeDecls.h"
#include "js/Value.h"
#include "js/Warnings.h"  // JS::WarnUTF8
#include "mozilla/Assertions.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/dom/GPUUncapturedErrorEvent.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/dom/WebGPUBinding.h"
#include "mozilla/webgpu/ComputePipeline.h"
#include "mozilla/webgpu/InternalError.h"
#include "mozilla/webgpu/OutOfMemoryError.h"
#include "mozilla/webgpu/PipelineError.h"
#include "mozilla/webgpu/PromiseHelpers.h"
#include "mozilla/webgpu/RenderPipeline.h"
#include "mozilla/webgpu/ValidationError.h"
#include "mozilla/webgpu/WebGPUTypes.h"
#include "mozilla/webgpu/ffi/wgpu.h"

namespace mozilla::webgpu {

void WebGPUChild::JsWarning(nsIGlobalObject* aGlobal,
                            const nsACString& aMessage) {
  const auto& flatString = PromiseFlatCString(aMessage);
  if (aGlobal) {
    dom::AutoJSAPI api;
    if (api.Init(aGlobal)) {
      JS::WarnUTF8(api.cx(), "Uncaptured WebGPU error: %s", flatString.get());
    }
  } else {
    printf_stderr("Uncaptured WebGPU error without device target: %s\n",
                  flatString.get());
  }
}

void on_message_queued(ffi::WGPUWebGPUChildPtr child) {
  auto* c = static_cast<WebGPUChild*>(child);
  c->ScheduleFlushQueuedMessages();
}

WebGPUChild::WebGPUChild()
    : mClient(ffi::wgpu_client_new(this, on_message_queued)) {}

WebGPUChild::~WebGPUChild() = default;

RawId WebGPUChild::RenderBundleEncoderFinish(
    ffi::WGPURenderBundleEncoder& aEncoder, RawId aDeviceId,
    const dom::GPURenderBundleDescriptor& aDesc) {
  ffi::WGPURenderBundleDescriptor desc = {};

  webgpu::StringHelper label(aDesc.mLabel);
  desc.label = label.Get();

  RawId id = ffi::wgpu_client_create_render_bundle(GetClient(), aDeviceId,
                                                   &aEncoder, &desc);

  return id;
}

RawId WebGPUChild::RenderBundleEncoderFinishError(RawId aDeviceId,
                                                  const nsString& aLabel) {
  webgpu::StringHelper label(aLabel);

  RawId id = ffi::wgpu_client_create_render_bundle_error(GetClient(), aDeviceId,
                                                         label.Get());

  return id;
}

namespace ffi {
void wgpu_child_send_messages(WGPUWebGPUChildPtr aChild, uint32_t aNrOfMessages,
                              struct WGPUByteBuf aSerializedMessages) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto messages =
      ipc::ByteBuf(aSerializedMessages.data, aSerializedMessages.len,
                   aSerializedMessages.capacity);
  c->SendSerializedMessages(aNrOfMessages, std::move(messages));
}

void wgpu_child_resolve_request_adapter_promise(
    WGPUWebGPUChildPtr aChild, RawId aAdapterId,
    const struct WGPUAdapterInformation* aAdapterInfo) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeueRequestAdapterPromise();

  MOZ_RELEASE_ASSERT(pending_promise.adapter_id == aAdapterId);

  if (aAdapterInfo == nullptr) {
    promise::MaybeResolveWithNull(std::move(pending_promise.promise));
  } else {
    auto info = std::make_shared<WGPUAdapterInformation>(*aAdapterInfo);
    RefPtr<Adapter> adapter = new Adapter(pending_promise.instance, c, info);
    promise::MaybeResolve(std::move(pending_promise.promise),
                          std::move(adapter));
  }
}

void wgpu_child_resolve_request_device_promise(WGPUWebGPUChildPtr aChild,
                                               RawId aDeviceId, RawId aQueueId,
                                               const nsCString* aError) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeueRequestDevicePromise();

  MOZ_RELEASE_ASSERT(pending_promise.device_id == aDeviceId);
  MOZ_RELEASE_ASSERT(pending_promise.queue_id == aQueueId);

  if (aError == nullptr) {
    RefPtr<Device> device =
        new Device(pending_promise.adapter, pending_promise.device_id,
                   pending_promise.queue_id, pending_promise.features,
                   pending_promise.limits, pending_promise.adapter_info,
                   pending_promise.lost_promise);
    device->SetLabel(pending_promise.label);
    promise::MaybeResolve(std::move(pending_promise.promise),
                          std::move(device));
  } else {
    promise::MaybeRejectWithOperationError(std::move(pending_promise.promise),
                                           nsCString(*aError));
  }
}

void wgpu_child_resolve_pop_error_scope_promise(WGPUWebGPUChildPtr aChild,
                                                RawId aDeviceId, uint8_t aTy,
                                                const nsCString* aMessage) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeuePopErrorScopePromise();

  MOZ_RELEASE_ASSERT(pending_promise.device->GetId() == aDeviceId);

  RefPtr<Error> error;

  switch ((PopErrorScopeResultType)aTy) {
    case PopErrorScopeResultType::NoError:
      promise::MaybeResolveWithNull(std::move(pending_promise.promise));
      return;

    case PopErrorScopeResultType::DeviceLost:
      promise::MaybeResolveWithNull(std::move(pending_promise.promise));
      return;

    case PopErrorScopeResultType::ThrowOperationError:
      promise::MaybeRejectWithOperationError(std::move(pending_promise.promise),
                                             nsCString(*aMessage));
      return;

    case PopErrorScopeResultType::OutOfMemory:
      error = new OutOfMemoryError(pending_promise.device->GetParentObject(),
                                   *aMessage);
      break;

    case PopErrorScopeResultType::ValidationError:
      error = new ValidationError(pending_promise.device->GetParentObject(),
                                  *aMessage);
      break;

    case PopErrorScopeResultType::InternalError:
      error = new InternalError(pending_promise.device->GetParentObject(),
                                *aMessage);
      break;
  }
  promise::MaybeResolve(std::move(pending_promise.promise), std::move(error));
}

void wgpu_child_resolve_create_pipeline_promise(WGPUWebGPUChildPtr aChild,
                                                RawId aPipelineId,
                                                bool aIsRenderPipeline,
                                                bool aIsValidationError,
                                                const nsCString* aError) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeueCreatePipelinePromise();

  MOZ_RELEASE_ASSERT(pending_promise.pipeline_id == aPipelineId);
  MOZ_RELEASE_ASSERT(pending_promise.is_render_pipeline == aIsRenderPipeline);

  if (aError == nullptr) {
    if (pending_promise.is_render_pipeline) {
      RefPtr<RenderPipeline> object = new RenderPipeline(
          pending_promise.device, pending_promise.pipeline_id);
      object->SetLabel(pending_promise.label);
      promise::MaybeResolve(std::move(pending_promise.promise),
                            std::move(object));
    } else {
      RefPtr<ComputePipeline> object = new ComputePipeline(
          pending_promise.device, pending_promise.pipeline_id);
      object->SetLabel(pending_promise.label);
      promise::MaybeResolve(std::move(pending_promise.promise),
                            std::move(object));
    }
  } else {
    dom::GPUPipelineErrorReason reason;
    if (aIsValidationError) {
      reason = dom::GPUPipelineErrorReason::Validation;
    } else {
      reason = dom::GPUPipelineErrorReason::Internal;
    }
    RefPtr<PipelineError> e = new PipelineError(*aError, reason);
    promise::MaybeRejectWithPipelineError(std::move(pending_promise.promise),
                                          std::move(e));
  }
}

void wgpu_child_resolve_create_shader_module_promise(
    WGPUWebGPUChildPtr aChild, RawId aShaderModuleId,
    struct WGPUFfiSlice_FfiShaderModuleCompilationMessage aMessages) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeueCreateShaderModulePromise();

  MOZ_RELEASE_ASSERT(pending_promise.shader_module->GetId() == aShaderModuleId);

  auto ffi_messages = Span(aMessages.data, aMessages.length);

  auto messages = nsTArray<WebGPUCompilationMessage>(aMessages.length);
  for (const auto& message : ffi_messages) {
    WebGPUCompilationMessage msg;
    msg.lineNum = message.line_number;
    msg.linePos = message.line_pos;
    msg.offset = message.utf16_offset;
    msg.length = message.utf16_length;
    msg.message = message.message;
    // wgpu currently only returns errors.
    msg.messageType = WebGPUCompilationMessageType::Error;
    messages.AppendElement(std::move(msg));
  }

  if (!messages.IsEmpty()) {
    auto shader_module = pending_promise.shader_module;
    reportCompilationMessagesToConsole(shader_module, std::cref(messages));
  }
  RefPtr<CompilationInfo> infoObject(
      new CompilationInfo(pending_promise.device));
  infoObject->SetMessages(messages);
  promise::MaybeResolve(std::move(pending_promise.promise),
                        std::move(infoObject));
};

void wgpu_child_resolve_buffer_map_promise(WGPUWebGPUChildPtr aChild,
                                           WGPUBufferId aBufferId,
                                           bool aIsWritable, uint64_t aOffset,
                                           uint64_t aSize,
                                           const nsCString* aError) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeueBufferMapPromise(aBufferId);

  if (aError == nullptr) {
    pending_promise.buffer->ResolveMapRequest(pending_promise.promise, aOffset,
                                              aSize, aIsWritable);
  } else {
    pending_promise.buffer->RejectMapRequest(pending_promise.promise, *aError);
  }
}

void wgpu_child_resolve_on_submitted_work_done_promise(
    WGPUWebGPUChildPtr aChild, WGPUQueueId aQueueId) {
  auto* c = static_cast<WebGPUChild*>(aChild);
  auto pending_promise = c->DequeueOnSubmittedWorkDonePromise(aQueueId);

  promise::MaybeResolveWithUndefined(std::move(pending_promise));
};
}  // namespace ffi

ipc::IPCResult WebGPUChild::RecvServerMessage(const ipc::ByteBuf& aByteBuf) {
  ffi::wgpu_client_receive_server_message(GetClient(), ToFFI(&aByteBuf));
  return IPC_OK();
}

void WebGPUChild::ScheduleFlushQueuedMessages() {
  if (mScheduledFlushQueuedMessages) {
    return;
  }
  mScheduledFlushQueuedMessages = true;

  nsContentUtils::RunInStableState(
      NewRunnableMethod("dom::WebGPUChild::ScheduledFlushQueuedMessages", this,
                        &WebGPUChild::ScheduledFlushQueuedMessages));
}

size_t WebGPUChild::QueueDataBuffer(ipc::ByteBuf&& bb) {
  auto buffer_index = mQueuedDataBuffers.Length();
  mQueuedDataBuffers.AppendElement(std::move(bb));
  return buffer_index;
}

size_t WebGPUChild::QueueShmemHandle(ipc::MutableSharedMemoryHandle&& handle) {
  auto shmem_handle_index = mQueuedHandles.Length();
  mQueuedHandles.AppendElement(std::move(handle));
  return shmem_handle_index;
}

void WebGPUChild::ScheduledFlushQueuedMessages() {
  MOZ_ASSERT(mScheduledFlushQueuedMessages);
  mScheduledFlushQueuedMessages = false;

  PROFILER_MARKER_UNTYPED("WebGPU: ScheduledFlushQueuedMessages",
                          GRAPHICS_WebGPU);
  FlushQueuedMessages();
}

void WebGPUChild::FlushQueuedMessages() {
  ipc::ByteBuf serialized_messages;
  auto nr_of_messages = ffi::wgpu_client_get_queued_messages(
      GetClient(), ToFFI(&serialized_messages));
  if (nr_of_messages == 0) {
    return;
  }

  SendSerializedMessages(nr_of_messages, std::move(serialized_messages));
}

void WebGPUChild::SendSerializedMessages(uint32_t aNrOfMessages,
                                         ipc::ByteBuf aSerializedMessages) {
  PROFILER_MARKER_FMT("WebGPU: SendSerializedMessages", GRAPHICS_WebGPU, {},
                      "messages: {}", aNrOfMessages);

  bool sent =
      SendMessages(aNrOfMessages, std::move(aSerializedMessages),
                   std::move(mQueuedDataBuffers), std::move(mQueuedHandles));
  mQueuedDataBuffers.Clear();
  mQueuedHandles.Clear();

  if (!sent) {
    ClearActorState();
  }
}

ipc::IPCResult WebGPUChild::RecvUncapturedError(RawId aDeviceId,
                                                const dom::GPUErrorFilter aType,
                                                const nsACString& aMessage) {
  MOZ_RELEASE_ASSERT(aDeviceId);

  RefPtr<Device> device;
  const auto itr = mDeviceMap.find(aDeviceId);
  if (itr != mDeviceMap.end()) {
    device = itr->second.get();
  }

  if (!device) {
    return IPC_OK();
  }

  // We don't want to spam the errors to the console indefinitely
  if (device->CheckNewWarning(aMessage)) {
    JsWarning(device->GetOwnerGlobal(), aMessage);

    dom::GPUUncapturedErrorEventInit init;
    switch (aType) {
      case dom::GPUErrorFilter::Validation:
        init.mError = new ValidationError(device->GetParentObject(), aMessage);
        break;
      case dom::GPUErrorFilter::Out_of_memory:
        init.mError = new OutOfMemoryError(device->GetParentObject(), aMessage);
        break;
      case dom::GPUErrorFilter::Internal:
        init.mError = new InternalError(device->GetParentObject(), aMessage);
        break;
    }
    RefPtr<mozilla::dom::GPUUncapturedErrorEvent> event =
        dom::GPUUncapturedErrorEvent::Constructor(device, u"uncapturederror"_ns,
                                                  init);
    device->DispatchEvent(*event);
  }
  return IPC_OK();
}

ipc::IPCResult WebGPUChild::RecvDeviceLost(RawId aDeviceId, uint8_t aReason,
                                           const nsACString& aMessage) {
  // There might have been a race between getting back the response to a
  // `device.destroy()` call and actual device loss. If that was the case,
  // set the lost reason to "destroyed".
  auto device_lost_promise_entry =
      mPendingDeviceLostPromises.extract(aDeviceId);
  if (!device_lost_promise_entry.empty()) {
    auto promise = std::move(device_lost_promise_entry.mapped());
    RefPtr<DeviceLostInfo> info = new DeviceLostInfo(
        promise->GetParentObject(), dom::GPUDeviceLostReason::Destroyed,
        u"Device destroyed"_ns);
    promise::MaybeResolve(std::move(promise), std::move(info));
  } else {
    auto message = NS_ConvertUTF8toUTF16(aMessage);

    const auto itr = mDeviceMap.find(aDeviceId);
    if (itr != mDeviceMap.end()) {
      RefPtr<Device> device = itr->second.get();

      if (!device) {
        return IPC_OK();
      }

      dom::GPUDeviceLostReason reason =
          static_cast<dom::GPUDeviceLostReason>(aReason);
      device->ResolveLost(reason, message);
    }
  }

  return IPC_OK();
}

void WebGPUChild::SwapChainPresent(RawId aTextureId,
                                   const RemoteTextureId& aRemoteTextureId,
                                   const RemoteTextureOwnerId& aOwnerId) {
  // The parent side needs to create a command encoder which will be submitted
  // and dropped right away so we create and release an encoder ID here.
  RawId commandEncoderId =
      ffi::wgpu_client_make_command_encoder_id(GetClient());
  RawId commandBufferId = ffi::wgpu_client_make_command_buffer_id(GetClient());
  ffi::wgpu_client_swap_chain_present(GetClient(), aTextureId, commandEncoderId,
                                      commandBufferId, aRemoteTextureId.mId,
                                      aOwnerId.mId);
  ffi::wgpu_client_free_command_encoder_id(GetClient(), commandEncoderId);
  ffi::wgpu_client_free_command_buffer_id(GetClient(), commandBufferId);
}

void WebGPUChild::RegisterDevice(Device* const aDevice) {
  mDeviceMap.insert({aDevice->GetId(), aDevice});
}

void WebGPUChild::UnregisterDevice(RawId aDeviceId) {
  mDeviceMap.erase(aDeviceId);
}

void WebGPUChild::EnqueueRequestAdapterPromise(
    PendingRequestAdapterPromise&& promise) {
  mPendingRequestAdapterPromises.push_back(std::move(promise));
}

void WebGPUChild::EnqueueRequestDevicePromise(
    PendingRequestDevicePromise&& promise) {
  mPendingRequestDevicePromises.push_back(std::move(promise));
}

void WebGPUChild::RegisterDeviceLostPromise(RawId id,
                                            RefPtr<dom::Promise>& promise) {
  mPendingDeviceLostPromises.insert({id, promise});
}

void WebGPUChild::EnqueuePopErrorScopePromise(
    PendingPopErrorScopePromise&& promise) {
  mPendingPopErrorScopePromises.push_back(std::move(promise));
}

void WebGPUChild::EnqueueCreatePipelinePromise(
    PendingCreatePipelinePromise&& promise) {
  mPendingCreatePipelinePromises.push_back(std::move(promise));
}

void WebGPUChild::EnqueueCreateShaderModulePromise(
    PendingCreateShaderModulePromise&& promise) {
  mPendingCreateShaderModulePromises.push_back(std::move(promise));
}

void WebGPUChild::EnqueueBufferMapPromise(RawId id,
                                          PendingBufferMapPromise&& promise) {
  mPendingBufferMapPromises[id].push_back(std::move(promise));
}

void WebGPUChild::EnqueueOnSubmittedWorkDonePromise(
    RawId id, RefPtr<dom::Promise>& promise) {
  mPendingOnSubmittedWorkDonePromises[id].push_back(promise);
}

PendingRequestAdapterPromise WebGPUChild::DequeueRequestAdapterPromise() {
  auto& promises = mPendingRequestAdapterPromises;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();
  return promise;
}

PendingRequestDevicePromise WebGPUChild::DequeueRequestDevicePromise() {
  auto& promises = mPendingRequestDevicePromises;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();
  return promise;
}

PendingPopErrorScopePromise WebGPUChild::DequeuePopErrorScopePromise() {
  auto& promises = mPendingPopErrorScopePromises;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();
  return promise;
}

PendingCreatePipelinePromise WebGPUChild::DequeueCreatePipelinePromise() {
  auto& promises = mPendingCreatePipelinePromises;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();
  return promise;
}

PendingCreateShaderModulePromise
WebGPUChild::DequeueCreateShaderModulePromise() {
  auto& promises = mPendingCreateShaderModulePromises;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();
  return promise;
}

PendingBufferMapPromise WebGPUChild::DequeueBufferMapPromise(RawId id) {
  auto& promises_map = mPendingBufferMapPromises;
  const auto& it = promises_map.find(id);
  MOZ_RELEASE_ASSERT(it != promises_map.end());

  auto& promises = it->second;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();

  if (promises.empty()) {
    promises_map.erase(it);
  }
  return promise;
}

RefPtr<dom::Promise> WebGPUChild::DequeueOnSubmittedWorkDonePromise(RawId id) {
  auto& promises_map = mPendingOnSubmittedWorkDonePromises;
  const auto& it = promises_map.find(id);
  MOZ_RELEASE_ASSERT(it != promises_map.end());

  auto& promises = it->second;
  MOZ_RELEASE_ASSERT(!promises.empty());
  auto promise = std::move(promises.front());
  promises.pop_front();

  if (promises.empty()) {
    promises_map.erase(it);
  }
  return promise;
}

void WebGPUChild::ActorDestroy(ActorDestroyReason) { ClearActorState(); }

void WebGPUChild::ClearActorState() {
  // The following code sections dispatch runnables that resolve/reject
  // promises.
  //
  // There are a few reasons why we defer promise resolution:
  //
  //  - this function can be indirectly called by `ScheduledFlushQueuedMessages`
  // which is a runnable that should not enter the JS runtime; see docs of
  // `nsContentUtils::RunInStableState`,
  //  - if the thread is shutting down we can no longer resolve the promises;
  //  `NS_DispatchToCurrentThread` will return an error in this case that we
  //  ignore,
  //  - it avoids reentrancy issues (ex: invalidating the iterators below).

  // Resolve the promise with null since the WebGPUChild has been destroyed.
  {
    for (auto& pending_promise : mPendingRequestAdapterPromises) {
      promise::MaybeResolveWithNull(std::move(pending_promise.promise));
    }
    mPendingRequestAdapterPromises.clear();
  }

  // Pretend this worked but return a lost device, per spec.
  {
    for (auto& pending_promise : mPendingRequestDevicePromises) {
      RefPtr<Device> device =
          new Device(pending_promise.adapter, pending_promise.device_id,
                     pending_promise.queue_id, pending_promise.features,
                     pending_promise.limits, pending_promise.adapter_info,
                     pending_promise.lost_promise);
      device->SetLabel(pending_promise.label);
      device->ResolveLost(dom::GPUDeviceLostReason::Unknown,
                          u"WebGPUChild destroyed"_ns);
      promise::MaybeResolve(std::move(pending_promise.promise),
                            std::move(device));
    }
    mPendingRequestDevicePromises.clear();
  }

  // Resolve all promises that were pending due to `device.destroy()` being
  // called.
  {
    for (auto& pending_promise_entry : mPendingDeviceLostPromises) {
      auto pending_promise = std::move(pending_promise_entry.second);

      RefPtr<DeviceLostInfo> info = new DeviceLostInfo(
          pending_promise->GetParentObject(),
          dom::GPUDeviceLostReason::Destroyed, u"Device destroyed"_ns);
      promise::MaybeResolve(std::move(pending_promise), std::move(info));
    }
    mPendingDeviceLostPromises.clear();
  }

  // Empty device map and resolve all lost promises with an "unknown" reason.
  {
    for (auto& device_map_entry : mDeviceMap) {
      RefPtr<Device> device = device_map_entry.second.get();

      if (device) {
        device->ResolveLost(dom::GPUDeviceLostReason::Unknown,
                            u"WebGPUChild destroyed"_ns);
      }
    }
    mDeviceMap.clear();
  }

  // Pretend this worked and there is no error, per spec.
  {
    for (auto& pending_promise : mPendingPopErrorScopePromises) {
      promise::MaybeResolveWithNull(std::move(pending_promise.promise));
    }
    mPendingPopErrorScopePromises.clear();
  }

  // Pretend this worked, per spec; see "Listen for timeline event".
  {
    for (auto& pending_promise : mPendingCreatePipelinePromises) {
      if (pending_promise.is_render_pipeline) {
        RefPtr<RenderPipeline> object = new RenderPipeline(
            pending_promise.device, pending_promise.pipeline_id);
        object->SetLabel(pending_promise.label);
        promise::MaybeResolve(std::move(pending_promise.promise),
                              std::move(object));
      } else {
        RefPtr<ComputePipeline> object = new ComputePipeline(
            pending_promise.device, pending_promise.pipeline_id);
        object->SetLabel(pending_promise.label);
        promise::MaybeResolve(std::move(pending_promise.promise),
                              std::move(object));
      }
    }
    mPendingCreatePipelinePromises.clear();
  }

  // Pretend this worked, per spec; see "Listen for timeline event".
  {
    for (auto& pending_promise : mPendingCreateShaderModulePromises) {
      nsTArray<WebGPUCompilationMessage> messages;
      RefPtr<CompilationInfo> infoObject(
          new CompilationInfo(pending_promise.device));
      infoObject->SetMessages(messages);
      promise::MaybeResolve(std::move(pending_promise.promise),
                            std::move(infoObject));
    }
    mPendingCreateShaderModulePromises.clear();
  }

  // Reject the promise as if unmap() has been called, per spec.
  {
    for (auto& pending_promises : mPendingBufferMapPromises) {
      for (auto& pending_promise : pending_promises.second) {
        pending_promise.buffer->RejectMapRequestWithAbortError(
            pending_promise.promise);
      }
    }
    mPendingBufferMapPromises.clear();
  }

  // Pretend this worked, per spec; see "Listen for timeline event".
  {
    for (auto& pending_promises : mPendingOnSubmittedWorkDonePromises) {
      for (auto& pending_promise : pending_promises.second) {
        promise::MaybeResolveWithUndefined(std::move(pending_promise));
      }
    }
    mPendingOnSubmittedWorkDonePromises.clear();
  }
}

void WebGPUChild::QueueSubmit(
    RawId aSelfId, RawId aDeviceId, nsTArray<RawId>& aCommandBuffers,
    const nsTArray<RawId>& aUsedExternalTextureSources) {
  ffi::wgpu_client_queue_submit(
      GetClient(), aDeviceId, aSelfId,
      {aCommandBuffers.Elements(), aCommandBuffers.Length()},
      {mSwapChainTexturesWaitingForSubmit.Elements(),
       mSwapChainTexturesWaitingForSubmit.Length()},
      {aUsedExternalTextureSources.Elements(),
       aUsedExternalTextureSources.Length()});
  mSwapChainTexturesWaitingForSubmit.Clear();

  PROFILER_MARKER_UNTYPED("WebGPU: QueueSubmit", GRAPHICS_WebGPU);
  FlushQueuedMessages();
}

void WebGPUChild::NotifyWaitForSubmit(RawId aTextureId) {
  mSwapChainTexturesWaitingForSubmit.AppendElement(aTextureId);
}

}  // namespace mozilla::webgpu
