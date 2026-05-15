/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=8 et ft=cpp : */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_CamerasParent_h
#define mozilla_CamerasParent_h

#include "api/video/video_sink_interface.h"
#include "modules/video_capture/video_capture.h"
#include "modules/video_capture/video_capture_defines.h"
#include "mozilla/ShmemPool.h"
#include "mozilla/camera/PCamerasParent.h"
#include "mozilla/dom/MediaStreamTrackBinding.h"
#include "mozilla/ipc/Shmem.h"
#include "mozilla/media/MediaUtils.h"

class WebrtcLogSinkHandle;
class nsIThread;

namespace mozilla {
class VideoCaptureFactory;
}

namespace mozilla::camera {

class CamerasParent;
class VideoEngine;

// Class that manages sharing of VideoCaptureImpl instances on top of
// VideoEngine. Sharing is needed as access to most sources is exclusive
// system-wide.
//
// There is at most one AggregateCapturer instance per unique source, as defined
// by its unique capture ID.
//
// There can be multiple requests for a stream from a source, as defined by
// unique stream IDs.
//
// Stream IDs and capture IDs use the same ID space. With capture happening in
// the parent process, application-wide uniqueness is guaranteed.
//
// When multiple stream requests have been made for a source, even across
// multiple CamerasParent instances, this class distributes a single frame to
// each CamerasParent instance that has requested a stream. Distribution to the
// various stream requests happens in CamerasChild::RecvDeliverFrame.
//
// This class similarly handles capture-ended events, and distributes them to
// the correct CamerasParent instances, with distribution to streams happening
// in CamerasChild::RecvCaptureEnded.
class AggregateCapturer final
    : public webrtc::VideoSinkInterface<webrtc::VideoFrame> {
 public:
  static std::unique_ptr<AggregateCapturer> Create(
      nsISerialEventTarget* aVideoCaptureThread, CaptureEngine aCapEng,
      VideoEngine* aEngine, const nsCString& aUniqueId, uint64_t aWindowId,
      nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities,
      CamerasParent* aParent);

  ~AggregateCapturer();

  void AddStream(CamerasParent* aParent, int aStreamId, uint64_t aWindowId);
  struct RemoveStreamResult {
    size_t mNumRemainingStreams;
    size_t mNumRemainingStreamsForParent;
  };
  RemoveStreamResult RemoveStream(int aStreamId);
  RemoveStreamResult RemoveStreamsFor(CamerasParent* aParent);
  Maybe<int> CaptureIdFor(int aStreamId);
  void SetConfigurationFor(int aStreamId,
                           const webrtc::VideoCaptureCapability& aCapability,
                           const NormalizedConstraints& aConstraints,
                           const dom::VideoResizeModeEnum& aResizeMode,
                           bool aStarted);
  Maybe<webrtc::VideoCaptureCapability> CombinedCapability();

  void OnCaptureEnded();
  void OnFrame(const webrtc::VideoFrame& aVideoFrame) override;

  struct Configuration {
    webrtc::VideoCaptureCapability mCapability;
    NormalizedConstraints mConstraints;
    // This is the effective resize mode, i.e. based on mConstraints and with
    // defaults factored in.
    dom::VideoResizeModeEnum mResizeMode{};
  };
  // Representation of a stream request for the source of this AggregateCapturer
  // instance.
  struct Stream {
    // The CamerasParent instance that requested this stream. mParent is
    // responsible for the lifetime of this stream.
    CamerasParent* const mParent;
    // The id that identifies this stream. This is unique within the application
    // session, in the same set of IDs as AggregateCapturer::mCaptureId.
    const int mId{-1};
    // The id of the window where the request for this stream originated.
    const uint64_t mWindowId{};
    // The configuration applied to this stream.
    Configuration mConfiguration;
    // Whether the stream has been started and not stopped. As opposed to
    // allocated and not deallocated, which controls the presence of this stream
    // altogether.
    bool mStarted{false};
    // The timestamp of the last frame sent to mParent for this stream.
    media::TimeUnit mLastFrameTime{media::TimeUnit::FromNegativeInfinity()};
  };
  // The video capture thread is where all access to this class must happen.
  const nsCOMPtr<nsISerialEventTarget> mVideoCaptureThread;
  // The identifier for which VideoEngine instance we are using, i.e. which type
  // of source we're associated with.
  const CaptureEngine mCapEngine;
  // The (singleton from sEngines) VideoEngine instance that mCaptureId is valid
  // in.
  const RefPtr<VideoEngine> mEngine;
  // The unique ID string of the associated device.
  const nsCString mUniqueId;
  // The id that identifies the capturer instance of the associated source
  // device in VideoEngine.
  const int mCaptureId;
  // Tracking ID of the capturer for profiler markers.
  const TrackingId mTrackingId;
  // The (immutable) list of capabilities offered by the associated source
  // device.
  const nsTArray<webrtc::VideoCaptureCapability> mCapabilities;
  // The list of streams that have been requested from all CamerasParent
  // instances for the associated source device.
  DataMutex<nsTArray<std::unique_ptr<Stream>>> mStreams;

 private:
  AggregateCapturer(nsISerialEventTarget* aVideoCaptureThread,
                    CaptureEngine aCapEng, VideoEngine* aEngine,
                    const nsCString& aUniqueId, int aCaptureId,
                    nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities);

  MediaEventListener mCaptureEndedListener;
};

class DeliverFrameRunnable;

class CamerasParent final : public PCamerasParent {
 public:
  using ShutdownMozPromise = media::ShutdownBlockingTicket::ShutdownMozPromise;

  using CameraAccessRequestPromise = MozPromise<CamerasAccessStatus, void_t,
                                                /* IsExclusive = */ false>;

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING_WITH_DELETE_ON_EVENT_TARGET(
      CamerasParent, mPBackgroundEventTarget)

  class VideoEngineArray;
  friend DeliverFrameRunnable;

  static already_AddRefed<CamerasParent> Create();

  /**
   * Request camera access
   *   Currently only used on desktop. If @value
   *   aAllowPermissionRequest is true, a request for full camera access may be
   *   made and the returned promise may be blocked on user input on a modal
   *   dialog. If @value aAllowPermissionRequest is false, only a request to
   *   check camera device presence will be made. If any camera device is
   *   present, we will enumerate a single placeholder device until a successful
   *   RequestCameraAccess with a true aAllowPermissionRequest.
   *   The returned promise will never be rejected.
   */
  static RefPtr<CameraAccessRequestPromise> RequestCameraAccess(
      bool aAllowPermissionRequest);

  // Messages received from the child. These run on the IPC/PBackground thread.
  mozilla::ipc::IPCResult RecvPCamerasConstructor();
  mozilla::ipc::IPCResult RecvAllocateCapture(
      const CaptureEngine& aCapEngine, const nsACString& aUniqueIdUTF8,
      const uint64_t& aWindowID) override;
  mozilla::ipc::IPCResult RecvReleaseCapture(const CaptureEngine& aCapEngine,
                                             const int& aStreamId) override;
  mozilla::ipc::IPCResult RecvNumberOfCaptureDevices(
      const CaptureEngine& aCapEngine) override;
  mozilla::ipc::IPCResult RecvNumberOfCapabilities(
      const CaptureEngine& aCapEngine, const nsACString& aUniqueId) override;
  mozilla::ipc::IPCResult RecvGetCaptureCapability(
      const CaptureEngine& aCapEngine, const nsACString& aUniqueId,
      const int& aIndex) override;
  mozilla::ipc::IPCResult RecvGetCaptureDevice(
      const CaptureEngine& aCapEngine, const int& aDeviceIndex) override;
  mozilla::ipc::IPCResult RecvStartCapture(
      const CaptureEngine& aCapEngine, const int& aStreamId,
      const VideoCaptureCapability& aIpcCaps,
      const NormalizedConstraints& aConstraints,
      const dom::VideoResizeModeEnum& aResizeMode) override;
  mozilla::ipc::IPCResult RecvFocusOnSelectedSource(
      const CaptureEngine& aCapEngine, const int& aStreamId) override;
  mozilla::ipc::IPCResult RecvStopCapture(const CaptureEngine& aCapEngine,
                                          const int& aStreamId) override;
  mozilla::ipc::IPCResult RecvReleaseFrame(
      const int& aCaptureId, mozilla::ipc::Shmem&& aShmem) override;
  void ActorDestroy(ActorDestroyReason aWhy) override;
  mozilla::ipc::IPCResult RecvEnsureInitialized(
      const CaptureEngine& aCapEngine) override;

  bool IsWindowCapturing(uint64_t aWindowId, const nsACString& aUniqueId) const;
  nsIEventTarget* GetBackgroundEventTarget() {
    return mPBackgroundEventTarget;
  };
  bool IsShuttingDown() {
    // the first 2 are pBackground only, the last is atomic
    MOZ_ASSERT(mPBackgroundEventTarget->IsOnCurrentThread());
    return mDestroyed;
  };
  ShmemBuffer GetBuffer(int aCaptureId, size_t aSize);

  // helper to forward to the PBackground thread
  int DeliverFrameOverIPC(CaptureEngine aCapEngine, int aCaptureId,
                          const Span<const int>& aStreamId,
                          const TrackingId& aTrackingId,
                          Variant<ShmemBuffer, webrtc::VideoFrame>&& aBuffer,
                          const VideoFrameProperties& aProps);

  CamerasParent();

 private:
  virtual ~CamerasParent();

  struct GetOrCreateCapturerResult {
    AggregateCapturer* mCapturer{};
    int mStreamId{};
  };
  GetOrCreateCapturerResult GetOrCreateCapturer(
      CaptureEngine aEngine, uint64_t aWindowId, const nsCString& aUniqueId,
      nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities);
  AggregateCapturer* GetCapturer(CaptureEngine aEngine, int aStreamId);
  int ReleaseStream(CaptureEngine aEngine, int aStreamId);

  nsTArray<webrtc::VideoCaptureCapability> const* EnsureCapabilitiesPopulated(
      CaptureEngine aEngine, const nsCString& aUniqueId);

  void OnDeviceChange();

  // Creates a new DeviceInfo or returns an existing DeviceInfo for given
  // capture engine. Returns a nullptr in case capture engine failed to be
  // initialized. Video capture thread only.
  std::shared_ptr<webrtc::VideoCaptureModule::DeviceInfo> GetDeviceInfo(
      int aEngine);
  VideoEngine* EnsureInitialized(int aEngine);

  // Stops any ongoing capturing and releases resources. Called on
  // mVideoCaptureThread. Idempotent.
  void CloseEngines();

  void OnShutdown();

  // If existent, blocks xpcom shutdown while alive.
  // Note that this makes a reference cycle that gets broken in ActorDestroy().
  const UniquePtr<media::ShutdownBlockingTicket> mShutdownBlocker;
  // Tracks the mShutdownBlocker shutdown handler. mPBackgroundEventTarget only.
  MozPromiseRequestHolder<ShutdownMozPromise> mShutdownRequest;

  // Local copy of sVideoCaptureThread. Guaranteed alive if non-null.
  const nsCOMPtr<nsISerialEventTarget> mVideoCaptureThread;

  // Reference to same VideoEngineArray as sEngines. Video capture thread only.
  const RefPtr<VideoEngineArray> mEngines;

  // Reference to same array of AggregateCapturers as sCapturers. There is one
  // AggregateCapturer per allocated video source. It tracks the mapping from
  // source to streamIds and CamerasParent instances. Video capture thread only.
  const RefPtr<
      media::Refcountable<nsTArray<std::unique_ptr<AggregateCapturer>>>>
      mCapturers;

  // Reference to same VideoCaptureFactory as sVideoCaptureFactory. Video
  // capture thread only.
  const RefPtr<VideoCaptureFactory> mVideoCaptureFactory;

  // Image buffers. One pool per CamerasParent instance and capture id (i.e.
  // unique source). Multiple CamerasParent instances capturing the same source
  // need distinct ShmemPools as ShmemBuffers are tied to the IPC channel.
  // Access is on the PBackground thread for mutations and
  // allocating shmem buffers, and on the callback thread (varies by capture
  // backend) for querying an existing pool for an available buffer.
  DataMutex<std::map<int, ShmemPool>> mShmemPools;

  // PBackgroundParent thread
  const nsCOMPtr<nsISerialEventTarget> mPBackgroundEventTarget;

  // Set to true in ActorDestroy. PBackground only.
  bool mDestroyed;

  std::map<nsCString, nsTArray<webrtc::VideoCaptureCapability>>
      mAllCandidateCapabilities;

  // Listener for the camera VideoEngine::DeviceChangeEvent(). Video capture
  // thread only.
  MediaEventListener mDeviceChangeEventListener;
  bool mDeviceChangeEventListenerConnected = false;

  // While alive, ensure webrtc logging is hooked up to MOZ_LOG. Main thread
  // only.
  nsMainThreadPtrHandle<WebrtcLogSinkHandle> mLogHandle;
};

}  // namespace mozilla::camera

#endif  // mozilla_CameraParent_h
