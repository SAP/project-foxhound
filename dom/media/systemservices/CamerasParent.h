/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_CamerasParent_h
#define mozilla_CamerasParent_h

#include "api/video/video_sink_interface.h"
#include "modules/video_capture/video_capture.h"
#include "modules/video_capture/video_capture_defines.h"
#include "mozilla/EventTargetCapability.h"
#include "mozilla/ShmemPool.h"
#include "mozilla/camera/PCamerasParent.h"
#include "mozilla/dom/MediaStreamTrackBinding.h"
#include "mozilla/ipc/Shmem.h"
#include "mozilla/media/MediaUtils.h"

class WebrtcLogSinkHandle;
class nsIThread;

namespace mozilla {
class DesktopCaptureInterface;
class VideoCaptureFactory;
}  // namespace mozilla

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
  Maybe<int> CaptureIdFor(int aStreamId, CamerasParent* aParent);
  int32_t StartStream(int aStreamId,
                      const webrtc::VideoCaptureCapability& aCapability,
                      const NormalizedConstraints& aConstraints,
                      const dom::VideoResizeModeEnum& aResizeMode);
  int32_t StopStream(int aStreamId);

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
    bool mActive{false};
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
  // The capture module of the associated source.
  const webrtc::scoped_refptr<webrtc::VideoCaptureModule> mCapturer;
  // The desktop capture interface should the associated source be a desktop
  // one.
  DesktopCaptureInterface* const mDesktopCapturer = nullptr;
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
                    webrtc::VideoCaptureModule* aCapturer,
                    DesktopCaptureInterface* aDesktopCapturer,
                    nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities);

  Maybe<webrtc::VideoCaptureCapability> CombinedCapability(
      const decltype(mStreams)::AutoLock& aStreamsGuard);

  int32_t UpdateDevice(const Maybe<webrtc::VideoCaptureCapability>& aState);

  MediaEventListener mCaptureEndedListener;
};

class DeliverFrameRunnable;

class CamerasParent : public PCamerasParent {
 public:
  using ShutdownMozPromise = media::ShutdownBlockingTicket::ShutdownMozPromise;

  using CameraAccessRequestPromise = MozPromise<CamerasAccessStatus, void_t,
                                                /* IsExclusive = */ false>;

  NS_INLINE_DECL_THREADSAFE_REFCOUNTING_WITH_DELETE_ON_EVENT_TARGET(
      CamerasParent, mPBackgroundEventTarget.GetEventTarget())

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

  bool IsWindowCapturing(uint64_t aWindowId, const nsACString& aUniqueId) const
      MOZ_REQUIRES(mVideoCaptureThread);
  nsIEventTarget* GetBackgroundEventTarget() {
    return mPBackgroundEventTarget.GetEventTarget();
  };
  ShmemBuffer GetBuffer(int aCaptureId, size_t aSize);

  // helper to forward to the PBackground thread
  virtual int DeliverFrameOverIPC(
      CaptureEngine aCapEngine, int aCaptureId,
      const Span<const int>& aStreamId, const TrackingId& aTrackingId,
      Variant<ShmemBuffer, webrtc::VideoFrame>&& aBuffer,
      const VideoFrameProperties& aProps) MOZ_REQUIRES(mPBackgroundEventTarget);

  CamerasParent();

 protected:
  virtual ~CamerasParent();

 private:
  struct GetOrCreateAggregatorResult {
    AggregateCapturer* mAggregator{};
    int mStreamId{};
  };
  GetOrCreateAggregatorResult GetOrCreateAggregator(
      CaptureEngine aEngine, uint64_t aWindowId, const nsCString& aUniqueId,
      nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities)
      MOZ_REQUIRES(mVideoCaptureThread);
  AggregateCapturer* GetAggregator(CaptureEngine aEngine, int aStreamId)
      MOZ_REQUIRES(mVideoCaptureThread);
  int ReleaseStream(CaptureEngine aEngine, int aStreamId)
      MOZ_REQUIRES(mVideoCaptureThread);

  nsTArray<webrtc::VideoCaptureCapability> const* EnsureCapabilitiesPopulated(
      CaptureEngine aEngine, const nsCString& aUniqueId)
      MOZ_REQUIRES(mVideoCaptureThread);

  void OnDeviceChange();

  // Creates a new DeviceInfo or returns an existing DeviceInfo for given
  // capture engine. Returns a nullptr in case capture engine failed to be
  // initialized.
  std::shared_ptr<webrtc::VideoCaptureModule::DeviceInfo> GetDeviceInfo(
      CaptureEngine aEngine) MOZ_REQUIRES(mVideoCaptureThread);
  VideoEngine* EnsureInitialized(CaptureEngine aEngine)
      MOZ_REQUIRES(mVideoCaptureThread);

  // Stops any ongoing capturing and releases resources. Idempotent.
  void CloseEngines() MOZ_REQUIRES(mVideoCaptureThread);

  void OnShutdown() MOZ_REQUIRES(mPBackgroundEventTarget);

  // If existent, blocks xpcom shutdown while alive.
  // Note that this makes a reference cycle that gets broken in ActorDestroy().
  const UniquePtr<media::ShutdownBlockingTicket> mShutdownBlocker;
  // Tracks the mShutdownBlocker shutdown handler.
  MozPromiseRequestHolder<ShutdownMozPromise> mShutdownRequest
      MOZ_GUARDED_BY(mPBackgroundEventTarget);

  // Local copy of sVideoCaptureThread. Guaranteed alive if non-null.
  const Maybe<EventTargetCapability<nsISerialEventTarget>> mVideoCaptureThread;

  // Reference to same VideoEngineArray as sEngines.
  const RefPtr<VideoEngineArray> mEngines MOZ_GUARDED_BY(*mVideoCaptureThread);

  // Reference to same array of AggregateCapturers as sAggregators. There is one
  // AggregateCapturer per allocated video capturer. It tracks the mapping from
  // capturer to streamIds and CamerasParent instances.
  const RefPtr<
      media::Refcountable<nsTArray<std::unique_ptr<AggregateCapturer>>>>
      mAggregators MOZ_GUARDED_BY(*mVideoCaptureThread);

  // Reference to same VideoCaptureFactory as sVideoCaptureFactory.
  const RefPtr<VideoCaptureFactory> mVideoCaptureFactory
      MOZ_GUARDED_BY(*mVideoCaptureThread);

  // Image buffers. One pool per CamerasParent instance and capture id (i.e.
  // unique source). Multiple CamerasParent instances capturing the same source
  // need distinct ShmemPools as ShmemBuffers are tied to the IPC channel.
  // Access is on the PBackground thread for mutations and
  // allocating shmem buffers, and on the callback thread (varies by capture
  // backend) for querying an existing pool for an available buffer.
  DataMutex<std::map<int, ShmemPool>> mShmemPools;

  // PBackgroundParent thread
  const EventTargetCapability<nsISerialEventTarget> mPBackgroundEventTarget;

  // Set to true in ActorDestroy.
  bool mDestroyed MOZ_GUARDED_BY(mPBackgroundEventTarget);

  // Set to true after one hop to mVideoCaptureThread from ActorDestroy.
  bool mDestroyedCaptureThread MOZ_GUARDED_BY(*mVideoCaptureThread);

  std::map<nsCString, nsTArray<webrtc::VideoCaptureCapability>>
      mAllCandidateCapabilities MOZ_GUARDED_BY(*mVideoCaptureThread);

  // Listener for the camera VideoEngine::DeviceChangeEvent().
  MediaEventListener mDeviceChangeEventListener
      MOZ_GUARDED_BY(*mVideoCaptureThread);
  bool mDeviceChangeEventListenerConnected
      MOZ_GUARDED_BY(*mVideoCaptureThread) = false;

  // While alive, ensure webrtc logging is hooked up to MOZ_LOG. Main thread
  // only.
  nsMainThreadPtrHandle<WebrtcLogSinkHandle> mLogHandle
      MOZ_GUARDED_BY(sMainThreadCapability);
};

}  // namespace mozilla::camera

#endif  // mozilla_CameraParent_h
