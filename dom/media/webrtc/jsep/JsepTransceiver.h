/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _JSEPTRANSCEIVER_H_
#define _JSEPTRANSCEIVER_H_

#include <string>

#include "sdp/SdpAttribute.h"
#include "sdp/SdpMediaSection.h"
#include "sdp/Sdp.h"
#include "jsep/JsepTransport.h"
#include "jsep/JsepTrack.h"

#include <mozilla/OwningNonNull.h>
#include "nsISupportsImpl.h"
#include "nsError.h"

namespace mozilla {

class JsepUuidGenerator {
 public:
  virtual ~JsepUuidGenerator() = default;
  virtual bool Generate(std::string* id) = 0;
  virtual JsepUuidGenerator* Clone() const = 0;
};

class JsepTransceiver {
 private:
  ~JsepTransceiver(){};

 public:
  explicit JsepTransceiver(SdpMediaSection::MediaType type,
                           JsepUuidGenerator& aUuidGen,
                           SdpDirectionAttribute::Direction jsDirection =
                               SdpDirectionAttribute::kSendrecv)
      : mJsDirection(jsDirection),
        mSendTrack(type, sdp::kSend),
        mRecvTrack(type, sdp::kRecv),
        mLevel(SIZE_MAX),
        mBundleLevel(SIZE_MAX),
        mAddTrackMagic(false),
        mOnlyExistsBecauseOfSetRemote(false),
        mStopped(false),
        mRemoved(false),
        mNegotiated(false),
        mCanRecycle(false) {
    if (!aUuidGen.Generate(&mUuid)) {
      MOZ_CRASH();
    }
  }

  // Can't use default copy c'tor because of the refcount members. Ugh.
  JsepTransceiver(const JsepTransceiver& orig)
      : mJsDirection(orig.mJsDirection),
        mSendTrack(orig.mSendTrack),
        mRecvTrack(orig.mRecvTrack),
        mTransport(orig.mTransport),
        mUuid(orig.mUuid),
        mMid(orig.mMid),
        mLevel(orig.mLevel),
        mBundleLevel(orig.mBundleLevel),
        mAddTrackMagic(orig.mAddTrackMagic),
        mOnlyExistsBecauseOfSetRemote(orig.mOnlyExistsBecauseOfSetRemote),
        mStopped(orig.mStopped),
        mRemoved(orig.mRemoved),
        mNegotiated(orig.mNegotiated),
        mCanRecycle(orig.mCanRecycle) {}

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(JsepTransceiver);

  void Rollback(JsepTransceiver& oldTransceiver, bool aRemote) {
    MOZ_ASSERT(oldTransceiver.GetMediaType() == GetMediaType());
    MOZ_ASSERT(!oldTransceiver.IsNegotiated() || !oldTransceiver.HasLevel() ||
               !HasLevel() || oldTransceiver.GetLevel() == GetLevel());
    mTransport = oldTransceiver.mTransport;
    if (aRemote) {
      mLevel = oldTransceiver.mLevel;
      mBundleLevel = oldTransceiver.mBundleLevel;
      mSendTrack = oldTransceiver.mSendTrack;
    }
    mRecvTrack = oldTransceiver.mRecvTrack;

    // Don't allow rollback to re-associate a transceiver.
    if (!oldTransceiver.IsAssociated()) {
      Disassociate();
    }
  }

  bool IsAssociated() const { return !mMid.empty(); }

  const std::string& GetMid() const {
    MOZ_ASSERT(IsAssociated());
    return mMid;
  }

  void Associate(const std::string& mid) {
    MOZ_ASSERT(HasLevel());
    mMid = mid;
  }

  void Disassociate() { mMid.clear(); }

  bool HasLevel() const { return mLevel != SIZE_MAX; }

  void SetLevel(size_t level) {
    MOZ_ASSERT(level != SIZE_MAX);
    MOZ_ASSERT(!HasLevel());
    MOZ_ASSERT(!IsStopped());

    mLevel = level;
  }

  void ClearLevel() {
    MOZ_ASSERT(!IsAssociated());
    mLevel = SIZE_MAX;
    mBundleLevel = SIZE_MAX;
  }

  size_t GetLevel() const {
    MOZ_ASSERT(HasLevel());
    return mLevel;
  }

  void Stop() { mStopped = true; }

  bool IsStopped() const { return mStopped; }

  void RestartDatachannelTransceiver() {
    MOZ_RELEASE_ASSERT(GetMediaType() == SdpMediaSection::kApplication);
    mStopped = false;
  }

  void SetRemoved() { mRemoved = true; }

  bool IsRemoved() const { return mRemoved; }

  bool HasBundleLevel() const { return mBundleLevel != SIZE_MAX; }

  size_t BundleLevel() const {
    MOZ_ASSERT(HasBundleLevel());
    return mBundleLevel;
  }

  void SetBundleLevel(size_t aBundleLevel) {
    MOZ_ASSERT(aBundleLevel != SIZE_MAX);
    mBundleLevel = aBundleLevel;
  }

  void ClearBundleLevel() { mBundleLevel = SIZE_MAX; }

  size_t GetTransportLevel() const {
    MOZ_ASSERT(HasLevel());
    if (HasBundleLevel()) {
      return BundleLevel();
    }
    return GetLevel();
  }

  void SetAddTrackMagic() { mAddTrackMagic = true; }

  bool HasAddTrackMagic() const { return mAddTrackMagic; }

  void SetOnlyExistsBecauseOfSetRemote(bool aValue) {
    mOnlyExistsBecauseOfSetRemote = aValue;
  }

  bool OnlyExistsBecauseOfSetRemote() const {
    return mOnlyExistsBecauseOfSetRemote;
  }

  void SetNegotiated() {
    MOZ_ASSERT(IsAssociated());
    MOZ_ASSERT(HasLevel());
    mNegotiated = true;
  }

  bool IsNegotiated() const { return mNegotiated; }

  void SetCanRecycle() { mCanRecycle = true; }

  bool CanRecycle() const { return mCanRecycle; }

  const std::string& GetUuid() const { return mUuid; }

  // Convenience function
  SdpMediaSection::MediaType GetMediaType() const {
    MOZ_ASSERT(mRecvTrack.GetMediaType() == mSendTrack.GetMediaType());
    return mRecvTrack.GetMediaType();
  }

  bool HasOwnTransport() const {
    if (mTransport.mComponents &&
        (!HasBundleLevel() || (GetLevel() == BundleLevel()))) {
      return true;
    }
    return false;
  }

  // See Bug 1642419, this can be removed when all sites are working with RTX.
  void SetRtxIsAllowed(bool aRtxIsAllowed) {
    mSendTrack.SetRtxIsAllowed(aRtxIsAllowed);
    mRecvTrack.SetRtxIsAllowed(aRtxIsAllowed);
  }

  // This is the direction JS wants. It might not actually happen.
  SdpDirectionAttribute::Direction mJsDirection;

  JsepTrack mSendTrack;
  JsepTrack mRecvTrack;
  JsepTransport mTransport;

 private:
  std::string mUuid;
  // Stuff that is not negotiated
  std::string mMid;
  size_t mLevel;  // SIZE_MAX if no level
  // Is this track pair sharing a transport with another?
  size_t mBundleLevel;  // SIZE_MAX if no bundle level
  // The w3c and IETF specs have a lot of "magical" behavior that happens
  // when addTrack is used to create a transceiver. This was a deliberate
  // design choice. Sadface.
  bool mAddTrackMagic;
  bool mOnlyExistsBecauseOfSetRemote;
  bool mStopped;
  bool mRemoved;
  bool mNegotiated;
  bool mCanRecycle;
};

}  // namespace mozilla

#endif  // _JSEPTRANSCEIVER_H_
