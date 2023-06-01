/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "js/experimental/JSStencil.h"  // JS::Stencil, JS::CompileModuleScriptToStencil, JS::InstantiateModuleStencil
#include "js/loader/ModuleLoadRequest.h"
#include "mozilla/dom/WorkerLoadContext.h"
#include "mozilla/dom/workerinternals/ScriptLoader.h"
#include "WorkerModuleLoader.h"

#include "nsISupportsImpl.h"

namespace mozilla::dom::workerinternals::loader {

//////////////////////////////////////////////////////////////
// WorkerModuleLoader
//////////////////////////////////////////////////////////////

NS_IMPL_ADDREF_INHERITED(WorkerModuleLoader, JS::loader::ModuleLoaderBase)
NS_IMPL_RELEASE_INHERITED(WorkerModuleLoader, JS::loader::ModuleLoaderBase)

NS_IMPL_CYCLE_COLLECTION_INHERITED(WorkerModuleLoader,
                                   JS::loader::ModuleLoaderBase)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(WorkerModuleLoader)
NS_INTERFACE_MAP_END_INHERITING(JS::loader::ModuleLoaderBase)

WorkerModuleLoader::WorkerModuleLoader(WorkerScriptLoader* aScriptLoader,
                                       nsIGlobalObject* aGlobalObject,
                                       nsISerialEventTarget* aEventTarget)
    : ModuleLoaderBase(aScriptLoader, aGlobalObject, aEventTarget) {}

already_AddRefed<ModuleLoadRequest> WorkerModuleLoader::CreateStaticImport(
    nsIURI* aURI, ModuleLoadRequest* aParent) {
  // We are intentionally deviating from the specification here and using the
  // worker's CSP rather than the document CSP. The spec otherwise requires our
  // service worker integration to be changed, and additionally the decision
  // here did not make sense as we are treating static imports as different from
  // other kinds of subresources.
  // See Discussion in https://github.com/w3c/webappsec-csp/issues/336
  Maybe<ClientInfo> clientInfo = GetGlobalObject()->GetClientInfo();

  RefPtr<WorkerLoadContext> loadContext =
      new WorkerLoadContext(WorkerLoadContext::Kind::StaticImport, clientInfo);
  RefPtr<ModuleLoadRequest> request = new ModuleLoadRequest(
      aURI, aParent->mFetchOptions, SRIMetadata(), aParent->mURI, loadContext,
      false, /* is top level */
      false, /* is dynamic import */
      this, aParent->mVisitedSet, aParent->GetRootModule());

  request->mURL = request->mURI->GetSpecOrDefault();
  return request.forget();
}

already_AddRefed<ModuleLoadRequest> WorkerModuleLoader::CreateDynamicImport(
    JSContext* aCx, nsIURI* aURI, LoadedScript* aMaybeActiveScript,
    JS::Handle<JS::Value> aReferencingPrivate, JS::Handle<JSString*> aSpecifier,
    JS::Handle<JSObject*> aPromise) {
  // TODO: Implement for Dedicated workers. Not supported for Service Workers.
  return nullptr;
}

bool WorkerModuleLoader::CanStartLoad(ModuleLoadRequest* aRequest,
                                      nsresult* aRvOut) {
  return true;
}

nsresult WorkerModuleLoader::StartFetch(ModuleLoadRequest* aRequest) {
  if (!GetScriptLoader()->DispatchLoadScript(aRequest)) {
    return NS_ERROR_FAILURE;
  }
  return NS_OK;
}

nsresult WorkerModuleLoader::CompileFetchedModule(
    JSContext* aCx, JS::Handle<JSObject*> aGlobal, JS::CompileOptions& aOptions,
    ModuleLoadRequest* aRequest, JS::MutableHandle<JSObject*> aModuleScript) {
  RefPtr<JS::Stencil> stencil;
  MOZ_ASSERT(aRequest->IsTextSource());
  MaybeSourceText maybeSource;
  nsresult rv = aRequest->GetScriptSource(aCx, &maybeSource);
  NS_ENSURE_SUCCESS(rv, rv);

  auto compile = [&](auto& source) {
    return JS::CompileModuleScriptToStencil(aCx, aOptions, source);
  };
  stencil = maybeSource.mapNonEmpty(compile);

  if (!stencil) {
    return NS_ERROR_FAILURE;
  }

  JS::InstantiateOptions instantiateOptions(aOptions);
  aModuleScript.set(
      JS::InstantiateModuleStencil(aCx, instantiateOptions, stencil));
  if (!aModuleScript) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

WorkerScriptLoader* WorkerModuleLoader::GetScriptLoader() {
  return static_cast<WorkerScriptLoader*>(mLoader.get());
}

void WorkerModuleLoader::OnModuleLoadComplete(ModuleLoadRequest* aRequest) {
  if (aRequest->IsTopLevel()) {
    AutoJSAPI jsapi;
    if (NS_WARN_IF(!jsapi.Init(GetGlobalObject()))) {
      return;
    }
    GetScriptLoader()->MaybeMoveToLoadedList(aRequest);
    GetScriptLoader()->ProcessPendingRequests(jsapi.cx());
  }
}

}  // namespace mozilla::dom::workerinternals::loader
