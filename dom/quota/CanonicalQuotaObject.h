/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_CANONICALQUOTAOBJECT_H_
#define DOM_QUOTA_CANONICALQUOTAOBJECT_H_

// Local includes
#include "Client.h"

// Global includes
#include <cstdint>

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ThreadSafeWeakPtr.h"
#include "mozilla/dom/quota/Assertions.h"
#include "mozilla/dom/quota/QuotaObject.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsStringFwd.h"

// XXX Avoid including this here by moving function bodies to the cpp file.
#include "mozilla/dom/quota/QuotaCommon.h"

namespace mozilla::dom::quota {

class OriginInfo;
class QuotaManager;

class CanonicalQuotaObject final : public QuotaObject {
  friend class OriginInfo;
  friend class QuotaManager;

  class StoragePressureRunnable;

 public:
  NS_IMETHOD_(MozExternalRefCountType) AddRef() override;

  NS_IMETHOD_(MozExternalRefCountType) Release() override;

  const nsAString& Path() const override { return mPath; }

  [[nodiscard]] bool MaybeUpdateSize(int64_t aSize, bool aTruncate) override;

  bool IncreaseSize(int64_t aDelta) override;

  void DisableQuotaCheck() override;

  void EnableQuotaCheck() override;

 private:
  CanonicalQuotaObject(const RefPtr<OriginInfo>& aOriginInfo,
                       Client::Type aClientType, const nsAString& aPath,
                       int64_t aSize);

  MOZ_COUNTED_DTOR(CanonicalQuotaObject)

  already_AddRefed<QuotaObject> LockedAddRef() {
    AssertCurrentThreadOwnsQuotaMutex();

    ++mRefCnt;

    RefPtr<QuotaObject> result = dont_AddRef(this);
    return result.forget();
  }

  bool LockedMaybeUpdateSize(int64_t aSize, bool aTruncate);

  mozilla::ThreadSafeAutoRefCnt mRefCnt;

  ThreadSafeWeakPtr<OriginInfo> mOriginInfo;
  nsString mPath;
  int64_t mSize;
  Client::Type mClientType;
  bool mQuotaCheckDisabled;
  bool mWritingDone;
};

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_CANONICALQUOTAOBJECT_H_
