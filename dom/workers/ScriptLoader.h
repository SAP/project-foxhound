/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_workers_scriptloader_h__
#define mozilla_dom_workers_scriptloader_h__

#include "js/loader/ScriptLoadRequest.h"
#include "js/loader/ModuleLoadRequest.h"
#include "js/loader/ModuleLoaderBase.h"
#include "mozilla/dom/WorkerCommon.h"
#include "mozilla/dom/WorkerLoadContext.h"
#include "mozilla/dom/WorkerRef.h"
#include "mozilla/dom/workerinternals/WorkerModuleLoader.h"
#include "mozilla/Maybe.h"
#include "nsIContentPolicy.h"
#include "nsStringFwd.h"
#include "nsTArrayForwardDeclare.h"

class nsIChannel;
class nsICookieJarSettings;
class nsILoadGroup;
class nsIPrincipal;
class nsIReferrerInfo;
class nsIURI;

namespace mozilla {

class ErrorResult;

namespace dom {

class ClientInfo;
class Document;
struct WorkerLoadInfo;
class WorkerPrivate;
class SerializedStackHolder;

enum WorkerScriptType { WorkerScript, DebuggerScript };

namespace workerinternals {

namespace loader {
class ScriptExecutorRunnable;
class ScriptLoaderRunnable;
class CachePromiseHandler;
class CacheLoadHandler;
class CacheCreator;
class NetworkLoadHandler;

/*
 * [DOMDOC] WorkerScriptLoader
 *
 * The WorkerScriptLoader is the primary class responsible for loading all
 * Workers, including: ServiceWorkers, SharedWorkers, RemoteWorkers, and
 * dedicated Workers. Our implementation also includes a subtype of dedicated
 * workers: ChromeWorker, which exposes information that isn't normally
 * accessible on a dedicated worker. See [1] for more information.
 *
 * Due to constraints around fetching, this class currently delegates the
 * "Fetch" portion of its work load to the main thread. Unlike the DOM
 * ScriptLoader, the WorkerScriptLoader is not persistent and is not reused for
 * subsequent loads. That means for each iteration of loading (for example,
 * loading the main script, followed by a load triggered by ImportScripts), we
 * recreate this class, and handle the case independently.
 *
 * The flow of requests across the boundaries looks like this:
 *
 *    +----------------------------+
 *    | new WorkerScriptLoader(..) |
 *    +----------------------------+
 *                   |
 *                   V
 *            +-------------------------------------------+
 *            | WorkerScriptLoader::DispatchLoadScripts() |
 *            +-------------------------------------------+
 *                   |
 *                   V
 *            +............................+
 *            | new ScriptLoaderRunnable() |
 *            +............................+
 *                   :
 *                   V
 *  #####################################################################
 *                             Enter Main thread
 *  #####################################################################
 *                   :
 *                   V
 *  +.............................+     For each: Is a normal Worker?
 *  | ScriptLoaderRunnable::Run() |----------------------------------+
 *  +.............................+                                  |
 *                   |                                               V
 *                   |               +----------------------------------+
 *                   |               | WorkerScriptLoader::LoadScript() |
 *                   |               +----------------------------------+
 *                   |                                               |
 *                   | For each request: Is a ServiceWorker?         |
 *                   |                                               |
 *                   V                                               V
 *   +==================+   No script in cache?   +====================+
 *   | CacheLoadHandler |------------------------>| NetworkLoadHandler |
 *   +==================+                         +====================+
 *      :                                                    :
 *      : Loaded from Cache                                  : Loaded by Network
 *      :   +..........................................+     :
 *      +---| ScriptLoaderRunnable::OnStreamComplete() |<----+
 *          +..........................................+
 *                             |
 *                             | A request is ready, is it in post order?
 *                             |
 *                             | call DispatchPendingProcessRequests()
 *                             | This creates ScriptExecutorRunnable
 *            +..............................+
 *            | new ScriptLoaderExecutable() |
 *            +..............................+
 *                             :
 *                             V
 *  #####################################################################
 *                           Enter worker thread
 *  #####################################################################
 *                             :
 *                             V
 *          +...............................+         All Scripts Executed?
 *          | ScriptLoaderExecutable::Run() | -------------+
 *          +...............................+              :
 *                                                         :
 *                                                         : yes. Do execution
 *                                                         : then shutdown.
 *                                                         :
 *                                                         V
 *                       +--------------------------------------------+
 *                       | WorkerScriptLoader::ShutdownScriptLoader() |
 *                       +--------------------------------------------+
 */

class WorkerScriptLoader : public JS::loader::ScriptLoaderInterface,
                           public nsINamed {
  friend class ScriptExecutorRunnable;
  friend class ScriptLoaderRunnable;
  friend class CachePromiseHandler;
  friend class CacheLoadHandler;
  friend class CacheCreator;
  friend class NetworkLoadHandler;
  friend class WorkerModuleLoader;

  RefPtr<ThreadSafeWorkerRef> mWorkerRef;
  UniquePtr<SerializedStackHolder> mOriginStack;
  nsString mOriginStackJSON;
  nsCOMPtr<nsISerialEventTarget> mSyncLoopTarget;
  ScriptLoadRequestList mLoadingRequests;
  ScriptLoadRequestList mLoadedRequests;
  Maybe<ServiceWorkerDescriptor> mController;
  WorkerScriptType mWorkerScriptType;
  ErrorResult& mRv;
  bool mExecutionAborted = false;
  bool mMutedErrorFlag = false;

  // Worker cancellation related Mutex
  //
  // Modified on the worker thread.
  // It is ok to *read* this without a lock on the worker.
  // Main thread must always acquire a lock.
  bool mCleanedUp MOZ_GUARDED_BY(
      mCleanUpLock);  // To specify if the cleanUp() has been done.

  Mutex& CleanUpLock() MOZ_RETURN_CAPABILITY(mCleanUpLock) {
    return mCleanUpLock;
  }

  bool CleanedUp() const MOZ_REQUIRES(mCleanUpLock) {
    mCleanUpLock.AssertCurrentThreadOwns();
    return mCleanedUp;
  }

  // Ensure the worker and the main thread won't race to access |mCleanedUp|.
  // Should be a MutexSingleWriter, but that causes a lot of issues when you
  // expose the lock via Lock().
  Mutex mCleanUpLock;

 public:
  NS_DECL_THREADSAFE_ISUPPORTS

  WorkerScriptLoader(WorkerPrivate* aWorkerPrivate,
                     UniquePtr<SerializedStackHolder> aOriginStack,
                     nsISerialEventTarget* aSyncLoopTarget,
                     WorkerScriptType aWorkerScriptType, ErrorResult& aRv);

  bool CreateScriptRequests(const nsTArray<nsString>& aScriptURLs,
                            const mozilla::Encoding* aDocumentEncoding,
                            bool aIsMainScript);

  ScriptLoadRequest* GetMainScript();

  already_AddRefed<ScriptLoadRequest> CreateScriptLoadRequest(
      const nsString& aScriptURL, const mozilla::Encoding* aDocumentEncoding,
      bool aIsMainScript);

  bool DispatchLoadScript(ScriptLoadRequest* aRequest);

  bool DispatchLoadScripts();

 protected:
  nsIURI* GetBaseURI() const override;

  nsIURI* GetInitialBaseURI();

  nsIGlobalObject* GetGlobal();

  void MaybeMoveToLoadedList(ScriptLoadRequest* aRequest);

  bool StoreCSP();

  bool ProcessPendingRequests(JSContext* aCx);

  bool AllScriptsExecuted() {
    return mLoadingRequests.isEmpty() && mLoadedRequests.isEmpty();
  }

  bool IsDebuggerScript() const { return mWorkerScriptType == DebuggerScript; }

  void SetController(const Maybe<ServiceWorkerDescriptor>& aDescriptor) {
    mController = aDescriptor;
  }

  Maybe<ServiceWorkerDescriptor>& GetController() { return mController; }

  nsresult LoadScript(ThreadSafeRequestHandle* aRequestHandle);

  void ShutdownScriptLoader(bool aResult, bool aMutedError);

 private:
  ~WorkerScriptLoader() = default;

  NS_IMETHOD
  GetName(nsACString& aName) override {
    aName.AssignLiteral("WorkerScriptLoader");
    return NS_OK;
  }

  void InitModuleLoader();

  void TryShutdown();

  nsTArray<RefPtr<ThreadSafeRequestHandle>> GetLoadingList();

  nsContentPolicyType GetContentPolicyType(ScriptLoadRequest* aRequest);

  bool EvaluateScript(JSContext* aCx, ScriptLoadRequest* aRequest);

  nsresult FillCompileOptionsForRequest(
      JSContext* cx, ScriptLoadRequest* aRequest, JS::CompileOptions* aOptions,
      JS::MutableHandle<JSScript*> aIntroductionScript) override;

  void ReportErrorToConsole(ScriptLoadRequest* aRequest,
                            nsresult aResult) const override;

  // Only used by import maps, crash if we get here.
  void ReportWarningToConsole(
      ScriptLoadRequest* aRequest, const char* aMessageName,
      const nsTArray<nsString>& aParams = nsTArray<nsString>()) const override {
    MOZ_CRASH("Import maps have not been implemented for this context");
  }

  void LogExceptionToConsole(JSContext* aCx, WorkerPrivate* aWorkerPrivate);
};

/* ScriptLoaderRunnable
 *
 * Responsibilities of this class:
 *   - the actual dispatch
 *   - delegating the load back to WorkerScriptLoader
 *   - handling the collections of scripts being requested
 *   - handling main thread cancellation
 *   - dispatching back to the worker thread
 */
class ScriptLoaderRunnable final : public nsIRunnable, public nsINamed {
  RefPtr<WorkerScriptLoader> mScriptLoader;
  RefPtr<ThreadSafeWorkerRef> mWorkerRef;
  nsTArrayView<RefPtr<ThreadSafeRequestHandle>> mLoadingRequests;
  Maybe<nsresult> mCancelMainThread;
  RefPtr<CacheCreator> mCacheCreator;

 public:
  NS_DECL_THREADSAFE_ISUPPORTS

  explicit ScriptLoaderRunnable(
      WorkerScriptLoader* aScriptLoader,
      nsTArray<RefPtr<ThreadSafeRequestHandle>> aLoadingRequests);

  nsresult OnStreamComplete(ThreadSafeRequestHandle* aRequestHandle,
                            nsresult aStatus);

  void LoadingFinished(ThreadSafeRequestHandle* aRequestHandle, nsresult aRv);

  void MaybeExecuteFinishedScripts(ThreadSafeRequestHandle* aRequestHandle);

  bool IsCancelled() { return mCancelMainThread.isSome(); }

  nsresult GetCancelResult() {
    return (IsCancelled()) ? mCancelMainThread.ref() : NS_OK;
  }

  void CancelMainThreadWithBindingAborted();

  CacheCreator* GetCacheCreator() { return mCacheCreator; };

 private:
  ~ScriptLoaderRunnable() = default;

  void CancelMainThread(nsresult aCancelResult);

  void DispatchProcessPendingRequests();

  NS_IMETHOD
  Run() override;

  NS_IMETHOD
  GetName(nsACString& aName) override {
    aName.AssignLiteral("ScriptLoaderRunnable");
    return NS_OK;
  }
};

}  // namespace loader

nsresult ChannelFromScriptURLMainThread(
    nsIPrincipal* aPrincipal, Document* aParentDoc, nsILoadGroup* aLoadGroup,
    nsIURI* aScriptURL, const Maybe<ClientInfo>& aClientInfo,
    nsContentPolicyType aContentPolicyType,
    nsICookieJarSettings* aCookieJarSettings, nsIReferrerInfo* aReferrerInfo,
    nsIChannel** aChannel);

nsresult ChannelFromScriptURLWorkerThread(JSContext* aCx,
                                          WorkerPrivate* aParent,
                                          const nsAString& aScriptURL,
                                          WorkerLoadInfo& aLoadInfo);

void ReportLoadError(ErrorResult& aRv, nsresult aLoadResult,
                     const nsAString& aScriptURL);

void LoadMainScript(WorkerPrivate* aWorkerPrivate,
                    UniquePtr<SerializedStackHolder> aOriginStack,
                    const nsAString& aScriptURL,
                    WorkerScriptType aWorkerScriptType, ErrorResult& aRv,
                    const mozilla::Encoding* aDocumentEncoding);

void Load(WorkerPrivate* aWorkerPrivate,
          UniquePtr<SerializedStackHolder> aOriginStack,
          const nsTArray<nsString>& aScriptURLs,
          WorkerScriptType aWorkerScriptType, ErrorResult& aRv);

}  // namespace workerinternals

}  // namespace dom
}  // namespace mozilla

#endif /* mozilla_dom_workers_scriptloader_h__ */
