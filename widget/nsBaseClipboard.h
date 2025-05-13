/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsBaseClipboard_h__
#define nsBaseClipboard_h__

#include "mozilla/Array.h"
#include "mozilla/dom/PContent.h"
#include "mozilla/Logging.h"
#include "mozilla/MoveOnlyFunction.h"
#include "mozilla/Result.h"
#include "nsIClipboard.h"
#include "nsITransferable.h"
#include "nsCOMPtr.h"

extern mozilla::LazyLogModule gWidgetClipboardLog;
#define MOZ_CLIPBOARD_LOG(...) \
  MOZ_LOG(gWidgetClipboardLog, mozilla::LogLevel::Debug, (__VA_ARGS__))
#define MOZ_CLIPBOARD_LOG_ENABLED() \
  MOZ_LOG_TEST(gWidgetClipboardLog, mozilla::LogLevel::Debug)

class nsITransferable;
class nsIClipboardOwner;
class nsIPrincipal;
class nsIWidget;

namespace mozilla::dom {
class WindowContext;
}  // namespace mozilla::dom

/**
 * A base clipboard class for all platform, so that they can share the same
 * implementation.
 */
class nsBaseClipboard : public nsIClipboard {
 public:
  explicit nsBaseClipboard(
      const mozilla::dom::ClipboardCapabilities& aClipboardCaps);

  // nsISupports
  NS_DECL_ISUPPORTS

  // nsIClipboard
  NS_IMETHOD SetData(
      nsITransferable* aTransferable, nsIClipboardOwner* aOwner,
      ClipboardType aWhichClipboard,
      mozilla::dom::WindowContext* aWindowContext) override final;
  NS_IMETHOD AsyncSetData(ClipboardType aWhichClipboard,
                          mozilla::dom::WindowContext* aSettingWindowContext,
                          nsIAsyncClipboardRequestCallback* aCallback,
                          nsIAsyncSetClipboardData** _retval) override final;
  NS_IMETHOD GetData(
      nsITransferable* aTransferable, ClipboardType aWhichClipboard,
      mozilla::dom::WindowContext* aWindowContext) override final;
  NS_IMETHOD GetDataSnapshot(
      const nsTArray<nsCString>& aFlavorList, ClipboardType aWhichClipboard,
      mozilla::dom::WindowContext* aRequestingWindowContext,
      nsIPrincipal* aRequestingPrincipal,
      nsIClipboardGetDataSnapshotCallback* aCallback) override final;
  NS_IMETHOD GetDataSnapshotSync(
      const nsTArray<nsCString>& aFlavorList, ClipboardType aWhichClipboard,
      mozilla::dom::WindowContext* aRequestingWindowContext,
      nsIClipboardDataSnapshot** _retval) override final;
  NS_IMETHOD EmptyClipboard(ClipboardType aWhichClipboard) override final;
  NS_IMETHOD HasDataMatchingFlavors(const nsTArray<nsCString>& aFlavorList,
                                    ClipboardType aWhichClipboard,
                                    bool* aOutResult) override final;
  NS_IMETHOD IsClipboardTypeSupported(ClipboardType aWhichClipboard,
                                      bool* aRetval) override final;

  void GetDataSnapshotInternal(
      const nsTArray<nsCString>& aFlavorList,
      nsIClipboard::ClipboardType aClipboardType,
      mozilla::dom::WindowContext* aRequestingWindowContext,
      nsIClipboardGetDataSnapshotCallback* aCallback);

  using GetDataCallback = mozilla::MoveOnlyFunction<void(nsresult)>;
  using HasMatchingFlavorsCallback = mozilla::MoveOnlyFunction<void(
      mozilla::Result<nsTArray<nsCString>, nsresult>)>;

  mozilla::Maybe<uint64_t> GetClipboardCacheInnerWindowId(
      ClipboardType aClipboardType);

 protected:
  virtual ~nsBaseClipboard();

  // Implement the native clipboard behavior.
  NS_IMETHOD SetNativeClipboardData(nsITransferable* aTransferable,
                                    ClipboardType aWhichClipboard) = 0;
  NS_IMETHOD GetNativeClipboardData(nsITransferable* aTransferable,
                                    ClipboardType aWhichClipboard) = 0;
  virtual void AsyncGetNativeClipboardData(nsITransferable* aTransferable,
                                           ClipboardType aWhichClipboard,
                                           GetDataCallback&& aCallback);
  virtual nsresult EmptyNativeClipboardData(ClipboardType aWhichClipboard) = 0;
  virtual mozilla::Result<int32_t, nsresult> GetNativeClipboardSequenceNumber(
      ClipboardType aWhichClipboard) = 0;
  virtual mozilla::Result<bool, nsresult> HasNativeClipboardDataMatchingFlavors(
      const nsTArray<nsCString>& aFlavorList,
      ClipboardType aWhichClipboard) = 0;
  virtual void AsyncHasNativeClipboardDataMatchingFlavors(
      const nsTArray<nsCString>& aFlavorList, ClipboardType aWhichClipboard,
      HasMatchingFlavorsCallback&& aCallback);

  void ClearClipboardCache(ClipboardType aClipboardType);

 private:
  void RejectPendingAsyncSetDataRequestIfAny(ClipboardType aClipboardType);

  class AsyncSetClipboardData final : public nsIAsyncSetClipboardData {
   public:
    NS_DECL_ISUPPORTS
    NS_DECL_NSIASYNCSETCLIPBOARDDATA

    AsyncSetClipboardData(nsIClipboard::ClipboardType aClipboardType,
                          nsBaseClipboard* aClipboard,
                          mozilla::dom::WindowContext* aRequestingWindowContext,
                          nsIAsyncClipboardRequestCallback* aCallback);

   private:
    virtual ~AsyncSetClipboardData() = default;
    bool IsValid() const {
      // If this request is no longer valid, the callback should be notified.
      MOZ_ASSERT_IF(!mClipboard, !mCallback);
      return !!mClipboard;
    }
    void MaybeNotifyCallback(nsresult aResult);

    // The clipboard type defined in nsIClipboard.
    nsIClipboard::ClipboardType mClipboardType;
    // It is safe to use a raw pointer as it will be nullified (by calling
    // NotifyCallback()) once nsBaseClipboard stops tracking us. This is
    // also used to indicate whether this request is valid.
    nsBaseClipboard* mClipboard;
    RefPtr<mozilla::dom::WindowContext> mWindowContext;
    // mCallback will be nullified once the callback is notified to ensure the
    // callback is only notified once.
    nsCOMPtr<nsIAsyncClipboardRequestCallback> mCallback;
  };

  class ClipboardDataSnapshot final : public nsIClipboardDataSnapshot {
   public:
    ClipboardDataSnapshot(
        nsIClipboard::ClipboardType aClipboardType, int32_t aSequenceNumber,
        nsTArray<nsCString>&& aFlavors, bool aFromCache,
        nsBaseClipboard* aClipboard,
        mozilla::dom::WindowContext* aRequestingWindowContext);

    NS_DECL_ISUPPORTS
    NS_DECL_NSICLIPBOARDDATASNAPSHOT

   private:
    virtual ~ClipboardDataSnapshot() = default;
    bool IsValid();

    // The clipboard type defined in nsIClipboard.
    const nsIClipboard::ClipboardType mClipboardType;
    // The sequence number associated with the clipboard content for this
    // request. If it doesn't match with the current sequence number in system
    // clipboard, this request targets stale data and is deemed invalid.
    const int32_t mSequenceNumber;
    // List of available data types for clipboard content.
    const nsTArray<nsCString> mFlavors;
    // Data should be read from cache.
    const bool mFromCache;
    // This is also used to indicate whether this request is still valid.
    RefPtr<nsBaseClipboard> mClipboard;
    // The requesting window, which is used for Content Analysis purposes.
    RefPtr<mozilla::dom::WindowContext> mRequestingWindowContext;
  };

  class ClipboardCache final {
   public:
    ~ClipboardCache() {
      // In order to notify the old clipboard owner.
      Clear();
    }

    /**
     * Clear the cached transferable and notify the original clipboard owner
     * that it has lost ownership.
     */
    void Clear();
    void Update(nsITransferable* aTransferable,
                nsIClipboardOwner* aClipboardOwner, int32_t aSequenceNumber,
                mozilla::Maybe<uint64_t> aInnerWindowId) {
      // Clear first to notify the old clipboard owner.
      Clear();
      mTransferable = aTransferable;
      mClipboardOwner = aClipboardOwner;
      mSequenceNumber = aSequenceNumber;
      mInnerWindowId = aInnerWindowId;
    }
    nsITransferable* GetTransferable() const { return mTransferable; }
    nsIClipboardOwner* GetClipboardOwner() const { return mClipboardOwner; }
    int32_t GetSequenceNumber() const { return mSequenceNumber; }
    mozilla::Maybe<uint64_t> GetInnerWindowId() const { return mInnerWindowId; }
    nsresult GetData(nsITransferable* aTransferable) const;

   private:
    nsCOMPtr<nsITransferable> mTransferable;
    nsCOMPtr<nsIClipboardOwner> mClipboardOwner;
    int32_t mSequenceNumber = -1;
    mozilla::Maybe<uint64_t> mInnerWindowId;
  };

  void MaybeRetryGetAvailableFlavors(
      const nsTArray<nsCString>& aFlavorList,
      nsIClipboard::ClipboardType aWhichClipboard,
      nsIClipboardGetDataSnapshotCallback* aCallback, int32_t aRetryCount,
      mozilla::dom::WindowContext* aRequestingWindowContext);

  // Return clipboard cache if the cached data is valid, otherwise clear the
  // cached data and returns null.
  ClipboardCache* GetClipboardCacheIfValid(ClipboardType aClipboardType);

  mozilla::Result<nsTArray<nsCString>, nsresult> GetFlavorsFromClipboardCache(
      ClipboardType aClipboardType);
  nsresult GetDataFromClipboardCache(nsITransferable* aTransferable,
                                     ClipboardType aClipboardType);
  void RequestUserConfirmation(ClipboardType aClipboardType,
                               const nsTArray<nsCString>& aFlavorList,
                               mozilla::dom::WindowContext* aWindowContext,
                               nsIPrincipal* aRequestingPrincipal,
                               nsIClipboardGetDataSnapshotCallback* aCallback);

  already_AddRefed<nsIClipboardDataSnapshot>
  MaybeCreateGetRequestFromClipboardCache(
      const nsTArray<nsCString>& aFlavorList, ClipboardType aClipboardType,
      mozilla::dom::WindowContext* aRequestingWindowContext);

  // Track the pending request for each clipboard type separately. And only need
  // to track the latest request for each clipboard type as the prior pending
  // request will be canceled when a new request is made.
  mozilla::Array<RefPtr<AsyncSetClipboardData>,
                 nsIClipboard::kClipboardTypeCount>
      mPendingWriteRequests;

  mozilla::Array<mozilla::UniquePtr<ClipboardCache>,
                 nsIClipboard::kClipboardTypeCount>
      mCaches;
  const mozilla::dom::ClipboardCapabilities mClipboardCaps;
  bool mIgnoreEmptyNotification = false;
};

#endif  // nsBaseClipboard_h__
