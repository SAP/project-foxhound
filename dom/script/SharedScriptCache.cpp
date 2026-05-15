/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SharedScriptCache.h"

#include "ScriptLoadHandler.h"  // ScriptLoadHandler
#include "ScriptLoader.h"       // ScriptLoader
#include "ScriptTrace.h"        // TRACE_FOR_TEST
#include "js/experimental/CompileScript.h"  // JS::FrontendContext, JS::NewFrontendContext, JS::DestroyFrontendContext
#include "mozilla/Maybe.h"              // Maybe, Some, Nothing
#include "mozilla/TaskController.h"     // TaskController, Task
#include "mozilla/dom/ContentParent.h"  // dom::ContentParent
#include "nsIMemoryReporter.h"  // nsIMemoryReporter, MOZ_DEFINE_MALLOC_SIZE_OF, RegisterWeakMemoryReporter, UnregisterWeakMemoryReporter, MOZ_COLLECT_REPORT, KIND_HEAP, UNITS_BYTES
#include "nsIPrefBranch.h"   // nsIPrefBranch, NS_PREFBRANCH_PREFCHANGE_TOPIC_ID
#include "nsIPrefService.h"  // NS_PREFSERVICE_CONTRACTID
#include "nsIPrincipal.h"    // nsIPrincipal
#include "nsISupportsImpl.h"  // NS_IMPL_ISUPPORTS
#include "nsStringFwd.h"      // nsACString

namespace mozilla::dom {

ScriptHashKey::ScriptHashKey(
    ScriptLoader* aLoader, const JS::loader::ScriptLoadRequest* aRequest,
    mozilla::dom::ReferrerPolicy aReferrerPolicy,
    const JS::loader::ScriptFetchOptions* aFetchOptions,
    const nsCOMPtr<nsIURI> aURI)
    : PLDHashEntryHdr(),
      mURI(aURI),
      mPartitionPrincipal(aLoader->PartitionedPrincipal()),
      mLoaderPrincipal(aLoader->LoaderPrincipal()),
      mKind(aRequest->mKind),
      mCORSMode(aFetchOptions->mCORSMode),
      mReferrerPolicy(aReferrerPolicy),
      mSRIMetadata(aRequest->mIntegrity),
      mNonce(aFetchOptions->mNonce) {
  if (mKind == JS::loader::ScriptKind::eClassic) {
    if (aRequest->GetScriptLoadContext()->HasScriptElement()) {
      aRequest->GetScriptLoadContext()->GetHintCharset(mHintCharset);
    }
  }

  MOZ_COUNT_CTOR(ScriptHashKey);
}

ScriptHashKey::ScriptHashKey(ScriptLoader* aLoader,
                             const JS::loader::ScriptLoadRequest* aRequest,
                             const JS::loader::LoadedScript* aLoadedScript)
    : ScriptHashKey(aLoader, aRequest, aLoadedScript->ReferrerPolicy(),
                    aLoadedScript->GetFetchOptions(), aLoadedScript->GetURI()) {
}

ScriptHashKey::ScriptHashKey(const ScriptLoadData& aLoadData)
    : ScriptHashKey(aLoadData.CacheKey()) {}

bool ScriptHashKey::KeyEquals(const ScriptHashKey& aKey) const {
  {
    bool eq;
    if (NS_FAILED(mURI->Equals(aKey.mURI, &eq)) || !eq) {
      return false;
    }
  }

  if (!mPartitionPrincipal->Equals(aKey.mPartitionPrincipal)) {
    return false;
  }

  // NOTE: mLoaderPrincipal is only for the SharedSubResourceCache logic,
  //       not for comparison here.

  if (mKind != aKey.mKind) {
    return false;
  }

  if (mCORSMode != aKey.mCORSMode) {
    return false;
  }

  if (mReferrerPolicy != aKey.mReferrerPolicy) {
    return false;
  }

  if (!mSRIMetadata.CanTrustBeDelegatedTo(aKey.mSRIMetadata) ||
      !aKey.mSRIMetadata.CanTrustBeDelegatedTo(mSRIMetadata)) {
    return false;
  }

  if (mNonce != aKey.mNonce) {
    return false;
  }

  // NOTE: module always use UTF-8.
  if (mKind == JS::loader::ScriptKind::eClassic) {
    if (mHintCharset != aKey.mHintCharset) {
      return false;
    }
  }

  return true;
}

NS_IMPL_ISUPPORTS(ScriptLoadData, nsISupports)

ScriptLoadData::ScriptLoadData(ScriptLoader* aLoader,
                               JS::loader::ScriptLoadRequest* aRequest,
                               JS::loader::LoadedScript* aLoadedScript)
    : mExpirationTime(aRequest->ExpirationTime()),
      mLoader(aLoader),
      mKey(aLoader, aRequest, aLoadedScript),
      mLoadedScript(aLoadedScript),
      mNetworkMetadata(aRequest->mNetworkMetadata) {}

NS_IMPL_ISUPPORTS(SharedScriptCache, nsIMemoryReporter, nsIObserver)

MOZ_DEFINE_MALLOC_SIZE_OF(SharedScriptCacheMallocSizeOf)

SharedScriptCache::SharedScriptCache() = default;

void SharedScriptCache::Init() {
  RegisterWeakMemoryReporter(this);

  // URL classification (tracking protection etc) are handled inside
  // nsHttpChannel.
  // The cache reflects the policy for whether to block or not, and once
  // the policy is modified, we should discard the cache, to avoid running
  // a cached script which is supposed to be blocked.
  auto ClearCache = [](const char*, void*) { Clear(); };
  Preferences::RegisterPrefixCallback(ClearCache, "urlclassifier.");
  Preferences::RegisterCallback(ClearCache,
                                "privacy.trackingprotection.enabled");
}

SharedScriptCache::~SharedScriptCache() { UnregisterWeakMemoryReporter(this); }

bool SharedScriptCache::ShouldIgnoreMemoryPressure() {
  // During the automated testing, we need to ignore the memory pressure,
  // in order to get the deterministic result.
  return !StaticPrefs::
      dom_script_loader_experimental_navigation_cache_check_memory_pressure();
}

void SharedScriptCache::LoadCompleted(SharedScriptCache* aCache,
                                      ScriptLoadData& aData) {}

NS_IMETHODIMP
SharedScriptCache::CollectReports(nsIHandleReportCallback* aHandleReport,
                                  nsISupports* aData, bool aAnonymize) {
  MOZ_COLLECT_REPORT("explicit/js-non-window/cache", KIND_HEAP, UNITS_BYTES,
                     SharedScriptCacheMallocSizeOf(this) +
                         SizeOfExcludingThis(SharedScriptCacheMallocSizeOf),
                     "Memory used for SharedScriptCache to share script "
                     "across documents");
  return NS_OK;
}

/* static */
void SharedScriptCache::Clear(const Maybe<bool>& aChrome,
                              const Maybe<nsCOMPtr<nsIPrincipal>>& aPrincipal,
                              const Maybe<nsCString>& aSchemelessSite,
                              const Maybe<OriginAttributesPattern>& aPattern,
                              const Maybe<nsCString>& aURL) {
  using ContentParent = dom::ContentParent;

  if (XRE_IsParentProcess()) {
    for (auto* cp : ContentParent::AllProcesses(ContentParent::eLive)) {
      (void)cp->SendClearScriptCache(aChrome, aPrincipal, aSchemelessSite,
                                     aPattern, aURL);
    }
  }

  if (sSingleton) {
    sSingleton->ClearInProcess(aChrome, aPrincipal, aSchemelessSite, aPattern,
                               aURL);
  }
}

/* static */
void SharedScriptCache::Invalidate() {
  using ContentParent = dom::ContentParent;

  if (XRE_IsParentProcess()) {
    for (auto* cp : ContentParent::AllProcesses(ContentParent::eLive)) {
      (void)cp->SendInvalidateScriptCache();
    }
  }

  if (sSingleton) {
    sSingleton->InvalidateInProcess();
  }
  TRACE_FOR_TEST_0("memorycache:invalidate");
}

void SharedScriptCache::InvalidateInProcess() {
  for (auto iter = mComplete.Iter(); !iter.Done(); iter.Next()) {
    if (!iter.Data().mResource->HasCacheEntryId()) {
      iter.Remove();
    } else {
      iter.Data().mResource->SetDirty();
    }
  }
}

/* static */
void SharedScriptCache::PrepareForLastCC() {
  if (sSingleton) {
    sSingleton->mComplete.Clear();
    sSingleton->mPending.Clear();
    sSingleton->mLoading.Clear();
  }
}

static bool ShouldSave(JS::loader::LoadedScript* aLoadedScript,
                       ScriptLoader::DiskCacheStrategy aStrategy) {
  if (!aLoadedScript->HasDiskCacheReference()) {
    return false;
  }

  if (!aLoadedScript->HasSRI()) {
    return false;
  }

  if (aStrategy.mHasSourceLengthMin) {
    size_t len = JS::GetScriptSourceLength(aLoadedScript->GetStencil());
    if (len < aStrategy.mSourceLengthMin) {
      return false;
    }
  }

  if (aStrategy.mHasFetchCountMin) {
    if (aLoadedScript->mFetchCount < aStrategy.mFetchCountMin) {
      return false;
    }
  }

  return true;
}

bool SharedScriptCache::MaybeScheduleUpdateDiskCache() {
  auto strategy = ScriptLoader::GetDiskCacheStrategy();
  if (strategy.mIsDisabled) {
    return false;
  }

  bool hasSaveable = false;
  for (auto iter = mComplete.Iter(); !iter.Done(); iter.Next()) {
    JS::loader::LoadedScript* loadedScript = iter.Data().mResource;
    if (ShouldSave(loadedScript, strategy)) {
      hasSaveable = true;
      break;
    }
  }

  if (!hasSaveable) {
    return false;
  }

  // TODO: Apply more flexible scheduling (bug 1902951)

  nsCOMPtr<nsIRunnable> updater =
      NewRunnableMethod("SharedScriptCache::UpdateDiskCache", this,
                        &SharedScriptCache::UpdateDiskCache);
  (void)NS_DispatchToCurrentThreadQueue(updater.forget(),
                                        EventQueuePriority::Idle);
  return true;
}

class ScriptEncodeAndCompressionTask : public mozilla::Task {
 public:
  ScriptEncodeAndCompressionTask()
      : Task(Kind::OffMainThreadOnly, EventQueuePriority::Idle) {}
  virtual ~ScriptEncodeAndCompressionTask() = default;

#ifdef MOZ_COLLECTING_RUNNABLE_TELEMETRY
  bool GetName(nsACString& aName) override {
    aName.AssignLiteral("ScriptEncodeAndCompressionTask");
    return true;
  }
#endif

  TaskResult Run() override {
    SharedScriptCache::Get()->EncodeAndCompress();
    return TaskResult::Complete;
  }
};

class ScriptSaveTask : public mozilla::Task {
 public:
  ScriptSaveTask() : Task(Kind::MainThreadOnly, EventQueuePriority::Idle) {}
  virtual ~ScriptSaveTask() = default;

#ifdef MOZ_COLLECTING_RUNNABLE_TELEMETRY
  bool GetName(nsACString& aName) override {
    aName.AssignLiteral("ScriptSaveTask");
    return true;
  }
#endif

  TaskResult Run() override {
    SharedScriptCache::Get()->SaveToDiskCache();
    return TaskResult::Complete;
  }
};

void SharedScriptCache::UpdateDiskCache() {
  auto strategy = ScriptLoader::GetDiskCacheStrategy();
  if (strategy.mIsDisabled) {
    return;
  }

  mozilla::MutexAutoLock lock(mEncodeMutex);

  if (!mEncodeItems.empty()) {
    return;
  }

  for (auto iter = mComplete.Iter(); !iter.Done(); iter.Next()) {
    JS::loader::LoadedScript* loadedScript = iter.Data().mResource;
    if (!ShouldSave(loadedScript, strategy)) {
      continue;
    }

    if (!mEncodeItems.emplaceBack(loadedScript->GetStencil(),
                                  std::move(loadedScript->SRI()),
                                  loadedScript)) {
      continue;
    }
  }

  if (mEncodeItems.empty()) {
    return;
  }

  RefPtr<ScriptEncodeAndCompressionTask> encodeTask =
      new ScriptEncodeAndCompressionTask();
  RefPtr<ScriptSaveTask> saveTask = new ScriptSaveTask();
  saveTask->AddDependency(encodeTask);

  TaskController::Get()->AddTask(encodeTask.forget());
  TaskController::Get()->AddTask(saveTask.forget());
}

void SharedScriptCache::EncodeAndCompress() {
  JS::FrontendContext* fc = JS::NewFrontendContext();
  if (!fc) {
    return;
  }

  mozilla::MutexAutoLock lock(mEncodeMutex);

  for (auto& item : mEncodeItems) {
    if (!ScriptLoader::EncodeAndCompress(fc, item.mLoadedScript, item.mStencil,
                                         item.mSRI, item.mCompressed)) {
      item.mCompressed.clear();
    }
  }

  JS::DestroyFrontendContext(fc);
}

void SharedScriptCache::SaveToDiskCache() {
  MOZ_ASSERT(NS_IsMainThread());

  mozilla::MutexAutoLock lock(mEncodeMutex);

  for (const auto& item : mEncodeItems) {
    if (item.mCompressed.empty()) {
      item.mLoadedScript->DropDiskCacheReference();
      item.mLoadedScript->DropSRIOrSRIAndSerializedStencil();
      TRACE_FOR_TEST(item.mLoadedScript, "diskcache:failed");
      continue;
    }

    if (!ScriptLoader::SaveToDiskCache(item.mLoadedScript, item.mCompressed)) {
      item.mLoadedScript->DropDiskCacheReference();
      item.mLoadedScript->DropSRIOrSRIAndSerializedStencil();
      TRACE_FOR_TEST(item.mLoadedScript, "diskcache:failed");
    }

    item.mLoadedScript->DropDiskCacheReference();
    item.mLoadedScript->DropSRIOrSRIAndSerializedStencil();
    TRACE_FOR_TEST(item.mLoadedScript, "diskcache:saved");
  }

  mEncodeItems.clear();
}

}  // namespace mozilla::dom
