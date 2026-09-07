/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ModelContextService.h"

#include "js/JSON.h"
#include "jsapi.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/AbortSignal.h"
#include "mozilla/dom/AbortSignalBinding.h"
#include "mozilla/dom/ModelContext.h"
#include "mozilla/dom/ModelContextBinding.h"
#include "mozilla/dom/ModelContextTypes.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/RootedDictionary.h"
#include "mozilla/dom/ToJSValue.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/dom/ipc/StructuredCloneData.h"
#include "xpcpublic.h"

namespace mozilla::dom {

StaticRefPtr<ModelContextService> ModelContextService::sSingleton;

NS_IMPL_ISUPPORTS(ModelContextService, nsIModelContextService)

/* static */
already_AddRefed<ModelContextService> ModelContextService::GetSingleton() {
  if (!sSingleton) {
    sSingleton = new ModelContextService();
    ClearOnShutdown(&sSingleton);
  }
  return do_AddRef(sSingleton);
}

NS_IMETHODIMP
ModelContextService::GetToolsForWindow(uint64_t aInnerWindowId, JSContext* aCx,
                                       Promise** aResult) {
  MOZ_ASSERT(XRE_IsParentProcess());
  if (!XRE_IsParentProcess()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  if (!StaticPrefs::dom_modelcontext_enabled()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
  if (!global) {
    return NS_ERROR_UNEXPECTED;
  }

  ErrorResult erv;
  RefPtr<Promise> promise = Promise::Create(global, erv);
  if (erv.Failed()) {
    return erv.StealNSResult();
  }

  RefPtr<WindowGlobalParent> wgp =
      WindowGlobalParent::GetByInnerWindowId(aInnerWindowId);
  if (!wgp) {
    promise->MaybeRejectWithNotFoundError("Window not found"_ns);
    promise.forget(aResult);
    return NS_OK;
  }

  RefPtr<PWindowGlobalParent::GetModelContextToolsPromise> ipcPromise =
      wgp->SendGetModelContextTools();

  ipcPromise->Then(
      GetMainThreadSerialEventTarget(), __func__,
      [promise](const PWindowGlobalParent::GetModelContextToolsPromise::
                    ResolveValueType& aResult) {
        const auto& [rv, tools] = aResult;
        if (NS_FAILED(rv)) {
          promise->MaybeReject(rv);
          return;
        }

        AutoJSAPI jsapi;
        if (!jsapi.Init(promise->GetGlobalObject())) {
          promise->MaybeRejectWithUnknownError("Failed to init JS context"_ns);
          return;
        }
        JSContext* cx = jsapi.cx();

        JS::Rooted<JSObject*> array(cx, JS::NewArrayObject(cx, tools.Length()));
        if (!array) {
          promise->MaybeRejectWithUnknownError(
              "Failed to create result array"_ns);
          return;
        }

        for (uint32_t i = 0; i < tools.Length(); ++i) {
          RootedDictionary<ModelContextToolDefinition> def(cx);
          def.mName = NS_ConvertUTF8toUTF16(tools[i].name());
          def.mDescription = NS_ConvertUTF8toUTF16(tools[i].description());

          if (tools[i].inputSchema().isSome()) {
            NS_ConvertUTF8toUTF16 schema(tools[i].inputSchema().ref());
            JS::Rooted<JS::Value> schemaVal(cx);
            if (!JS_ParseJSON(cx, schema.get(), schema.Length(), &schemaVal)) {
              promise->MaybeRejectWithUnknownError(
                  "Failed to parse inputSchema"_ns);
              return;
            }
            if (!schemaVal.isObject()) {
              promise->MaybeRejectWithInvalidStateError(
                  "Tool stored with non-object inputSchema"_ns);
              return;
            }
            def.mInputSchema.Construct(&schemaVal.toObject());
          }

          if (tools[i].annotations().isSome()) {
            def.mAnnotations.Construct();
            if (tools[i].annotations()->readOnlyHint().isSome()) {
              def.mAnnotations.Value().mReadOnlyHint.Construct(
                  tools[i].annotations()->readOnlyHint().value());
            }
          }

          JS::Rooted<JS::Value> val(cx);
          if (!ToJSValue(cx, def, &val)) {
            promise->MaybeRejectWithUnknownError(
                "Failed to convert tool definition"_ns);
            return;
          }
          if (!JS_DefineElement(cx, array, i, val, JSPROP_ENUMERATE)) {
            promise->MaybeRejectWithUnknownError(
                "Failed to add tool to array"_ns);
            return;
          }
        }

        JS::Rooted<JS::Value> arrayVal(cx, JS::ObjectValue(*array));
        promise->MaybeResolve(arrayVal);
      },
      [promise](mozilla::ipc::ResponseRejectReason aReason) {
        promise->MaybeRejectWithAbortError("IPC failed"_ns);
      });

  promise.forget(aResult);
  return NS_OK;
}

NS_IMETHODIMP
ModelContextService::InvokeTool(uint64_t aInnerWindowId,
                                const nsACString& aToolName,
                                JS::Handle<JS::Value> aInput, JSContext* aCx,
                                Promise** aResult) {
  MOZ_ASSERT(XRE_IsParentProcess());
  if (!XRE_IsParentProcess()) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (!StaticPrefs::dom_modelcontext_enabled()) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
  if (!global) {
    return NS_ERROR_UNEXPECTED;
  }

  ErrorResult erv;
  RefPtr<Promise> promise = Promise::Create(global, erv);
  if (erv.Failed()) {
    return erv.StealNSResult();
  }

  RefPtr<WindowGlobalParent> wgp =
      WindowGlobalParent::GetByInnerWindowId(aInnerWindowId);
  if (!wgp) {
    promise->MaybeRejectWithNotFoundError("Window not found"_ns);
    promise.forget(aResult);
    return NS_OK;
  }

  RefPtr<ipc::StructuredCloneData> inputClone =
      MakeRefPtr<ipc::StructuredCloneData>();
  IgnoredErrorResult writeRv;
  inputClone->Write(aCx, aInput, writeRv);
  if (writeRv.Failed()) {
    promise->MaybeRejectWithDataCloneError("Failed to serialize input"_ns);
    promise.forget(aResult);
    return NS_OK;
  }

  RefPtr<PWindowGlobalParent::InvokeModelContextToolPromise> ipcPromise =
      wgp->SendInvokeModelContextTool(aToolName, WrapNotNull(inputClone));

  ipcPromise->Then(
      GetMainThreadSerialEventTarget(), __func__,
      [promise](const PWindowGlobalParent::InvokeModelContextToolPromise::
                    ResolveValueType& aResult) {
        const auto& [rv, output] = aResult;
        if (rv.Failed()) {
          if (output) {
            AutoJSAPI jsapi;
            if (jsapi.Init(promise->GetGlobalObject())) {
              JSContext* cx = jsapi.cx();
              JS::Rooted<JS::Value> rejectionValue(cx);
              IgnoredErrorResult deserializeRv;
              output->Read(cx, &rejectionValue, deserializeRv);
              if (!deserializeRv.Failed()) {
                promise->MaybeReject(rejectionValue);
                return;
              }
            }
          }
          CopyableErrorResult rvCopy(rv);
          promise->MaybeReject(std::move(rvCopy));
          return;
        }

        AutoJSAPI jsapi;
        if (!jsapi.Init(promise->GetGlobalObject())) {
          promise->MaybeRejectWithUnknownError("Failed to init JS context"_ns);
          return;
        }
        JSContext* cx = jsapi.cx();

        JS::Rooted<JS::Value> resultValue(cx);
        IgnoredErrorResult deserializeRv;
        output->Read(cx, &resultValue, deserializeRv);
        if (deserializeRv.Failed()) {
          promise->MaybeRejectWithDataCloneError(
              "Failed to deserialize result"_ns);
          return;
        }

        promise->MaybeResolve(resultValue);
      },
      [promise](mozilla::ipc::ResponseRejectReason aReason) {
        promise->MaybeRejectWithAbortError("tool invocation failed"_ns);
      });

  promise.forget(aResult);
  return NS_OK;
}

}  // namespace mozilla::dom
