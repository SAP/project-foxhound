/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef VideoSink_h_
#define VideoSink_h_

#include "FrameStatistics.h"
#include "ImageContainer.h"
#include "MediaEventSource.h"
#include "MediaSink.h"
#include "MediaTimer.h"
#include "VideoFrameContainer.h"
#include "mozilla/AbstractThread.h"
#include "mozilla/MozPromise.h"
#include "mozilla/RefPtr.h"
#include "mozilla/TimeStamp.h"

namespace mozilla {

class VideoFrameContainer;
template <class T>
class MediaQueue;

class VideoSink : public MediaSink {
  typedef mozilla::layers::ImageContainer::ProducerID ProducerID;

 public:
  VideoSink(AbstractThread* aThread, MediaSink* aAudioSink,
            MediaQueue<VideoData>& aVideoQueue, VideoFrameContainer* aContainer,
            FrameStatistics& aFrameStats, uint32_t aVQueueSentToCompositerSize);

  RefPtr<EndedPromise> OnEnded(TrackType aType) override;

  media::TimeUnit GetEndTime(TrackType aType) const override;

  media::TimeUnit GetPosition(TimeStamp* aTimeStamp = nullptr) override;

  bool HasUnplayedFrames(TrackType aType) const override;
  media::TimeUnit UnplayedDuration(TrackType aType) const override;

  void SetPlaybackRate(double aPlaybackRate) override;

  void SetVolume(double aVolume) override;

  void SetStreamName(const nsAString& aStreamName) override;

  void SetPreservesPitch(bool aPreservesPitch) override;

  void SetPlaying(bool aPlaying) override;

  RefPtr<GenericPromise> SetAudioDevice(
      RefPtr<AudioDeviceInfo> aDevice) override;

  double PlaybackRate() const override;

  void Redraw(const VideoInfo& aInfo) override;

  nsresult Start(const media::TimeUnit& aStartTime,
                 const MediaInfo& aInfo) override;

  void Stop() override;

  bool IsStarted() const override;

  bool IsPlaying() const override;

  void Shutdown() override;

  void SetSecondaryVideoContainer(VideoFrameContainer* aSecondary) override;

  void GetDebugInfo(dom::MediaSinkDebugInfo& aInfo) override;

 private:
  virtual ~VideoSink();

  // VideoQueue listener related.
  void OnVideoQueuePushed(RefPtr<VideoData>&& aSample);
  void OnVideoQueueFinished();
  void ConnectListener();
  void DisconnectListener();

  void EnsureHighResTimersOnOnlyIfPlaying();

  // Sets images and frame dimensions into the VideoFrameContainer. Called on
  // the shared state machine thread.
  // aClockTime and aClockTimeStamp are used as the baseline for deriving
  // timestamps for the frames.
  // If aFrames is empty, this does nothing.
  void RenderVideoFrames(Span<const RefPtr<VideoData>> aFrames,
                         int64_t aClockTime, const TimeStamp& aClockTimeStamp);

  // Triggered while videosink is started, videosink becomes "playing" status,
  // or VideoQueue event arrived.
  void TryUpdateRenderedVideoFrames();

  // If we have video, display a video frame if it's time for display has
  // arrived, otherwise sleep until it's time for the next frame. Update the
  // current frame time as appropriate, and trigger ready state update.
  // Called on the shared state machine thread.
  void UpdateRenderedVideoFrames();
  void UpdateRenderedVideoFramesByTimer();

  void MaybeResolveEndPromise();

  void AssertOwnerThread() const {
    MOZ_ASSERT(mOwnerThread->IsCurrentThreadIn());
  }

  MediaQueue<VideoData>& VideoQueue() const { return mVideoQueue; }

  const RefPtr<AbstractThread> mOwnerThread;
  const RefPtr<MediaSink> mAudioSink;
  MediaQueue<VideoData>& mVideoQueue;
  VideoFrameContainer* mContainer;
  RefPtr<VideoFrameContainer> mSecondaryContainer;

  // Producer ID to help ImageContainer distinguish different streams of
  // FrameIDs. A unique and immutable value per VideoSink.
  const ProducerID mProducerID;

  // Used to notify MediaDecoder's frame statistics
  FrameStatistics& mFrameStats;

  RefPtr<EndedPromise> mEndPromise;
  MozPromiseHolder<EndedPromise> mEndPromiseHolder;
  MozPromiseRequestHolder<EndedPromise> mVideoSinkEndRequest;

  // The presentation end time of the last video frame which has been displayed.
  media::TimeUnit mVideoFrameEndTime;

  // Total duration of sequential frames that have been dropped in this sink
  // without any sent to the compositor
  media::TimeUnit mDroppedInSinkSequenceDuration;
  // Accounting for frames dropped in the compositor
  uint32_t mOldCompositorDroppedCount;
  uint32_t mPendingDroppedCount;

  // Event listeners for VideoQueue
  MediaEventListener mPushListener;
  MediaEventListener mFinishListener;

  // True if this sink is going to handle video track.
  bool mHasVideo;

  // Used to trigger another update of rendered frames in next round.
  DelayedScheduler<TimeStamp> mUpdateScheduler;

  // Max frame number sent to compositor at a time.
  // Based on the pref value obtained in MDSM.
  const uint32_t mVideoQueueSendToCompositorSize;

#ifdef XP_WIN
  // Whether we've called timeBeginPeriod(1) to request high resolution
  // timers. We request high resolution timers when playback starts, and
  // turn them off when playback is paused. Enabling high resolution
  // timers can cause higher CPU usage and battery drain on Windows 7,
  // but reduces our frame drop rate.
  bool mHiResTimersRequested;
#endif

  RefPtr<layers::Image> mBlankImage;
  bool InitializeBlankImage();
};

}  // namespace mozilla

#endif
