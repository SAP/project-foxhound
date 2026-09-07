/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/ModelContext.h"

#include "js/JSON.h"
#include "jsapi.h"
#include "mozilla/dom/AbortFollower.h"
#include "mozilla/dom/AbortSignal.h"
#include "mozilla/dom/ModelContextBinding.h"
#include "mozilla/dom/ModelContextClient.h"
#include "mozilla/dom/Promise.h"
#include "mozilla/dom/PromiseNativeHandler.h"
#include "mozilla/dom/ScriptSettings.h"
#include "nsPIDOMWindow.h"
#include "nsPIDOMWindowInlines.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_CLASS(ModelContext)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(ModelContext)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mWindow)
  tmp->mTools.Clear();
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(ModelContext)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mWindow)
  for (auto& entry : tmp->mTools) {
    ImplCycleCollectionTraverse(cb, entry.GetData().mExecute,
                                "StoredTool::mExecute", 0);
  }
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_IMPL_CYCLE_COLLECTION_TRACE_BEGIN(ModelContext)
  NS_IMPL_CYCLE_COLLECTION_TRACE_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_TRACE_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(ModelContext)
NS_IMPL_CYCLE_COLLECTING_RELEASE(ModelContext)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(ModelContext)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

ModelContext::ModelContext(nsPIDOMWindowInner* aWindow) : mWindow(aWindow) {
  MOZ_ASSERT(aWindow);
}

JSObject* ModelContext::WrapObject(JSContext* aCx,
                                   JS::Handle<JSObject*> aGivenProto) {
  return ModelContext_Binding::Wrap(aCx, this, aGivenProto);
}

void ModelContext::RegisterTool(JSContext* aCx, const ModelContextTool& aTool,
                                ErrorResult& aRv) {
  if (!mWindow->IsTopInnerWindow()) {
    aRv.ThrowNotAllowedError(
        "navigator.modelcontext methods can only be used on the top window");
    return;
  }

  IPCModelContextToolDefinition def;
  def.name() = NS_ConvertUTF16toUTF8(aTool.mName);
  def.description() = NS_ConvertUTF16toUTF8(aTool.mDescription);

  if (aTool.mInputSchema.WasPassed()) {
    JS::Rooted<JS::Value> schemaVal(
        aCx, JS::ObjectValue(*aTool.mInputSchema.Value()));
    nsAutoString jsonStr;
    if (!nsContentUtils::StringifyJSON(aCx, schemaVal, jsonStr,
                                       UndefinedIsVoidString)) {
      aRv.ThrowTypeError("Failed to serialize inputSchema"_ns);
      return;
    }
    if (jsonStr.IsEmpty() || (jsonStr[0] != u'{')) {
      aRv.ThrowTypeError("inputSchema must serialize to a JSON object"_ns);
      return;
    }
    def.inputSchema().emplace(NS_ConvertUTF16toUTF8(jsonStr));
  }

  if (aTool.mAnnotations.WasPassed()) {
    const ToolAnnotations& ann = aTool.mAnnotations.Value();
    def.annotations().emplace();
    if (ann.mReadOnlyHint.WasPassed()) {
      def.annotations()->readOnlyHint().emplace(ann.mReadOnlyHint.Value());
    }
  }

  StoredTool storedTool{std::move(def), aTool.mExecute};

  mTools.InsertOrUpdate(aTool.mName, std::move(storedTool));
}

void ModelContext::UnregisterTool(const nsAString& aToolName,
                                  ErrorResult& aRv) {
  if (!mWindow->IsTopInnerWindow()) {
    aRv.ThrowNotAllowedError(
        "navigator.modelcontext methods can only be used on the top window");
    return;
  }
  mTools.Remove(aToolName);
}

void ModelContext::GetIPCToolDefinitions(
    nsTArray<IPCModelContextToolDefinition>& aOut) {
  aOut.SetCapacity(mTools.Count());
  for (const auto& entry : mTools) {
    aOut.AppendElement(entry.GetData().mDefinition);
  }
}

void ModelContext::GetTools(JSContext* aCx, nsTArray<ModelContextTool>& aRetval,
                            ErrorResult& aRv) {
  for (auto& entry : mTools) {
    ModelContextTool& tool = *aRetval.AppendElement();

    tool.mName = NS_ConvertUTF8toUTF16(entry.GetData().mDefinition.name());
    tool.mDescription =
        NS_ConvertUTF8toUTF16(entry.GetData().mDefinition.description());

    const Maybe<nsCString>& maybeSchema =
        entry.GetData().mDefinition.inputSchema();
    if (maybeSchema.isSome()) {
      NS_ConvertUTF8toUTF16 schema(maybeSchema.ref());
      JS::Rooted<JS::Value> schemaVal(aCx);
      if (!JS_ParseJSON(aCx, schema.get(), schema.Length(), &schemaVal)) {
        aRv.ThrowInvalidStateError("Tool stored with invalid inputSchema");
        return;
      }
      if (!schemaVal.isObject()) {
        aRv.ThrowInvalidStateError("Tool stored with non-object inputSchema");
        return;
      }
      tool.mInputSchema.Construct(&schemaVal.toObject());
    }

    tool.mExecute = entry.GetData().mExecute;

    const Maybe<IPCToolAnnotations>& maybeAnn =
        entry.GetData().mDefinition.annotations();
    if (maybeAnn.isSome()) {
      tool.mAnnotations.Construct();
      tool.mAnnotations.Value().mReadOnlyHint.Construct(
          maybeAnn->readOnlyHint());
    }
  }
}

class InvokeToolHandler final : public PromiseNativeHandler,
                                public AbortFollower {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS_AMBIGUOUS(InvokeToolHandler,
                                           PromiseNativeHandler)

  InvokeToolHandler(nsIGlobalObject* aGlobal, Promise* aPromise)
      : mGlobal(aGlobal), mPromise(aPromise) {}

  void ResolvedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override {
    Unfollow();
    mPromise->MaybeResolve(aValue);
  }

  void RejectedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override {
    Unfollow();
    mPromise->MaybeReject(aValue);
  }

  void RunAbortAlgorithm() override {
    if (!mPromise) {
      return;
    }

    AutoJSAPI jsapi;
    if (NS_WARN_IF(!jsapi.Init(mGlobal))) {
      mPromise->MaybeRejectWithAbortError("The operation was aborted"_ns);
    } else {
      JSContext* cx = jsapi.cx();
      JS::Rooted<JS::Value> reason(cx);
      Signal()->GetReason(cx, &reason);
      mPromise->MaybeReject(reason);
    }

    mPromise = nullptr;
    Unfollow();
  }

 private:
  ~InvokeToolHandler() = default;

  nsCOMPtr<nsIGlobalObject> mGlobal;
  RefPtr<Promise> mPromise;
};

NS_IMPL_CYCLE_COLLECTION(InvokeToolHandler, mGlobal, mPromise)

NS_IMPL_CYCLE_COLLECTING_ADDREF(InvokeToolHandler)
NS_IMPL_CYCLE_COLLECTING_RELEASE(InvokeToolHandler)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(InvokeToolHandler)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, PromiseNativeHandler)
NS_INTERFACE_MAP_END

already_AddRefed<Promise> ModelContext::InvokeToolInternal(
    JSContext* aCx, const nsAString& aToolName, JS::Handle<JS::Value> aInput,
    ErrorResult& aRv) {
  auto tool = mTools.Lookup(aToolName);
  if (!tool) {
    aRv.ThrowNotFoundError("Tool not found");
    return nullptr;
  }

  if (!tool->mExecute) {
    aRv.ThrowInvalidStateError("Tool does not have an execute method");
    return nullptr;
  }

  JS::Rooted<JSObject*> inputObj(aCx);
  if (aInput.isObject()) {
    inputObj = &aInput.toObject();
  } else if (aInput.isUndefined() || aInput.isNull()) {
    inputObj = JS_NewPlainObject(aCx);
    if (!inputObj) {
      aRv.Throw(NS_ERROR_OUT_OF_MEMORY);
      return nullptr;
    }
  } else {
    aRv.ThrowTypeError("Input must be an object"_ns);
    return nullptr;
  }

  RefPtr<ModelContextClient> client = MakeRefPtr<ModelContextClient>(mWindow);

  RefPtr<ToolExecuteCallback> execute = tool->mExecute;
  RefPtr<Promise> domPromise = execute->Call(inputObj, *client, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  return domPromise.forget();
}

already_AddRefed<Promise> ModelContext::InvokeTool(
    JSContext* aCx, const nsAString& aToolName, JS::Handle<JS::Value> aInput,
    const InvokeToolOptions& aOptions, ErrorResult& aRv) {
  if (!mWindow->IsTopInnerWindow()) {
    aRv.ThrowNotAllowedError(
        "navigator.modelcontext methods can only be used in windows same "
        "origin with the top");
    return nullptr;
  }

  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(mWindow);
  RefPtr<Promise> outPromise = Promise::Create(global, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  RefPtr<InvokeToolHandler> handler =
      MakeRefPtr<InvokeToolHandler>(global, outPromise);

  if (aOptions.mSignal.WasPassed()) {
    AbortSignal& signal = aOptions.mSignal.Value();
    if (signal.Aborted()) {
      AutoJSAPI jsapi;
      if (NS_WARN_IF(!jsapi.Init(signal.GetRelevantGlobal()))) {
        outPromise->MaybeRejectWithAbortError("The operation was aborted"_ns);
      } else {
        JSContext* cx = jsapi.cx();
        JS::Rooted<JS::Value> reason(cx);
        signal.GetReason(cx, &reason);
        outPromise->MaybeReject(reason);
      }
      return outPromise.forget();
    }
    handler->Follow(&signal);
  }

  RefPtr<Promise> callbackPromise =
      InvokeToolInternal(aCx, aToolName, aInput, aRv);
  if (aRv.Failed()) {
    return nullptr;
  }

  callbackPromise->AppendNativeHandler(handler);

  return outPromise.forget();
}

}  // namespace mozilla::dom
