/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef include_dom_media_ipc_RemoteMediaDataEncoder_h
#define include_dom_media_ipc_RemoteMediaDataEncoder_h

#include "PlatformEncoderModule.h"
#include "mozilla/RemoteMediaDataEncoderChild.h"
#include "mozilla/RemoteMediaManagerChild.h"
#include "mozilla/ShmemRecycleAllocator.h"

namespace mozilla {

class RemoteMediaDataEncoder final : public MediaDataEncoder {
  friend class PRemoteEncoderChild;

 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(MediaDataEncoder, final);

  RemoteMediaDataEncoder(nsCOMPtr<nsISerialEventTarget>&& aThread,
                         RemoteMediaIn aLocation);

  nsISerialEventTarget* GetManagerThread() const { return mThread; }
  RemoteMediaIn GetLocation() const { return mLocation; }
  RemoteMediaDataEncoderChild* GetChild() const { return mChild; }

  RefPtr<PlatformEncoderModule::CreateEncoderPromise> Construct();

  // MediaDataEncoder
  RefPtr<MediaDataEncoder::InitPromise> Init() override;
  RefPtr<MediaDataEncoder::EncodePromise> Encode(
      const MediaData* aSample) override;
  RefPtr<MediaDataEncoder::EncodePromise> Encode(
      nsTArray<RefPtr<MediaData>>&& aSamples) override;
  RefPtr<MediaDataEncoder::EncodePromise> Drain() override;
  RefPtr<MediaDataEncoder::ReconfigurationPromise> Reconfigure(
      const RefPtr<const EncoderConfigurationChangeList>& aConfigurationChanges)
      override;
  RefPtr<mozilla::ShutdownPromise> Shutdown() override;
  bool IsHardwareAccelerated(nsACString& aFailureReason) const override;
  nsCString GetDescriptionName() const override;
  RefPtr<GenericPromise> SetBitrate(uint32_t aBitsPerSec) override;

 private:
  virtual ~RemoteMediaDataEncoder();
  RemoteMediaManagerChild* GetManager();

  RefPtr<PRemoteEncoderChild::EncodePromise> DoSendEncode(
      const nsTArray<RefPtr<MediaData>>& aSamples, ShmemRecycleTicket* aTicket);

  void DoSendInit();
  void MaybeDestroyActor();

  const RefPtr<RemoteMediaDataEncoderChild> mChild;
  const nsCOMPtr<nsISerialEventTarget> mThread;
  const RemoteMediaIn mLocation;
  bool mRemoteCrashed = false;
  bool mHasConstructed = false;

  MozPromiseHolder<PlatformEncoderModule::CreateEncoderPromise>
      mConstructPromise;
  MozPromiseHolder<MediaDataEncoder::InitPromise> mInitPromise;
  MozPromiseHolder<MediaDataEncoder::EncodePromise> mDrainPromise;
  MozPromiseHolder<MediaDataEncoder::ReconfigurationPromise>
      mReconfigurePromise;
  MozPromiseHolder<mozilla::ShutdownPromise> mShutdownPromise;

  mutable Mutex mMutex{"RemoteMediaDataEncoder"};

  nsCString mHardwareAcceleratedReason MOZ_GUARDED_BY(mMutex);
  nsCString mDescription MOZ_GUARDED_BY(mMutex);
  bool mIsHardwareAccelerated MOZ_GUARDED_BY(mMutex) = false;
  bool mNeedsShutdown MOZ_GUARDED_BY(mMutex) = false;
};

}  // namespace mozilla

#endif  // include_dom_media_ipc_RemoteMediaDataEncoder_h
