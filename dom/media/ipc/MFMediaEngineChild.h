/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_IPC_MFMEDIAENGINECHILD_H_
#define DOM_MEDIA_IPC_MFMEDIAENGINECHILD_H_

#include "ExternalEngineStateMachine.h"
#include "MFMediaEngineUtils.h"
#include "TimeUnits.h"
#include "mozilla/Atomics.h"
#include "mozilla/PMFMediaEngineChild.h"
#include "mozilla/NotNull.h"

namespace mozilla {

class MFMediaEngineWrapper;

/**
 * MFMediaEngineChild is a wrapper class for a MediaEngine in the content
 * process. It communicates with MFMediaEngineParent in the remote process by
 * using IPDL interfaces to send commands to the MediaEngine.
 * https://docs.microsoft.com/en-us/windows/win32/api/mfmediaengine/nn-mfmediaengine-imfmediaengine
 */
class MFMediaEngineChild final : public PMFMediaEngineChild {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(MFMediaEngineChild);

  MFMediaEngineChild(MFMediaEngineWrapper* aOwner,
                     FrameStatistics* aFrameStats);

  void OwnerDestroyed();
  void IPDLActorDestroyed();

  RefPtr<GenericNonExclusivePromise> Init(bool aShouldPreload);
  void Shutdown();

  // Methods for PMFMediaEngineChild
  mozilla::ipc::IPCResult RecvRequestSample(TrackInfo::TrackType aType,
                                            bool aIsEnough);
  mozilla::ipc::IPCResult RecvUpdateCurrentTime(double aCurrentTimeInSecond);
  mozilla::ipc::IPCResult RecvNotifyEvent(MFMediaEngineEvent aEvent);
  mozilla::ipc::IPCResult RecvNotifyError(const MediaResult& aError);
  mozilla::ipc::IPCResult RecvUpdateStatisticData(const StatisticData& aData);
  mozilla::ipc::IPCResult RecvNotifyResizing(uint32_t aWidth, uint32_t aHeight);

  nsISerialEventTarget* ManagerThread() { return mManagerThread; }
  void AssertOnManagerThread() const {
    MOZ_ASSERT(mManagerThread->IsOnCurrentThread());
  }

  uint64_t Id() const { return mMediaEngineId; }

 private:
  ~MFMediaEngineChild() = default;

  uint64_t GetUpdatedRenderedFrames(const StatisticData& aData);
  uint64_t GetUpdatedDroppedFrames(const StatisticData& aData);

  // Only modified on the manager thread.
  MFMediaEngineWrapper* MOZ_NON_OWNING_REF mOwner;

  const nsCOMPtr<nsISerialEventTarget> mManagerThread;

  // This represents an unique Id to indentify the media engine in the remote
  // process. Zero is used for the status before initializaing Id from the
  // remote process.
  // Modified on the manager thread, and read on other threads.
  Atomic<uint64_t> mMediaEngineId;

  RefPtr<MFMediaEngineChild> mIPDLSelfRef;

  MozPromiseHolder<GenericNonExclusivePromise> mInitPromiseHolder;
  MozPromiseRequestHolder<InitMediaEnginePromise> mInitEngineRequest;

  // This is guaranteed always being alive in our lifetime.
  NotNull<FrameStatistics*> const MOZ_NON_OWNING_REF mFrameStats;

  bool mShutdown = false;

  // Whenever the remote media engine process crashes, we will create a new
  // engine child to rebuild the connection. These engine child shares the same
  // frame stats data so we need to keep accumulate same data from previous
  // engine.
  Maybe<uint64_t> mAccumulatedPresentedFramesFromPrevEngine;
  Maybe<uint64_t> mAccumulatedDroppedFramesFromPrevEngine;
};

/**
 * MFMediaEngineWrapper acts as an external playback engine, which is
 * implemented by using the Media Foundation Media Engine. It holds hold an
 * actor used to communicate with the engine in the remote process. Its methods
 * are all thread-safe.
 */
class MFMediaEngineWrapper final : public ExternalPlaybackEngine {
 public:
  MFMediaEngineWrapper(ExternalEngineStateMachine* aOwner,
                       FrameStatistics* aFrameStats);
  ~MFMediaEngineWrapper();

  // Methods for ExternalPlaybackEngine
  RefPtr<GenericNonExclusivePromise> Init(bool aShouldPreload) override;
  void Play() override;
  void Pause() override;
  void Seek(const media::TimeUnit& aTargetTime) override;
  void Shutdown() override;
  void SetPlaybackRate(double aPlaybackRate) override;
  void SetVolume(double aVolume) override;
  void SetLooping(bool aLooping) override;
  void SetPreservesPitch(bool aPreservesPitch) override;
  media::TimeUnit GetCurrentPosition() override;
  void NotifyEndOfStream(TrackInfo::TrackType aType) override;
  uint64_t Id() const override { return mEngine->Id(); }
  void SetMediaInfo(const MediaInfo& aInfo) override;
  bool SetCDMProxy(CDMProxy* aProxy) override;
  void NotifyResizing(uint32_t aWidth, uint32_t aHeight) override;

  nsISerialEventTarget* ManagerThread() { return mEngine->ManagerThread(); }
  void AssertOnManagerThread() const { mEngine->AssertOnManagerThread(); }

 private:
  friend class MFMediaEngineChild;

  bool IsInited() const { return mEngine->Id() != 0; }
  void UpdateCurrentTime(double aCurrentTimeInSecond);
  void NotifyEvent(ExternalEngineEvent aEvent);
  void NotifyError(const MediaResult& aError);

  const RefPtr<MFMediaEngineChild> mEngine;

  // The current time which we receive from the MediaEngine or set by the state
  // machine when seeking.
  std::atomic<double> mCurrentTimeInSecond;
};

}  // namespace mozilla

#endif  // DOM_MEDIA_IPC_MFMEDIAENGINECHILD_H_
