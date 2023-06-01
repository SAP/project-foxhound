/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_TEST_GTEST_QUOTAMANAGERDEPENDENCYFIXTURE_H_
#define DOM_QUOTA_TEST_GTEST_QUOTAMANAGERDEPENDENCYFIXTURE_H_

#include "gtest/gtest.h"
#include "mozilla/MozPromise.h"
#include "mozilla/SpinEventLoopUntil.h"
#include "mozilla/dom/quota/ForwardDecls.h"
#include "mozilla/dom/quota/QuotaManager.h"

namespace mozilla::dom::quota::test {

class QuotaManagerDependencyFixture : public testing::Test {
 public:
 protected:
  static void InitializeFixture();

  static void ShutdownFixture();

  static void StorageInitialized(bool* aResult = nullptr);

  static void ClearStoragesForOrigin(const OriginMetadata& aOriginMetadata);

  /* Convenience method for tasks which must be called on PBackground thread */
  template <class Invokable, class... Args>
  static void PerformOnBackgroundThread(Invokable&& aInvokable,
                                        Args&&... aArgs) {
    bool done = false;
    auto boundTask =
        // For c++17, bind is cleaner than tuple for parameter pack forwarding
        // NOLINTNEXTLINE(modernize-avoid-bind)
        std::bind(std::forward<Invokable>(aInvokable),
                  std::forward<Args>(aArgs)...);
    InvokeAsync(BackgroundTargetStrongRef(), __func__,
                [boundTask = std::move(boundTask)] {
                  boundTask();
                  return BoolPromise::CreateAndResolve(true, __func__);
                })
        ->Then(GetCurrentSerialEventTarget(), __func__,
               [&done](const BoolPromise::ResolveOrRejectValue& /* aValue */) {
                 done = true;
               });

    SpinEventLoopUntil("Promise is fulfilled"_ns, [&done]() { return done; });
  }

  /* Convenience method for tasks which must be executed on IO thread */
  template <class Invokable, class... Args>
  static void PerformOnIOThread(Invokable&& aInvokable, Args&&... aArgs) {
    QuotaManager* quotaManager = QuotaManager::Get();
    ASSERT_TRUE(quotaManager);

    bool done = false;
    auto boundTask =
        // For c++17, bind is cleaner than tuple for parameter pack forwarding
        // NOLINTNEXTLINE(modernize-avoid-bind)
        std::bind(std::forward<Invokable>(aInvokable),
                  std::forward<Args>(aArgs)...);
    InvokeAsync(quotaManager->IOThread(), __func__,
                [boundTask = std::move(boundTask)]() {
                  boundTask();
                  return BoolPromise::CreateAndResolve(true, __func__);
                })
        ->Then(GetCurrentSerialEventTarget(), __func__,
               [&done](const BoolPromise::ResolveOrRejectValue& value) {
                 done = true;
               });

    SpinEventLoopUntil("Promise is fulfilled"_ns, [&done]() { return done; });
  }

  static const nsCOMPtr<nsISerialEventTarget>& BackgroundTargetStrongRef() {
    return sBackgroundTarget;
  }

 private:
  static nsCOMPtr<nsISerialEventTarget> sBackgroundTarget;
};

}  // namespace mozilla::dom::quota::test

#endif  // DOM_QUOTA_TEST_GTEST_QUOTAMANAGERDEPENDENCYFIXTURE_H_
