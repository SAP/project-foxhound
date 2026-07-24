/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef js_loader_ScriptLoadRequest_h
#define js_loader_ScriptLoadRequest_h

#include "js/experimental/JSStencil.h"
#include "js/RootingAPI.h"
#include "js/SourceText.h"
#include "js/TypeDecls.h"
#include "mozilla/Assertions.h"
#include "mozilla/dom/CacheExpirationTime.h"
#include "mozilla/dom/SRIMetadata.h"
#include "mozilla/LinkedList.h"
#include "mozilla/PreloaderBase.h"
#include "mozilla/RefPtr.h"
#include "mozilla/SharedSubResourceCache.h"  // mozilla::SubResourceNetworkMetadataHolder
#include "mozilla/StaticPrefs_dom.h"
#include "nsCycleCollectionParticipant.h"
#include "nsIGlobalObject.h"
#include "LoadedScript.h"
#include "ScriptKind.h"
#include "ScriptFetchOptions.h"

namespace mozilla::dom {

class ScriptLoadContext;
class WorkerLoadContext;
class WorkletLoadContext;
enum class RequestPriority : uint8_t;

}  // namespace mozilla::dom

namespace mozilla::loader {
class SyncLoadContext;
}  // namespace mozilla::loader

namespace JS::loader {

class LoadContextBase;
class ModuleLoadRequest;
class ScriptLoadRequestList;

/*
 * ScriptLoadRequest
 *
 * ScriptLoadRequest is a generic representation of a request/response for
 * JavaScript file that will be loaded by a Script/Module loader. This
 * representation is used by the following:
 *   - DOM ScriptLoader / ModuleLoader
 *   - worker ScriptLoader / ModuleLoader
 *   - worklet ScriptLoader
 *   - SyncModuleLoader
 *
 * The ScriptLoadRequest contains information specific to the current request,
 * such as the kind of script (classic, module, etc), and the reference to the
 * LoadedScript which contains the information independent of the current
 * request, such as the URI, the ScriptFetchOptions, etc.
 *
 * Relationship to ScriptLoadContext:
 *
 * ScriptLoadRequest and ScriptLoadContexts have a circular pointer.  A
 * ScriptLoadContext augments the loading of a ScriptLoadRequest by providing
 * additional information regarding the loading and evaluation behavior (see
 * the ScriptLoadContext class for details).  In terms of responsibility,
 * the ScriptLoadRequest represents "What" is being loaded, and the
 * ScriptLoadContext represents "How".
 *
 * TODO: see if we can use it in the jsshell script loader. We need to either
 * remove ISUPPORTS or find a way to encorporate that in the jsshell. We would
 * then only have one implementation of the script loader, and it would be
 * tested whenever jsshell tests are run. This would mean finding another way to
 * create ScriptLoadRequest lists.
 *
 */

class ScriptLoadRequest : public nsISupports,
                          private mozilla::LinkedListElement<ScriptLoadRequest>,
                          public LoadedScriptDelegate<ScriptLoadRequest> {
  using super = LinkedListElement<ScriptLoadRequest>;

  // Allow LinkedListElement<ScriptLoadRequest> to cast us to itself as needed.
  friend class mozilla::LinkedListElement<ScriptLoadRequest>;
  friend class ScriptLoadRequestList;

 protected:
  virtual ~ScriptLoadRequest();

 public:
  using SRIMetadata = mozilla::dom::SRIMetadata;
  ScriptLoadRequest(ScriptKind aKind, const SRIMetadata& aIntegrity,
                    nsIURI* aReferrer, LoadContextBase* aContext);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(ScriptLoadRequest)

  using super::getNext;
  using super::isInList;

  template <typename T, typename D = DeletePolicy<T>>
  using UniquePtr = mozilla::UniquePtr<T, D>;

  bool IsModuleRequest() const { return mKind == ScriptKind::eModule; }
  bool IsImportMapRequest() const { return mKind == ScriptKind::eImportMap; }

  ModuleLoadRequest* AsModuleRequest();
  const ModuleLoadRequest* AsModuleRequest() const;

  CacheExpirationTime ExpirationTime() const {
    // The request's expiration time is used only when it's received from
    // necko.  For in-memory cached, case, the
    // SharedSubResourceCache::CompleteSubResource::mExpirationTime field is
    // used instead.
    MOZ_ASSERT(!IsCachedStencil());
    return mExpirationTime;
  }

  void SetMinimumExpirationTime(const CacheExpirationTime& aExpirationTime) {
    mExpirationTime.SetMinimum(aExpirationTime);
  }

  virtual bool IsTopLevel() const { return true; };

  virtual void Cancel();

  virtual void SetReady();

  enum class State : uint8_t {
    CheckingCache,
    Fetching,
    Compiling,
    Ready,
    Canceled
  };

  // Before any attempt at fetching resources from the cache we should first
  // make sure that the resource does not yet exists in the cache. In which case
  // we might simply alias its LoadedScript. Otherwise a new one would be
  // created.
  bool IsCheckingCache() const { return mState == State::CheckingCache; }

  // Setup and load resources, to fill the LoadedScript and make it usable by
  // the JavaScript engine.
  bool IsFetching() const { return mState == State::Fetching; }
  bool IsCompiling() const { return mState == State::Compiling; }
  bool IsCanceled() const { return mState == State::Canceled; }

  // Return whether the request has been completed, either successfully or
  // otherwise.
  bool IsFinished() const {
    return mState == State::Ready || mState == State::Canceled;
  }

  mozilla::dom::RequestPriority FetchPriority() const {
    return FetchOptions()->mFetchPriority;
  }

  enum ParserMetadata ParserMetadata() const {
    return FetchOptions()->mParserMetadata;
  }

  const nsString& Nonce() const { return FetchOptions()->mNonce; }

  nsIPrincipal* TriggeringPrincipal() const {
    return FetchOptions()->mTriggeringPrincipal;
  }

  // Convert a CheckingCache ScriptLoadRequest into a Ready one, by populating
  // the script data from cached script.
  void CacheEntryFound(LoadedScript* aLoadedScript);

  void CacheEntryRevived(LoadedScript* aLoadedScript);

  // Convert a CheckingCache ScriptLoadRequest into a Fetching one, by creating
  // a new LoadedScript which is matching the ScriptKind provided when
  // constructing this ScriptLoadRequest.
  void NoCacheEntryFound(mozilla::dom::ReferrerPolicy aReferrerPolicy,
                         ScriptFetchOptions* aFetchOptions, nsIURI* aURI);

 private:
  void SetCacheEntry(LoadedScript* aLoadedScript);

 public:
  bool PassedConditionForDiskCache() const {
    return mDiskCachingPlan == CachingPlan::PassedCondition;
  }

  bool PassedConditionForMemoryCache() const {
    return mMemoryCachingPlan == CachingPlan::PassedCondition;
  }

  bool PassedConditionForEitherCache() const {
    return PassedConditionForDiskCache() || PassedConditionForMemoryCache();
  }

  void MarkNotCacheable() {
    mDiskCachingPlan = CachingPlan::NotCacheable;
    mMemoryCachingPlan = CachingPlan::NotCacheable;
  }

  bool IsMarkedNotCacheable() const {
    MOZ_ASSERT_IF(mDiskCachingPlan == CachingPlan::NotCacheable,
                  mMemoryCachingPlan == CachingPlan::NotCacheable);
    MOZ_ASSERT_IF(mDiskCachingPlan != CachingPlan::NotCacheable,
                  mMemoryCachingPlan != CachingPlan::NotCacheable);
    return mDiskCachingPlan == CachingPlan::NotCacheable;
  }

  void MarkSkippedDiskCaching() {
    MOZ_ASSERT(mDiskCachingPlan == CachingPlan::Uninitialized ||
               mDiskCachingPlan == CachingPlan::PassedCondition);
    mDiskCachingPlan = CachingPlan::Skipped;
  }

  void MarkSkippedMemoryCaching() {
    MOZ_ASSERT(mMemoryCachingPlan == CachingPlan::Uninitialized ||
               mMemoryCachingPlan == CachingPlan::PassedCondition);
    mMemoryCachingPlan = CachingPlan::Skipped;
  }

  void MarkSkippedAllCaching() {
    MarkSkippedDiskCaching();
    MarkSkippedMemoryCaching();
  }

  void MarkPassedConditionForDiskCache() {
    MOZ_ASSERT(mDiskCachingPlan == CachingPlan::Uninitialized);
    mDiskCachingPlan = CachingPlan::PassedCondition;
  }

  void MarkPassedConditionForMemoryCache() {
    MOZ_ASSERT(mMemoryCachingPlan == CachingPlan::Uninitialized);
    mMemoryCachingPlan = CachingPlan::PassedCondition;
  }

  mozilla::CORSMode CORSMode() const { return FetchOptions()->mCORSMode; }

  bool HasLoadContext() const { return mLoadContext; }
  bool HasScriptLoadContext() const;
  bool HasWorkerLoadContext() const;

  mozilla::dom::ScriptLoadContext* GetScriptLoadContext();
  const mozilla::dom::ScriptLoadContext* GetScriptLoadContext() const;

  mozilla::loader::SyncLoadContext* GetSyncLoadContext();

  mozilla::dom::WorkerLoadContext* GetWorkerLoadContext();

  mozilla::dom::WorkletLoadContext* GetWorkletLoadContext();

  const LoadedScript* getLoadedScript() const { return mLoadedScript.get(); }
  LoadedScript* getLoadedScript() { return mLoadedScript.get(); }

  bool HasSourceMapURL() const { return mHasSourceMapURL_; }
  const nsString& GetSourceMapURL() const {
    MOZ_ASSERT(mHasSourceMapURL_);
    return mMaybeSourceMapURL_;
  }
  void SetSourceMapURL(const nsString& aSourceMapURL) {
    MOZ_ASSERT(!mHasSourceMapURL_);
    mMaybeSourceMapURL_ = aSourceMapURL;
    mHasSourceMapURL_ = true;
  }

  bool HasDirtyCache() const { return mHasDirtyCache_; }
  void SetHasDirtyCache() { mHasDirtyCache_ = true; }

  bool HadPostponed() const { return mHadPostponed_; }
  void SetHadPostponed() { mHadPostponed_ = true; }

 public:
  // Fields.

  // Whether this is a classic script, a module script, or an import map.
  const ScriptKind mKind;

  // Are we still waiting for a load to complete?
  State mState;

  // Request source, not cached serialized Stencil.
  bool mFetchSourceOnly : 1;

  // Becomes true if this has source map url.
  //
  // Do not access directly.
  // Use HasSourceMapURL(), SetSourceMapURL(), and GetSourceMapURL().
  bool mHasSourceMapURL_ : 1;

  // Set to true if this response is found in the in-memory cache, but the
  // cache is marked as dirty, and needs validation.
  //
  // This request should go to necko, and when the response is received,
  // the cache should be either revived or evicted.
  bool mHasDirtyCache_ : 1;

  // Set to true if this script had already been postponed in the scheduling.
  bool mHadPostponed_ : 1;

  enum class CachingPlan : uint8_t {
    // This is not yet considered for caching.
    Uninitialized,

    // This request is not cacheable (e.g. inline script, JSON module).
    NotCacheable,

    // This request is cacheable, but is marked for skipping due to
    // not passing conditions.
    Skipped,

    // This fits the condition for the caching (e.g. file size, fetch count).
    PassedCondition,
  };
  CachingPlan mDiskCachingPlan : 2;
  CachingPlan mMemoryCachingPlan : 2;

  CacheExpirationTime mExpirationTime = CacheExpirationTime::Never();

  RefPtr<mozilla::SubResourceNetworkMetadataHolder> mNetworkMetadata;
  const SRIMetadata mIntegrity;
  const nsCOMPtr<nsIURI> mReferrer;

  // Holds source map url for loaded scripts.
  //
  // Do not access directly.
  // Use HasSourceMapURL(), SetSourceMapURL(), and GetSourceMapURL().
  nsString mMaybeSourceMapURL_;

  nsCOMPtr<nsIPrincipal> mOriginPrincipal;

  // Keep the URI's filename alive during off thread parsing.
  // Also used by workers to report on errors while loading, and used by
  // worklets as the file name in compile options.
  nsAutoCString mURL;

  // The loaded script holds the data which can be shared among similar requests
  RefPtr<LoadedScript> mLoadedScript;

  // LoadContext for augmenting the load depending on the loading
  // context (DOM, Worker, etc.)
  RefPtr<LoadContextBase> mLoadContext;

  // EarlyHintRegistrar id to connect the http channel back to the preload, with
  // a default of value of 0 indicating that this request is not an early hints
  // preload.
  uint64_t mEarlyHintPreloaderId;
};

}  // namespace JS::loader

#endif  // js_loader_ScriptLoadRequest_h
