/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_worklet_WorkletModuleLoader_h
#define mozilla_dom_worklet_WorkletModuleLoader_h

#include "js/loader/LoadContextBase.h"
#include "js/loader/ModuleLoaderBase.h"
#include "js/loader/ResolveResult.h"  // For ResolveError
#include "mozilla/dom/WorkletFetchHandler.h"

namespace mozilla::dom {
namespace loader {
class WorkletScriptLoader : public JS::loader::ScriptLoaderInterface {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS(WorkletScriptLoader)

  nsIURI* GetBaseURI() const override { return nullptr; }

  void ReportErrorToConsole(ScriptLoadRequest* aRequest,
                            nsresult aResult) const override {}

  void ReportWarningToConsole(
      ScriptLoadRequest* aRequest, const char* aMessageName,
      const nsTArray<nsString>& aParams) const override {}

  nsresult FillCompileOptionsForRequest(
      JSContext* cx, ScriptLoadRequest* aRequest, JS::CompileOptions* aOptions,
      JS::MutableHandle<JSScript*> aIntroductionScript) override;

 private:
  ~WorkletScriptLoader() = default;
};

class WorkletModuleLoader : public JS::loader::ModuleLoaderBase {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(WorkletModuleLoader,
                                           JS::loader::ModuleLoaderBase)

  WorkletModuleLoader(WorkletScriptLoader* aScriptLoader,
                      nsIGlobalObject* aGlobalObject);

  void InsertRequest(nsIURI* aURI, JS::loader::ModuleLoadRequest* aRequest);
  void RemoveRequest(nsIURI* aURI);
  JS::loader::ModuleLoadRequest* GetRequest(nsIURI* aURI) const;

  bool HasSetLocalizedStrings() const { return (bool)mLocalizedStrs; }
  void SetLocalizedStrings(const nsTArray<nsString>* aStrings) {
    mLocalizedStrs = aStrings;
  }

 private:
  ~WorkletModuleLoader() = default;

  already_AddRefed<ModuleLoadRequest> CreateRequest(
      JSContext* aCx, nsIURI* aURI, JS::Handle<JSObject*> aModuleRequest,
      JS::Handle<JS::Value> aHostDefined, JS::Handle<JS::Value> aPayload,
      bool aIsDynamicImport, JS::loader::ScriptFetchOptions* aOptions,
      dom::ReferrerPolicy aReferrerPolicy, nsIURI* aBaseURL,
      const dom::SRIMetadata& aSriMetadata) override;

  bool IsDynamicImportSupported() override { return false; }

  bool CanStartLoad(JS::loader::ModuleLoadRequest* aRequest,
                    nsresult* aRvOut) override;

  nsresult StartFetch(JS::loader::ModuleLoadRequest* aRequest) override;

  nsresult CompileFetchedModule(
      JSContext* aCx, JS::Handle<JSObject*> aGlobal,
      JS::CompileOptions& aOptions, JS::loader::ModuleLoadRequest* aRequest,
      JS::MutableHandle<JSObject*> aModuleScript) override;

  nsresult CompileJavaScriptOrWasmModule(
      JSContext* aCx, JS::CompileOptions& aOptions, ModuleLoadRequest* aRequest,
      JS::MutableHandle<JSObject*> aModuleScript);

  nsresult CompileJsonModule(JSContext* aCx, JS::CompileOptions& aOptions,
                             ModuleLoadRequest* aRequest,
                             JS::MutableHandle<JSObject*> aModuleScript);

  void OnModuleLoadComplete(JS::loader::ModuleLoadRequest* aRequest) override;

  nsresult GetResolveFailureMessage(JS::loader::ResolveError aError,
                                    const nsAString& aSpecifier,
                                    nsAString& aResult) override;

  bool IsModuleTypeAllowed(JS::ModuleType aModuleType) override {
    // https://html.spec.whatwg.org/#module-type-allowed
    // If moduleType is "css" and the CSSStyleSheet interface is not exposed in
    // settings's realm, then return false.
    return aModuleType == JS::ModuleType::JavaScript ||
           aModuleType == JS::ModuleType::JSON;
  }

  // A hashtable to map a nsIURI(from main thread) to a ModuleLoadRequest(in
  // worklet thread).
  nsRefPtrHashtable<nsURIHashKey, JS::loader::ModuleLoadRequest>
      mFetchingRequests;

  // We get the localized strings on the main thread, and pass it to
  // WorkletModuleLoader.
  const nsTArray<nsString>* mLocalizedStrs = nullptr;
};
}  // namespace loader

class WorkletLoadContext : public JS::loader::LoadContextBase {
 public:
  explicit WorkletLoadContext(
      const nsMainThreadPtrHandle<WorkletFetchHandler>& aHandlerRef)
      : JS::loader::LoadContextBase(JS::loader::ContextKind::Worklet),
        mHandlerRef(aHandlerRef) {}

  const nsMainThreadPtrHandle<WorkletFetchHandler>& GetHandlerRef() const {
    return mHandlerRef;
  }

 private:
  ~WorkletLoadContext() = default;

  nsMainThreadPtrHandle<WorkletFetchHandler> mHandlerRef;
};
}  // namespace mozilla::dom
#endif  // mozilla_dom_worklet_WorkletModuleLoader_h
