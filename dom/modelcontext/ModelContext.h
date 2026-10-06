/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ModelContext_h
#define mozilla_dom_ModelContext_h

#include "js/TypeDecls.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/ModelContextBinding.h"
#include "mozilla/dom/ModelContextTypes.h"
#include "nsCOMPtr.h"
#include "nsTHashMap.h"
#include "nsWrapperCache.h"

class nsPIDOMWindowInner;

namespace mozilla::dom {
class ModelContextClient;
class Promise;

class ModelContext final : public nsISupports, public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(ModelContext)

  explicit ModelContext(nsPIDOMWindowInner* aWindow);

  nsPIDOMWindowInner* GetParentObject() const { return mWindow; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  void RegisterTool(JSContext* aCx, const ModelContextTool& aTool,
                    ErrorResult& aRv);
  void UnregisterTool(const nsAString& aToolName, ErrorResult& aRv);

  void GetIPCToolDefinitions(nsTArray<IPCModelContextToolDefinition>& aOut);

  void GetTools(JSContext* aCx, nsTArray<ModelContextTool>& aRetval,
                ErrorResult& aRv);

  // This should be used when there are guaranteed to be no options (e.g.
  // AbortSignal). This is useful when requests are coming from another
  // context, like from the main process IPC, or as a helper for the
  // web-visible InvokeTool
  MOZ_CAN_RUN_SCRIPT
  already_AddRefed<Promise> InvokeToolInternal(JSContext* aCx,
                                               const nsAString& aToolName,
                                               JS::Handle<JS::Value> aInput,
                                               ErrorResult& aRv);

  // This is invoked by the page directly. It handles the options and
  // calls InvokeToolInternal internally.
  MOZ_CAN_RUN_SCRIPT
  already_AddRefed<Promise> InvokeTool(JSContext* aCx,
                                       const nsAString& aToolName,
                                       JS::Handle<JS::Value> aInput,
                                       const InvokeToolOptions& aOptions,
                                       ErrorResult& aRv);

 private:
  ~ModelContext() = default;

  struct StoredTool {
    IPCModelContextToolDefinition mDefinition;
    RefPtr<ToolExecuteCallback> mExecute;
  };

  nsCOMPtr<nsPIDOMWindowInner> mWindow;
  nsTHashMap<nsStringHashKey, StoredTool> mTools;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_ModelContext_h
