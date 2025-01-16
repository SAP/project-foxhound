/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "QuotaManagerDependencyFixture.h"

#include "mozIStorageService.h"
#include "mozStorageCID.h"
#include "mozilla/BasePrincipal.h"
#include "mozilla/dom/ScriptSettings.h"
#include "mozilla/dom/quota/QuotaManagerService.h"
#include "mozilla/dom/quota/ResultExtensions.h"
#include "mozilla/gtest/MozAssertions.h"
#include "mozilla/ipc/BackgroundUtils.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"
#include "nsIPrefBranch.h"
#include "nsIPrefService.h"
#include "nsIQuotaCallbacks.h"
#include "nsIQuotaRequests.h"
#include "nsIVariant.h"
#include "nsScriptSecurityManager.h"

namespace mozilla::dom::quota::test {

namespace {

class RequestResolver final : public nsIQuotaCallback {
 public:
  RequestResolver() : mDone(false) {}

  bool Done() const { return mDone; }

  NS_DECL_ISUPPORTS

  NS_IMETHOD OnComplete(nsIQuotaRequest* aRequest) override {
    mDone = true;

    return NS_OK;
  }

 private:
  ~RequestResolver() = default;

  bool mDone;
};

}  // namespace

NS_IMPL_ISUPPORTS(RequestResolver, nsIQuotaCallback)

// static
void QuotaManagerDependencyFixture::InitializeFixture() {
  // Some QuotaManagerService methods fail if the testing pref is not set.
  nsCOMPtr<nsIPrefBranch> prefs = do_GetService(NS_PREFSERVICE_CONTRACTID);

  prefs->SetBoolPref("dom.quotaManager.testing", true);

  // The first initialization of storage service must be done on the main
  // thread.
  nsCOMPtr<mozIStorageService> storageService =
      do_GetService(MOZ_STORAGE_SERVICE_CONTRACTID);
  ASSERT_TRUE(storageService);

  nsIObserver* observer = QuotaManager::GetObserver();
  ASSERT_TRUE(observer);

  nsresult rv = observer->Observe(nullptr, "profile-do-change", nullptr);
  ASSERT_NS_SUCCEEDED(rv);

  ASSERT_NO_FATAL_FAILURE(EnsureQuotaManager());

  QuotaManager* quotaManager = QuotaManager::Get();
  ASSERT_TRUE(quotaManager);

  ASSERT_TRUE(quotaManager->OwningThread());

  sBackgroundTarget = quotaManager->OwningThread();
}

// static
void QuotaManagerDependencyFixture::ShutdownFixture() {
  nsCOMPtr<nsIPrefBranch> prefs = do_GetService(NS_PREFSERVICE_CONTRACTID);

  prefs->SetBoolPref("dom.quotaManager.testing", false);

  nsIObserver* observer = QuotaManager::GetObserver();
  ASSERT_TRUE(observer);

  nsresult rv = observer->Observe(nullptr, "profile-before-change-qm", nullptr);
  ASSERT_NS_SUCCEEDED(rv);

  PerformOnBackgroundThread([]() { QuotaManager::Reset(); });

  sBackgroundTarget = nullptr;
}

// static
void QuotaManagerDependencyFixture::InitializeStorage() {
  PerformOnBackgroundThread([]() {
    QuotaManager* quotaManager = QuotaManager::Get();
    ASSERT_TRUE(quotaManager);

    bool done = false;

    quotaManager->InitializeStorage()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [&done](const BoolPromise::ResolveOrRejectValue& aValue) {
          done = true;
        });

    SpinEventLoopUntil("Promise is fulfilled"_ns, [&done]() { return done; });
  });
}

// static
void QuotaManagerDependencyFixture::StorageInitialized(bool* aResult) {
  ASSERT_TRUE(aResult);

  PerformOnBackgroundThread([aResult]() {
    QuotaManager* quotaManager = QuotaManager::Get();
    ASSERT_TRUE(quotaManager);

    bool done = false;

    quotaManager->StorageInitialized()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [aResult, &done](const BoolPromise::ResolveOrRejectValue& aValue) {
          if (aValue.IsResolve()) {
            *aResult = aValue.ResolveValue();
          } else {
            *aResult = false;
          }

          done = true;
        });

    SpinEventLoopUntil("Promise is fulfilled"_ns, [&done]() { return done; });
  });
}

// static
void QuotaManagerDependencyFixture::AssertStorageInitialized() {
  bool result;
  ASSERT_NO_FATAL_FAILURE(StorageInitialized(&result));
  ASSERT_TRUE(result);
}

// static
void QuotaManagerDependencyFixture::AssertStorageNotInitialized() {
  bool result;
  ASSERT_NO_FATAL_FAILURE(StorageInitialized(&result));
  ASSERT_FALSE(result);
}

// static
void QuotaManagerDependencyFixture::ShutdownStorage() {
  PerformOnBackgroundThread([]() {
    QuotaManager* quotaManager = QuotaManager::Get();
    ASSERT_TRUE(quotaManager);

    bool done = false;

    quotaManager->ShutdownStorage()->Then(
        GetCurrentSerialEventTarget(), __func__,
        [&done](const BoolPromise::ResolveOrRejectValue& aValue) {
          done = true;
        });

    SpinEventLoopUntil("Promise is fulfilled"_ns, [&done]() { return done; });
  });
}

// static
void QuotaManagerDependencyFixture::ClearStoragesForOrigin(
    const OriginMetadata& aOriginMetadata) {
  PerformOnBackgroundThread([&aOriginMetadata]() {
    QuotaManager* quotaManager = QuotaManager::Get();
    ASSERT_TRUE(quotaManager);

    nsCOMPtr<nsIPrincipal> principal =
        BasePrincipal::CreateContentPrincipal(aOriginMetadata.mOrigin);
    QM_TRY(MOZ_TO_RESULT(principal), QM_TEST_FAIL);

    mozilla::ipc::PrincipalInfo principalInfo;
    QM_TRY(MOZ_TO_RESULT(PrincipalToPrincipalInfo(principal, &principalInfo)),
           QM_TEST_FAIL);

    bool done = false;

    quotaManager
        ->ClearStoragesForOrigin(/* aPersistenceType */ Nothing(),
                                 principalInfo, /* aClientType */ Nothing())
        ->Then(GetCurrentSerialEventTarget(), __func__,
               [&done](const BoolPromise::ResolveOrRejectValue& aValue) {
                 done = true;
               });

    SpinEventLoopUntil("Promise is fulfilled"_ns, [&done]() { return done; });
  });
}

// static
OriginMetadata QuotaManagerDependencyFixture::GetTestOriginMetadata() {
  return {""_ns,
          "example.com"_ns,
          "http://example.com"_ns,
          "http://example.com"_ns,
          /* aIsPrivate */ false,
          PERSISTENCE_TYPE_DEFAULT};
}

// static
ClientMetadata QuotaManagerDependencyFixture::GetTestClientMetadata() {
  return {GetTestOriginMetadata(), Client::SDB};
}

// static
OriginMetadata QuotaManagerDependencyFixture::GetOtherTestOriginMetadata() {
  return {""_ns,
          "other-example.com"_ns,
          "http://other-example.com"_ns,
          "http://other-example.com"_ns,
          /* aIsPrivate */ false,
          PERSISTENCE_TYPE_DEFAULT};
}

// static
ClientMetadata QuotaManagerDependencyFixture::GetOtherTestClientMetadata() {
  return {GetOtherTestOriginMetadata(), Client::SDB};
}

// static
void QuotaManagerDependencyFixture::EnsureQuotaManager() {
  AutoJSAPI jsapi;

  bool ok = jsapi.Init(xpc::PrivilegedJunkScope());
  ASSERT_TRUE(ok);

  nsCOMPtr<nsIQuotaManagerService> qms = QuotaManagerService::GetOrCreate();
  ASSERT_TRUE(qms);

  // In theory, any nsIQuotaManagerService method which ensures quota manager
  // on the PBackground thread, could be called here. `StorageName` was chosen
  // because it doesn't need to do any directory locking or IO.
  // XXX Consider adding a dedicated nsIQuotaManagerService method for this.
  nsCOMPtr<nsIQuotaRequest> request;
  nsresult rv = qms->StorageName(getter_AddRefs(request));
  ASSERT_NS_SUCCEEDED(rv);

  RefPtr<RequestResolver> resolver = new RequestResolver();

  rv = request->SetCallback(resolver);
  ASSERT_NS_SUCCEEDED(rv);

  SpinEventLoopUntil("Promise is fulfilled"_ns,
                     [&resolver]() { return resolver->Done(); });
}

nsCOMPtr<nsISerialEventTarget> QuotaManagerDependencyFixture::sBackgroundTarget;

}  // namespace mozilla::dom::quota::test
