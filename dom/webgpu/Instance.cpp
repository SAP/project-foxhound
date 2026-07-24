/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Instance.h"

#include <optional>
#include <string_view>

#include "Adapter.h"
#include "ipc/WebGPUChild.h"
#include "ipc/WebGPUTypes.h"
#include "js/Value.h"
#include "mozilla/Assertions.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/gfx/CanvasManagerChild.h"
#include "mozilla/gfx/Logging.h"
#include "mozilla/gfx/gfxVars.h"
#include "mozilla/webgpu/ffi/wgpu.h"
#include "nsDebug.h"
#include "nsIGlobalObject.h"
#include "nsString.h"
#include "nsStringFwd.h"

namespace mozilla::webgpu {

GPU_IMPL_CYCLE_COLLECTION(WGSLLanguageFeatures, mParent)

GPU_IMPL_CYCLE_COLLECTION(Instance, mOwner, mWgslLanguageFeatures)

/* static */ bool Instance::PrefEnabled(JSContext* aCx, JSObject* aObj) {
  if (!StaticPrefs::dom_webgpu_enabled()) {
    return false;
  }

  if (NS_IsMainThread()) {
    return true;
  }

  dom::WorkerPrivate* wp = dom::GetCurrentThreadWorkerPrivate();
  if (wp && wp->IsServiceWorker()) {
    return StaticPrefs::dom_webgpu_service_workers_enabled();
  }

  return true;
}

/* static */ bool Instance::ExternalTexturePrefEnabled(JSContext* aCx,
                                                       JSObject* aObj) {
  return StaticPrefs::dom_webgpu_external_texture_enabled_AtStartup();
}

/*static*/
already_AddRefed<Instance> Instance::Create(nsIGlobalObject* aOwner) {
  RefPtr<Instance> result = new Instance(aOwner);
  return result.forget();
}

Instance::Instance(nsIGlobalObject* aOwner)
    : mOwner(aOwner), mWgslLanguageFeatures(new WGSLLanguageFeatures(this)) {
  // Populate `mWgslLanguageFeatures`.
  IgnoredErrorResult rv;
  nsCString wgslFeature;
  for (size_t i = 0;; ++i) {
    wgslFeature.Truncate(0);
    ffi::wgpu_client_instance_get_wgsl_language_feature(&wgslFeature, i);
    if (wgslFeature.IsEmpty()) {
      break;
    }
    NS_ConvertASCIItoUTF16 feature{wgslFeature};
    this->mWgslLanguageFeatures->Add(feature, rv);
    if (rv.Failed()) {
      if (rv.ErrorCodeIs(NS_ERROR_UNEXPECTED)) {
        // This is fine; something went wrong with the JS scope we're in, and we
        // can just let that happen.
        NS_WARNING(
            "`Instance::Instance`: failed to append WGSL language feature: got "
            "`NS_ERROR_UNEXPECTED`");
      } else {
        MOZ_CRASH_UNSAFE_PRINTF(
            "`Instance::Instance`: failed to append WGSL language feature: %d",
            rv.ErrorCodeAsInt());
      }
    }
  }
}

JSObject* Instance::WrapObject(JSContext* cx,
                               JS::Handle<JSObject*> givenProto) {
  return dom::GPU_Binding::Wrap(cx, this, givenProto);
}

already_AddRefed<dom::Promise> Instance::RequestAdapter(
    const dom::GPURequestAdapterOptions& aOptions, ErrorResult& aRv) {
  RefPtr<dom::Promise> promise = dom::Promise::Create(mOwner, aRv);
  if (NS_WARN_IF(aRv.Failed())) {
    return nullptr;
  }

  if (NS_IsMainThread()) {
    JSObject* obj = mOwner->GetGlobalJSObject();
    if (obj) {
      dom::SetUseCounter(obj, eUseCounter_custom_WebgpuRequestAdapter);
    }
  } else {
    dom::SetUseCounter(UseCounterWorker::Custom_WebgpuRequestAdapter);
  }

  // -
  // Check if we should allow the request.

  std::optional<std::string_view> rejectionMessage = {};
  const auto rejectIf = [&rejectionMessage, &promise, this](
                            bool condition, const char* message) {
    if (condition && !rejectionMessage.has_value()) {
      rejectionMessage = message;
      promise->MaybeResolve(JS::NullValue());
      dom::AutoJSAPI api;
      if (api.Init(mOwner)) {
        JS::WarnUTF8(api.cx(), "%s", rejectionMessage.value().data());
      }
    }
  };

  rejectIf(!gfx::gfxVars::AllowWebGPU(), "WebGPU is disabled by blocklist.");
  rejectIf(!StaticPrefs::dom_webgpu_enabled(),
           "WebGPU is disabled because the `dom.webgpu.enabled` pref. is set "
           "to `false`.");
#ifdef WIN32
#  ifndef MOZ_DXCOMPILER
  rejectIf(true,
           "WebGPU is disabled because dxcompiler is unavailable with this "
           "build configuration");
#  endif
#endif

  // Check if WebGPU is blocked for this global's domain.
  {
    const auto prefLock = mozilla::StaticPrefs::dom_webgpu_blocked_domains();
    rejectIf(nsContentUtils::IsURIInList(mOwner->GetBaseURI(), *prefLock),
             "WebGPU is blocked for this domain by the "
             "`dom.webgpu.blocked-domains` pref.");
  }

  if (rejectionMessage) {
    return promise.forget();
  }

  // -
  // Make the request.

  auto* const canvasManager = gfx::CanvasManagerChild::Get();
  rejectIf(!canvasManager, "Failed to create CanvasManagerChild");
  if (rejectionMessage) {
    return promise.forget();
  }

  RefPtr<WebGPUChild> child = canvasManager->GetWebGPUChild();
  rejectIf(!child, "Failed to create WebGPUChild");
  if (rejectionMessage) {
    return promise.forget();
  }

  if (aOptions.mFeatureLevel.EqualsASCII("core")) {
    // Good! That's all we support.
  } else if (aOptions.mFeatureLevel.EqualsASCII("compatibility")) {
    dom::AutoJSAPI api;
    if (api.Init(mOwner)) {
      JS::WarnUTF8(api.cx(),
                   "User requested a WebGPU adapter with `featureLevel: "
                   "\"compatibility\"`, which is not yet supported; returning "
                   "a \"core\"-defaulting adapter for now. Subscribe to "
                   "<https://bugzilla.mozilla.org/show_bug.cgi?id=1905951>"
                   " for updates on its development in Firefox.");
    }
  } else {
    NS_ConvertUTF16toUTF8 featureLevel(aOptions.mFeatureLevel);
    dom::AutoJSAPI api;
    if (api.Init(mOwner)) {
      JS::WarnUTF8(api.cx(),
                   "expected one of `\"core\"` or `\"compatibility\"` for "
                   "`GPUAdapter.featureLevel`, got %s",
                   featureLevel.get());
    }
    promise->MaybeResolve(JS::NullValue());
    return promise.forget();
  }

  if (aOptions.mXrCompatible) {
    dom::AutoJSAPI api;
    if (api.Init(mOwner)) {
      JS::WarnUTF8(
          api.cx(),
          "User requested a WebGPU adapter with `xrCompatible: true`, "
          "but WebXR sessions are not yet supported in WebGPU. Returning "
          "a regular adapter for now. Subscribe to "
          "<https://bugzilla.mozilla.org/show_bug.cgi?id=1963829>"
          " for updates on its development in Firefox.");
    }
  }

  ffi::WGPUPowerPreference power_preference;
  if (aOptions.mPowerPreference.WasPassed()) {
    switch (aOptions.mPowerPreference.Value()) {
      case dom::GPUPowerPreference::Low_power:
        power_preference = ffi::WGPUPowerPreference_LowPower;
        break;
      case dom::GPUPowerPreference::High_performance:
        power_preference = ffi::WGPUPowerPreference_HighPerformance;
        break;
      default:
        MOZ_CRASH("Unexpected `dom::GPUPowerPreference`");
    }
  } else {
    power_preference = ffi::WGPUPowerPreference_None;
  }

  RawId adapter_id = ffi::wgpu_client_request_adapter(
      child->GetClient(), power_preference, aOptions.mForceFallbackAdapter);

  child->EnqueueRequestAdapterPromise(
      PendingRequestAdapterPromise{promise, this, adapter_id});

  return promise.forget();
}

}  // namespace mozilla::webgpu
