/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaEngineRemoteVideoSource.h"

#include "CamerasChild.h"
#include "ImageContainer.h"
#include "MediaManager.h"
#include "MediaTrackConstraints.h"
#include "PerformanceRecorder.h"
#include "VideoSegment.h"
#include "common_video/include/video_frame_buffer.h"
#include "common_video/libyuv/include/webrtc_libyuv.h"
#include "mozilla/ErrorNames.h"
#include "mozilla/RefPtr.h"
#include "mozilla/dom/MediaTrackCapabilitiesBinding.h"
#include "mozilla/dom/MediaTrackSettingsBinding.h"
#include "mozilla/gfx/Point.h"

namespace mozilla {

extern LazyLogModule gMediaManagerLog;
#define LOG(...) MOZ_LOG(gMediaManagerLog, LogLevel::Debug, (__VA_ARGS__))
#define LOG_FRAME(...) \
  MOZ_LOG(gMediaManagerLog, LogLevel::Verbose, (__VA_ARGS__))

using dom::MediaSourceEnum;
using dom::MediaTrackCapabilities;
using dom::MediaTrackConstraints;
using dom::MediaTrackConstraintSet;
using dom::MediaTrackSettings;
using dom::VideoFacingModeEnum;
using dom::VideoResizeModeEnum;

/* static */
camera::CaptureEngine MediaEngineRemoteVideoSource::CaptureEngine(
    MediaSourceEnum aMediaSource) {
  switch (aMediaSource) {
    case MediaSourceEnum::Browser:
      return camera::BrowserEngine;
    case MediaSourceEnum::Camera:
      return camera::CameraEngine;
    case MediaSourceEnum::Screen:
      return camera::ScreenEngine;
    case MediaSourceEnum::Window:
      return camera::WinEngine;
    default:
      MOZ_CRASH();
  }
}

static Maybe<VideoFacingModeEnum> GetFacingMode(const nsString& aDeviceName) {
  // Set facing mode based on device name.
#if defined(ANDROID)
  // Names are generated. Example: "Camera 0, Facing back, Orientation 90"
  //
  // See media/webrtc/trunk/webrtc/modules/video_capture/android/java/src/org/
  // webrtc/videoengine/VideoCaptureDeviceInfoAndroid.java

  if (aDeviceName.Find(u"Facing back"_ns) != kNotFound) {
    return Some(VideoFacingModeEnum::Environment);
  }
  if (aDeviceName.Find(u"Facing front"_ns) != kNotFound) {
    return Some(VideoFacingModeEnum::User);
  }
#endif  // ANDROID
#ifdef XP_WIN
  // The cameras' name of Surface book are "Microsoft Camera Front" and
  // "Microsoft Camera Rear" respectively.

  if (aDeviceName.Find(u"Front"_ns) != kNotFound) {
    return Some(VideoFacingModeEnum::User);
  }
  if (aDeviceName.Find(u"Rear"_ns) != kNotFound) {
    return Some(VideoFacingModeEnum::Environment);
  }
#endif  // WINDOWS

  return Nothing();
}

struct DesiredSizeInput {
  NormalizedConstraints mConstraints;
  Maybe<bool> mCanCropAndScale;
  Maybe<int32_t> mCapabilityWidth;
  Maybe<int32_t> mCapabilityHeight;
  camera::CaptureEngine mCapEngine;
  int32_t mInputWidth;
  int32_t mInputHeight;
  int32_t mRotation;
};

static gfx::IntSize CalculateDesiredSize(DesiredSizeInput aInput) {
  if (!aInput.mCanCropAndScale.valueOr(aInput.mCapEngine !=
                                       camera::CameraEngine)) {
    // Don't scale to constraints in resizeMode "none".
    // If resizeMode is disabled, follow our legacy behavior of downscaling for
    // screen capture but not for cameras.
    aInput.mConstraints.mWidth.mIdeal = Nothing();
    aInput.mConstraints.mHeight.mIdeal = Nothing();
  }

  if (aInput.mRotation == 90 || aInput.mRotation == 270) {
    // This frame is rotated, so what was negotiated as width is now height,
    // and vice versa.
    std::swap(aInput.mConstraints.mWidth, aInput.mConstraints.mHeight);
    std::swap(aInput.mCapabilityWidth, aInput.mCapabilityWidth);
  }

  // Account for a shared camera giving us higher resolution than we asked for.
  const int32_t inputWidth =
      std::max(2, aInput.mCapabilityWidth.valueOr(aInput.mInputWidth));
  const int32_t inputHeight =
      std::max(2, aInput.mCapabilityHeight.valueOr(aInput.mInputHeight));

  // This logic works for both camera and screen sharing case.
  // In VideoResizeModeEnum::None, ideal dimensions are absent.
  // In screen sharing, min and exact dimensions are forbidden.
  int32_t dst_width = aInput.mConstraints.mWidth.Get(inputWidth);
  int32_t dst_height = aInput.mConstraints.mHeight.Get(inputHeight);

  // We must not upscale.
  dst_width = std::min(dst_width, inputWidth);
  dst_height = std::min(dst_height, inputHeight);

  if (aInput.mCapEngine != camera::CameraEngine ||
      !aInput.mConstraints.mWidth.mIdeal ||
      !aInput.mConstraints.mHeight.mIdeal) {
    // Scale down without cropping.
    // Cropping is not allowed by spec for desktop capture.
    // For cameras, it only makes sense when not both ideal width and
    // height are given, assuming they're within min/max constraints.

    // Max constraints decide the envelope.
    const double scale_width_strict =
        std::min(1.0, AssertedCast<double>(aInput.mConstraints.mWidth.mMax) /
                          AssertedCast<double>(inputWidth));
    const double scale_height_strict =
        std::min(1.0, AssertedCast<double>(aInput.mConstraints.mHeight.mMax) /
                          AssertedCast<double>(inputHeight));

    double scale_width =
        AssertedCast<double>(dst_width) / AssertedCast<double>(inputWidth);
    double scale_height =
        AssertedCast<double>(dst_height) / AssertedCast<double>(inputHeight);

    // If both ideal width & ideal height are absent, scale is 1, but
    // if one is present and the other not, scale precisely to the one present.
    // If both are present, scale to the smaller one.
    // This works because the fitness distance for width and height is shortest
    // where either dimension exactly matches its ideal constraint.
    // Also adapt to max constraints.
    double scale = std::min(
        {scale_width, scale_height, scale_width_strict, scale_height_strict});

    dst_width = SaturatingCast<int32_t>(
        std::round(scale * AssertedCast<double>(inputWidth)));
    dst_height = SaturatingCast<int32_t>(
        std::round(scale * AssertedCast<double>(inputHeight)));
  }

  if (aInput.mCapEngine == camera::CameraEngine) {
    // For cameras we are allowed to crop. Adapt to min constraints.
    dst_width = aInput.mConstraints.mWidth.Clamp(dst_width);
    dst_height = aInput.mConstraints.mHeight.Clamp(dst_height);
  }

  // Ensure width and height are at least two. Smaller frames can lead to
  // problems with scaling and video encoding.
  dst_width = std::max(2, dst_width);
  dst_height = std::max(2, dst_height);

  return {dst_width, dst_height};
}

MediaEngineRemoteVideoSource::MediaEngineRemoteVideoSource(
    const MediaDevice* aMediaDevice)
    : mCapEngine(CaptureEngine(aMediaDevice->mMediaSource)),
      mTrackingId(CaptureEngineToTrackingSourceStr(mCapEngine), 0),
      mMutex("MediaEngineRemoteVideoSource::mMutex"),
      mRescalingBufferPool(/* zero_initialize */ false,
                           /* max_number_of_buffers */ 1),
      mSettingsUpdatedByFrame(MakeAndAddRef<media::Refcountable<AtomicBool>>()),
      mSettings(MakeAndAddRef<media::Refcountable<MediaTrackSettings>>()),
      mTrackCapabilities(
          MakeAndAddRef<media::Refcountable<MediaTrackCapabilities>>()),
      mFirstFramePromise(mFirstFramePromiseHolder.Ensure(__func__)),
      mCalculation(kFitness),
      mPrefs(MakeUnique<MediaEnginePrefs>()),
      mMediaDevice(aMediaDevice),
      mDeviceUUID(NS_ConvertUTF16toUTF8(aMediaDevice->mRawID)) {
  LOG("%s", __PRETTY_FUNCTION__);
  if (mCapEngine == camera::CameraEngine) {
    // Only cameras can have a facing mode.
    Maybe<VideoFacingModeEnum> facingMode =
        GetFacingMode(mMediaDevice->mRawName);
    if (facingMode.isSome()) {
      mFacingMode.emplace(
          NS_ConvertASCIItoUTF16(dom::GetEnumString(*facingMode)));
    }
  }
}

/*static*/
already_AddRefed<MediaEngineRemoteVideoSource>
MediaEngineRemoteVideoSource::CreateFrom(
    const MediaEngineRemoteVideoSource* aSource,
    const MediaDevice* aMediaDevice) {
  auto src = MakeRefPtr<MediaEngineRemoteVideoSource>(aMediaDevice);
  *static_cast<MediaTrackSettings*>(src->mSettings) = *aSource->mSettings;
  *static_cast<MediaTrackCapabilities*>(src->mTrackCapabilities) =
      *aSource->mTrackCapabilities;
  {
    MutexAutoLock lock(aSource->mMutex);
    src->mIncomingImageSize = aSource->mIncomingImageSize;
  }
  return src.forget();
}

MediaEngineRemoteVideoSource::~MediaEngineRemoteVideoSource() {
  mFirstFramePromiseHolder.RejectIfExists(NS_ERROR_ABORT, __func__);
}

static inline DistanceCalculation ToDistanceCalculation(
    VideoResizeModeEnum aMode) {
  switch (aMode) {
    case VideoResizeModeEnum::None:
      return kFitness;
    case VideoResizeModeEnum::Crop_and_scale:
      return kFeasibility;
  }
  MOZ_CRASH("Unexpected resize mode");
}

static inline const char* ToString(DistanceCalculation aMode) {
  switch (aMode) {
    case kFitness:
      return "kFitness";
    case kFeasibility:
      return "kFeasibility";
  }
  MOZ_CRASH("Unexpected distance calculation");
}

nsresult MediaEngineRemoteVideoSource::Allocate(
    const MediaTrackConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
    uint64_t aWindowID, const char** aOutBadConstraint) {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  MOZ_ASSERT(mState == kReleased);

  NormalizedConstraints c(aConstraints);
  const auto resizeMode = MediaConstraintsHelper::GetResizeMode(c, aPrefs);
  const auto distanceMode =
      resizeMode.map(&ToDistanceCalculation).valueOr(kFitness);
  webrtc::CaptureCapability newCapability;
  LOG("ChooseCapability(%s) for mCapability (Allocate) ++",
      ToString(distanceMode));
  if (!ChooseCapability(c, aPrefs, newCapability, distanceMode,
                        aOutBadConstraint)) {
    if (aOutBadConstraint && !*aOutBadConstraint) {
      *aOutBadConstraint =
          MediaConstraintsHelper::FindBadConstraint(c, aPrefs, mMediaDevice);
    }
    return NS_ERROR_FAILURE;
  }
  LOG("ChooseCapability(%s) for mCapability (Allocate) --",
      ToString(distanceMode));

  mCaptureId =
      camera::GetChildAndCall(&camera::CamerasChild::AllocateCapture,
                              mCapEngine, mDeviceUUID.get(), aWindowID);
  if (mCaptureId < 0) {
    return NS_ERROR_FAILURE;
  }

  DesiredSizeInput input{};
  double framerate = 0.0;
  {
    MutexAutoLock lock(mMutex);
    mState = kAllocated;
    mCapability = newCapability;
    mCalculation = distanceMode;
    mConstraints = Some(c);
    *mPrefs = aPrefs;
    mTrackingId =
        TrackingId(CaptureEngineToTrackingSourceStr(mCapEngine), mCaptureId);
    const int32_t& cw = mCapability.width;
    const int32_t& ch = mCapability.height;
    const double maxFPS = AssertedCast<double>(mCapability.maxFPS);
    input = {
        .mConstraints = c,
        .mCanCropAndScale = resizeMode.map([](auto aRM) {
          return aRM == dom::VideoResizeModeEnum::Crop_and_scale;
        }),
        .mCapabilityWidth = cw ? Some(cw) : Nothing(),
        .mCapabilityHeight = ch ? Some(ch) : Nothing(),
        .mCapEngine = mCapEngine,
        .mInputWidth = cw ? cw : mIncomingImageSize.width,
        .mInputHeight = ch ? ch : mIncomingImageSize.height,
        .mRotation = 0,
    };
    framerate = input.mCanCropAndScale.valueOr(false)
                    ? std::min(mConstraints->mFrameRate.Get(maxFPS), maxFPS)
                    : maxFPS;
  }

  auto dstSize = CalculateDesiredSize(input);

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "MediaEngineRemoteVideoSource::Allocate::MainUpdate",
      [settings = mSettings, caps = mTrackCapabilities, dstSize, framerate,
       facingMode = mFacingMode, resizeMode]() {
        *settings = dom::MediaTrackSettings();

        settings->mWidth.Construct(dstSize.width);
        settings->mHeight.Construct(dstSize.height);
        settings->mFrameRate.Construct(framerate);

        caps->mFacingMode.Reset();
        if (facingMode) {
          settings->mFacingMode.Construct(*facingMode);
          caps->mFacingMode.Construct(nsTArray{*facingMode});
        }

        caps->mResizeMode.Reset();
        if (resizeMode) {
          nsString noneString, cropString;
          noneString.AssignASCII(dom::GetEnumString(VideoResizeModeEnum::None));
          cropString.AssignASCII(
              dom::GetEnumString(VideoResizeModeEnum::Crop_and_scale));
          settings->mResizeMode.Construct(
              *resizeMode == VideoResizeModeEnum::Crop_and_scale ? cropString
                                                                 : noneString);
          caps->mResizeMode.Construct(nsTArray{noneString, cropString});
        }
      }));

  LOG("Video device %d allocated", mCaptureId);
  return NS_OK;
}

nsresult MediaEngineRemoteVideoSource::Deallocate() {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  MOZ_ASSERT(mState == kStopped || mState == kAllocated);

  if (mTrack) {
    mTrack->End();
  }

  {
    MutexAutoLock lock(mMutex);

    mTrack = nullptr;
    mPrincipal = PRINCIPAL_HANDLE_NONE;
    mState = kReleased;
  }

  // Stop() has stopped capture synchronously on the media thread before we get
  // here, so there are no longer any callbacks on an IPC thread accessing
  // mImageContainer or mRescalingBufferPool.
  mImageContainer = nullptr;
  mRescalingBufferPool.Release();

  LOG("Video device %d deallocated", mCaptureId);

  int error = camera::GetChildAndCall(&camera::CamerasChild::ReleaseCapture,
                                      mCapEngine, mCaptureId);

  if (error == camera::kSuccess) {
    return NS_OK;
  }

  if (error == camera::kIpcError) {
    // Failure can occur when the parent process is shutting down, and the IPC
    // channel is down. We still consider the capturer deallocated in this
    // case, since it cannot deliver frames without the IPC channel open.
    return NS_OK;
  }

  MOZ_ASSERT(error == camera::kError);
  return NS_ERROR_FAILURE;
}

void MediaEngineRemoteVideoSource::SetTrack(const RefPtr<MediaTrack>& aTrack,
                                            const PrincipalHandle& aPrincipal) {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  MOZ_ASSERT(mState == kAllocated);
  MOZ_ASSERT(!mTrack);
  MOZ_ASSERT(aTrack);
  MOZ_ASSERT(aTrack->AsSourceTrack());

  if (!mImageContainer) {
    mImageContainer = MakeAndAddRef<layers::ImageContainer>(
        layers::ImageUsageType::Webrtc, layers::ImageContainer::ASYNCHRONOUS);
  }

  {
    MutexAutoLock lock(mMutex);
    mTrack = aTrack->AsSourceTrack();
    mPrincipal = aPrincipal;
  }
}

nsresult MediaEngineRemoteVideoSource::Start() {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  MOZ_ASSERT(mState == kAllocated || mState == kStarted || mState == kStopped);
  MOZ_ASSERT(mTrack);

  NormalizedConstraints constraints;
  {
    MutexAutoLock lock(mMutex);
    mState = kStarted;
    constraints = *mConstraints;
  }

  // Tell CamerasParent what resizeMode was selected, as it doesn't have access
  // to MediaEnginePrefs.
  const auto resizeMode = mCalculation == kFeasibility
                              ? VideoResizeModeEnum::Crop_and_scale
                              : VideoResizeModeEnum::None;
  const auto resizeModeString =
      NS_ConvertASCIItoUTF16(dom::GetEnumString(resizeMode));
  constraints.mResizeMode.mIdeal.clear();
  constraints.mResizeMode.mIdeal.insert(resizeModeString);

  nsresult rv = StartCapture(constraints, resizeMode);
  mSettingsUpdatedByFrame->mValue = false;
  return rv;
}

nsresult MediaEngineRemoteVideoSource::StartCapture(
    const NormalizedConstraints& aConstraints,
    const dom::VideoResizeModeEnum& aResizeMode) {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  MOZ_ASSERT(mState == kStarted);

  if (camera::GetChildAndCall(&camera::CamerasChild::StartCapture, mCapEngine,
                              mCaptureId, mCapability, aConstraints,
                              aResizeMode, this)) {
    LOG("StartCapture failed");
    MutexAutoLock lock(mMutex);
    mState = kStopped;
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

nsresult MediaEngineRemoteVideoSource::FocusOnSelectedSource() {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  int result;
  result = camera::GetChildAndCall(&camera::CamerasChild::FocusOnSelectedSource,
                                   mCapEngine, mCaptureId);
  return result == 0 ? NS_OK : NS_ERROR_FAILURE;
}

nsresult MediaEngineRemoteVideoSource::Stop() {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  if (mState == kStopped || mState == kAllocated) {
    return NS_OK;
  }

  MOZ_ASSERT(mState == kStarted);

  int error = camera::GetChildAndCall(&camera::CamerasChild::StopCapture,
                                      mCapEngine, mCaptureId);

  if (error == camera::kError) {
    // CamerasParent replied with error. The capturer is still running.
    return NS_ERROR_FAILURE;
  }

  {
    MutexAutoLock lock(mMutex);
    mState = kStopped;
  }

  if (error == camera::kSuccess) {
    return NS_OK;
  }

  MOZ_ASSERT(error == camera::kIpcError);
  // Failure can occur when the parent process is shutting down, and the IPC
  // channel is down. We still consider the capturer stopped in this case,
  // since it cannot deliver frames without the IPC channel open.
  return NS_ERROR_FAILURE;
}

nsresult MediaEngineRemoteVideoSource::Reconfigure(
    const MediaTrackConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
    const char** aOutBadConstraint) {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  NormalizedConstraints c(aConstraints);
  const auto resizeMode = MediaConstraintsHelper::GetResizeMode(c, aPrefs);
  const auto distanceMode =
      resizeMode.map(&ToDistanceCalculation).valueOr(kFitness);
  webrtc::CaptureCapability newCapability;
  LOG("ChooseCapability(%s) for mTargetCapability (Reconfigure) ++",
      ToString(distanceMode));
  if (!ChooseCapability(c, aPrefs, newCapability, distanceMode,
                        aOutBadConstraint)) {
    if (aOutBadConstraint && !*aOutBadConstraint) {
      *aOutBadConstraint =
          MediaConstraintsHelper::FindBadConstraint(c, aPrefs, mMediaDevice);
    }
    return NS_ERROR_INVALID_ARG;
  }
  LOG("ChooseCapability(%s) for mTargetCapability (Reconfigure) --",
      ToString(distanceMode));

  bool needsRestart{};
  DesiredSizeInput input{};
  double framerate = 0.0;
  {
    MutexAutoLock lock(mMutex);

    needsRestart = mCapability != newCapability || mConstraints != Some(c) ||
                   !(*mPrefs == aPrefs);

    // StartCapture() applies mCapability on the device.
    mCapability = newCapability;
    mCalculation = distanceMode;
    mConstraints = Some(c);
    *mPrefs = aPrefs;
    const int32_t& cw = mCapability.width;
    const int32_t& ch = mCapability.height;
    input = {
        .mConstraints = c,
        .mCanCropAndScale = resizeMode.map([](auto aRM) {
          return aRM == dom::VideoResizeModeEnum::Crop_and_scale;
        }),
        .mCapabilityWidth = cw ? Some(cw) : Nothing(),
        .mCapabilityHeight = ch ? Some(ch) : Nothing(),
        .mCapEngine = mCapEngine,
        .mInputWidth = cw ? cw : mIncomingImageSize.width,
        .mInputHeight = ch ? ch : mIncomingImageSize.height,
        .mRotation = 0,
    };
    framerate = distanceMode == kFeasibility
                    ? std::min(mConstraints->mFrameRate.Get(mCapability.maxFPS),
                               AssertedCast<double>(mCapability.maxFPS))
                    : mCapability.maxFPS;
  }

  if (mState == kStarted && needsRestart) {
    nsresult rv =
        StartCapture(c, resizeMode.valueOr(dom::VideoResizeModeEnum::None));
    if (NS_WARN_IF(NS_FAILED(rv))) {
      nsAutoCString name;
      GetErrorName(rv, name);
      LOG("Video source %p for video device %d Reconfigure() failed "
          "unexpectedly in Start(). rv=%s",
          this, mCaptureId, name.Data());
      return NS_ERROR_UNEXPECTED;
    }
  }

  mSettingsUpdatedByFrame->mValue = false;
  gfx::IntSize dstSize = CalculateDesiredSize(input);
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      __func__,
      [settings = mSettings, updated = mSettingsUpdatedByFrame, dstSize,
       framerate, resizeModeEnabled = mPrefs->mResizeModeEnabled,
       distanceMode]() mutable {
        const bool cropAndScale = distanceMode == kFeasibility;
        if (!updated->mValue) {
          settings->mWidth.Value() = dstSize.width;
          settings->mHeight.Value() = dstSize.height;
        }
        settings->mFrameRate.Value() = framerate;
        if (resizeModeEnabled) {
          auto resizeMode = cropAndScale ? VideoResizeModeEnum::Crop_and_scale
                                         : VideoResizeModeEnum::None;
          settings->mResizeMode.Reset();
          settings->mResizeMode.Construct(
              NS_ConvertASCIItoUTF16(dom::GetEnumString(resizeMode)));
        }
      }));

  return NS_OK;
}

size_t MediaEngineRemoteVideoSource::NumCapabilities() const {
  AssertIsOnOwningThread();

  if (!mCapabilities.IsEmpty()) {
    return mCapabilities.Length();
  }

  int num = camera::GetChildAndCall(&camera::CamerasChild::NumberOfCapabilities,
                                    mCapEngine, mDeviceUUID.get());
  if (num > 0) {
    mCapabilities.SetLength(num);
  } else {
    // The default for devices that don't return discrete capabilities: treat
    // them as supporting all capabilities orthogonally. E.g. screensharing.
    // CaptureCapability defaults key values to 0, which means accept any value.
    mCapabilities.AppendElement(MakeUnique<webrtc::CaptureCapability>());
    mCapabilitiesAreHardcoded = true;
  }

  return mCapabilities.Length();
}

webrtc::CaptureCapability& MediaEngineRemoteVideoSource::GetCapability(
    size_t aIndex) const {
  AssertIsOnOwningThread();
  MOZ_RELEASE_ASSERT(aIndex < mCapabilities.Length());
  if (!mCapabilities[aIndex]) {
    mCapabilities[aIndex] = MakeUnique<webrtc::CaptureCapability>();
    camera::GetChildAndCall(&camera::CamerasChild::GetCaptureCapability,
                            mCapEngine, mDeviceUUID.get(), aIndex,
                            mCapabilities[aIndex].get());
  }
  return *mCapabilities[aIndex];
}

const TrackingId& MediaEngineRemoteVideoSource::GetTrackingId() const {
  AssertIsOnOwningThread();
  MOZ_ASSERT(mState != kReleased);
  return mTrackingId;
}

void MediaEngineRemoteVideoSource::OnCaptureEnded() {
  mFirstFramePromiseHolder.RejectIfExists(NS_ERROR_UNEXPECTED, __func__);
  mCaptureEndedEvent.Notify();
}

int MediaEngineRemoteVideoSource::DeliverFrame(
    uint8_t* aBuffer, const camera::VideoFrameProperties& aProps) {
  // Cameras IPC thread - take great care with accessing members!

  DesiredSizeInput input{};
  {
    MutexAutoLock lock(mMutex);
    MOZ_ASSERT(mState == kStarted);
    mIncomingImageSize = {aProps.width(), aProps.height()};
    const int32_t& cw = mCapability.width;
    const int32_t& ch = mCapability.height;

    input = {
        .mConstraints = *mConstraints,
        .mCanCropAndScale = mPrefs->mResizeModeEnabled
                                ? Some(mCalculation == kFeasibility)
                                : Nothing(),
        .mCapabilityWidth = cw ? Some(cw) : Nothing(),
        .mCapabilityHeight = ch ? Some(ch) : Nothing(),
        .mCapEngine = mCapEngine,
        .mInputWidth = aProps.width(),
        .mInputHeight = aProps.height(),
        .mRotation = aProps.rotation(),
    };
    if (!mFrameDeliveringTrackingId) {
      mFrameDeliveringTrackingId = Some(mTrackingId);
    }
  }

  gfx::IntSize dstSize = CalculateDesiredSize(input);

  std::function<void()> callback_unused = []() {};
  webrtc::scoped_refptr<webrtc::I420BufferInterface> buffer =
      webrtc::WrapI420Buffer(
          aProps.width(), aProps.height(), aBuffer, aProps.yStride(),
          aBuffer + aProps.yAllocatedSize(), aProps.uStride(),
          aBuffer + aProps.yAllocatedSize() + aProps.uAllocatedSize(),
          aProps.vStride(), callback_unused);

  if ((dstSize.width != aProps.width() || dstSize.height != aProps.height()) &&
      dstSize.width <= aProps.width() && dstSize.height <= aProps.height()) {
    PerformanceRecorder<CopyVideoStage> rec("MERVS::CropAndScale"_ns,
                                            *mFrameDeliveringTrackingId,
                                            dstSize.width, dstSize.height);
    // Destination resolution is smaller than source buffer. We'll rescale.
    webrtc::scoped_refptr<webrtc::I420Buffer> scaledBuffer =
        mRescalingBufferPool.CreateI420Buffer(dstSize.width, dstSize.height);
    if (!scaledBuffer) {
      MOZ_ASSERT_UNREACHABLE(
          "We might fail to allocate a buffer, but with this "
          "being a recycling pool that shouldn't happen");
      return 0;
    }
    scaledBuffer->CropAndScaleFrom(*buffer);
    buffer = scaledBuffer;
    rec.Record();
  }

  layers::PlanarYCbCrData data;
  data.mYChannel = const_cast<uint8_t*>(buffer->DataY());
  data.mYStride = buffer->StrideY();
  MOZ_ASSERT(buffer->StrideU() == buffer->StrideV());
  data.mCbCrStride = buffer->StrideU();
  data.mCbChannel = const_cast<uint8_t*>(buffer->DataU());
  data.mCrChannel = const_cast<uint8_t*>(buffer->DataV());
  data.mPictureRect = gfx::IntRect(0, 0, buffer->width(), buffer->height());
  data.mYUVColorSpace = gfx::YUVColorSpace::BT601;
  data.mChromaSubsampling = gfx::ChromaSubsampling::HALF_WIDTH_AND_HEIGHT;

  RefPtr<layers::PlanarYCbCrImage> image;
  {
    PerformanceRecorder<CopyVideoStage> rec("MERVS::Copy"_ns,
                                            *mFrameDeliveringTrackingId,
                                            dstSize.width, dstSize.height);
    image = mImageContainer->CreatePlanarYCbCrImage();
    if (NS_FAILED(image->CopyData(data))) {
      MOZ_ASSERT_UNREACHABLE(
          "We might fail to allocate a buffer, but with this "
          "being a recycling container that shouldn't happen");
      return 0;
    }
    rec.Record();
  }

#ifdef DEBUG
  static uint32_t frame_num = 0;
  LOG_FRAME(
      "frame %d (%dx%d)->(%dx%d); rotation %d, rtpTimeStamp %u, ntpTimeMs "
      "%" PRIu64 ", renderTimeMs %" PRIu64,
      frame_num++, aProps.width(), aProps.height(), dstSize.width,
      dstSize.height, aProps.rotation(), aProps.rtpTimeStamp(),
      aProps.ntpTimeMs(), aProps.renderTimeMs());
#endif

  if (mScaledImageSize != dstSize) {
    NS_DispatchToMainThread(NS_NewRunnableFunction(
        "MediaEngineRemoteVideoSource::FrameSizeChange",
        [settings = mSettings, updated = mSettingsUpdatedByFrame,
         holder = std::move(mFirstFramePromiseHolder), dstSize]() mutable {
          settings->mWidth.Value() = dstSize.width;
          settings->mHeight.Value() = dstSize.height;
          updated->mValue = true;
          // Since mImageSize was initialized to (0,0), we end up here on the
          // arrival of the first frame. We resolve the promise representing
          // arrival of first frame, after correct settings values have been
          // made available (Resolve() is idempotent if already resolved).
          holder.ResolveIfExists(true, __func__);
        }));
  }

  {
    MutexAutoLock lock(mMutex);
    MOZ_ASSERT(mState == kStarted);
    VideoSegment segment;
    mScaledImageSize = image->GetSize();
    segment.AppendWebrtcLocalFrame(image.forget(), mScaledImageSize, mPrincipal,
                                   /* aForceBlack */ false, TimeStamp::Now(),
                                   aProps.captureTime());
    mTrack->AppendData(&segment);
  }

  return 0;
}

uint32_t MediaEngineRemoteVideoSource::GetDistance(
    const webrtc::CaptureCapability& aCandidate,
    const NormalizedConstraintSet& aConstraints,
    const DistanceCalculation aCalculate) const {
  if (aCalculate == kFeasibility) {
    return GetFeasibilityDistance(aCandidate, aConstraints);
  }
  return GetFitnessDistance(aCandidate, aConstraints);
}

uint32_t MediaEngineRemoteVideoSource::GetFitnessDistance(
    const webrtc::CaptureCapability& aCandidate,
    const NormalizedConstraintSet& aConstraints) const {
  AssertIsOnOwningThread();

  // Treat width|height|frameRate == 0 on capability as "can do any".
  // This allows for orthogonal capabilities that are not in discrete steps.

  typedef MediaConstraintsHelper H;
  uint64_t distance =
      uint64_t(H::FitnessDistance(mFacingMode, aConstraints.mFacingMode)) +
      uint64_t(aCandidate.width ? H::FitnessDistance(int32_t(aCandidate.width),
                                                     aConstraints.mWidth)
                                : 0) +
      uint64_t(aCandidate.height
                   ? H::FitnessDistance(int32_t(aCandidate.height),
                                        aConstraints.mHeight)
                   : 0) +
      uint64_t(aCandidate.maxFPS ? H::FitnessDistance(double(aCandidate.maxFPS),
                                                      aConstraints.mFrameRate)
                                 : 0);
  return uint32_t(std::min(distance, uint64_t(UINT32_MAX)));
}

uint32_t MediaEngineRemoteVideoSource::GetFeasibilityDistance(
    const webrtc::CaptureCapability& aCandidate,
    const NormalizedConstraintSet& aConstraints) const {
  AssertIsOnOwningThread();

  // Treat width|height|frameRate == 0 on capability as "can do any".
  // This allows for orthogonal capabilities that are not in discrete steps.

  typedef MediaConstraintsHelper H;
  uint64_t distance =
      uint64_t(H::FitnessDistance(mFacingMode, aConstraints.mFacingMode)) +
      uint64_t(aCandidate.width
                   ? H::FeasibilityDistance(int32_t(aCandidate.width),
                                            aConstraints.mWidth)
                   : 0) +
      uint64_t(aCandidate.height
                   ? H::FeasibilityDistance(int32_t(aCandidate.height),
                                            aConstraints.mHeight)
                   : 0) +
      uint64_t(aCandidate.maxFPS
                   ? H::FeasibilityDistance(double(aCandidate.maxFPS),
                                            aConstraints.mFrameRate)
                   : 0);
  return uint32_t(std::min(distance, uint64_t(UINT32_MAX)));
}

// Find best capability by removing inferiors. May leave >1 of equal distance

/* static */
void MediaEngineRemoteVideoSource::TrimLessFitCandidates(
    nsTArray<CapabilityCandidate>& aSet) {
  uint32_t best = UINT32_MAX;
  for (auto& candidate : aSet) {
    if (best > candidate.mDistance) {
      best = candidate.mDistance;
    }
  }
  aSet.RemoveElementsBy(
      [best](const auto& set) { return set.mDistance > best; });
  MOZ_ASSERT(aSet.Length());
}

uint32_t MediaEngineRemoteVideoSource::GetBestFitnessDistance(
    const nsTArray<const NormalizedConstraintSet*>& aConstraintSets,
    const MediaEnginePrefs& aPrefs) const {
  AssertIsOnOwningThread();

  size_t num = NumCapabilities();
  nsTArray<CapabilityCandidate> candidateSet;
  for (size_t i = 0; i < num; i++) {
    candidateSet.AppendElement(CapabilityCandidate(GetCapability(i)));
  }

  bool first = true;
  for (const NormalizedConstraintSet* ns : aConstraintSets) {
    auto mode = MediaConstraintsHelper::GetResizeMode(*ns, aPrefs)
                    .map(&ToDistanceCalculation)
                    .valueOr(kFitness);
    for (size_t i = 0; i < candidateSet.Length();) {
      auto& candidate = candidateSet[i];
      uint32_t distance = GetDistance(candidate.mCapability, *ns, mode);
      if (distance == UINT32_MAX) {
        candidateSet.RemoveElementAt(i);
      } else {
        ++i;
        if (first) {
          candidate.mDistance = distance;
        }
      }
    }
    first = false;
  }
  if (!candidateSet.Length()) {
    return UINT32_MAX;
  }
  TrimLessFitCandidates(candidateSet);
  return candidateSet[0].mDistance;
}

static const char* ConvertVideoTypeToCStr(webrtc::VideoType aType) {
  switch (aType) {
    case webrtc::VideoType::kI420:
      return "I420";
    case webrtc::VideoType::kIYUV:
    case webrtc::VideoType::kYV12:
      return "YV12";
    case webrtc::VideoType::kRGB24:
      return "24BG";
    case webrtc::VideoType::kABGR:
      return "ABGR";
    case webrtc::VideoType::kARGB:
      return "ARGB";
    case webrtc::VideoType::kARGB4444:
      return "R444";
    case webrtc::VideoType::kRGB565:
      return "RGBP";
    case webrtc::VideoType::kARGB1555:
      return "RGBO";
    case webrtc::VideoType::kYUY2:
      return "YUY2";
    case webrtc::VideoType::kUYVY:
      return "UYVY";
    case webrtc::VideoType::kMJPEG:
      return "MJPG";
    case webrtc::VideoType::kNV21:
      return "NV21";
    case webrtc::VideoType::kNV12:
      return "NV12";
    case webrtc::VideoType::kBGRA:
      return "BGRA";
    case webrtc::VideoType::kUnknown:
    default:
      return "unknown";
  }
}

static void LogCapability(const char* aHeader,
                          const webrtc::CaptureCapability& aCapability,
                          uint32_t aDistance) {
  LOG("%s: %4u x %4u x %2u maxFps, %s. Distance = %" PRIu32, aHeader,
      aCapability.width, aCapability.height, aCapability.maxFPS,
      ConvertVideoTypeToCStr(aCapability.videoType), aDistance);
}

bool MediaEngineRemoteVideoSource::ChooseCapability(
    const NormalizedConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
    webrtc::CaptureCapability& aCapability,
    const DistanceCalculation aCalculate, const char** aOutBadConstraint) {
  LOG("%s", __PRETTY_FUNCTION__);
  AssertIsOnOwningThread();

  if (MOZ_LOG_TEST(gMediaManagerLog, LogLevel::Debug)) {
    LOG("ChooseCapability: prefs: %dx%d @%dfps", aPrefs.GetWidth(),
        aPrefs.GetHeight(), aPrefs.mFPS);
    MediaConstraintsHelper::LogConstraints(aConstraints);
    if (!aConstraints.mAdvanced.empty()) {
      LOG("Advanced array[%zu]:", aConstraints.mAdvanced.size());
      for (const auto& advanced : aConstraints.mAdvanced) {
        MediaConstraintsHelper::LogConstraints(advanced);
      }
    }
  }

  MOZ_ASSERT_IF(aOutBadConstraint, !*aOutBadConstraint);
  FlattenedConstraints c(aConstraints);
  const auto checkConstraint = [](const auto& aConstraint) {
    return aConstraint.mMin <= aConstraint.mMax && aConstraint.mMax > 0;
  };
  if (!checkConstraint(c.mWidth)) {
    if (aOutBadConstraint) {
      *aOutBadConstraint = "width";
    }
    return false;
  }
  if (!checkConstraint(c.mHeight)) {
    if (aOutBadConstraint) {
      *aOutBadConstraint = "height";
    }
    return false;
  }
  if (!checkConstraint(c.mFrameRate)) {
    if (aOutBadConstraint) {
      *aOutBadConstraint = "frameRate";
    }
    return false;
  }

  switch (mCapEngine) {
    case camera::ScreenEngine:
    case camera::WinEngine:
    case camera::BrowserEngine: {
      // DesktopCaptureImpl polls for frames and so must know the framerate to
      // capture at. This is signaled through CamerasParent as the capability's
      // maxFPS. Note that DesktopCaptureImpl does not expose any capabilities.
      constexpr int32_t probablyNativeFramerate = 60;
      constexpr int32_t cap = 120;
      const int32_t constrainedFramerate =
          SaturatingCast<int32_t>(std::lround(c.mFrameRate.Get(aPrefs.mFPS)));
      aCapability.maxFPS =
          aCalculate == kFeasibility
              ? std::min(constrainedFramerate, cap)
              : std::clamp(constrainedFramerate, probablyNativeFramerate, cap);
      return true;
    }
    default:
      break;
  }

  nsTArray<CapabilityCandidate> candidateSet;
  size_t num = NumCapabilities();
  int32_t maxHeight = 0, maxWidth = 0, maxFps = 0;
  for (size_t i = 0; i < num; i++) {
    auto capability = GetCapability(i);
    if (capability.height > maxHeight) {
      maxHeight = capability.height;
    }
    if (capability.width > maxWidth) {
      maxWidth = capability.width;
    }
    if (capability.maxFPS > maxFps) {
      maxFps = capability.maxFPS;
    }
    candidateSet.AppendElement(CapabilityCandidate(capability));
  }

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "MediaEngineRemoteVideoSource::ChooseCapability",
      [capabilities = mTrackCapabilities, maxHeight, maxWidth,
       maxFps]() mutable {
        dom::ULongRange widthRange;
        widthRange.mMax.Construct(maxWidth);
        widthRange.mMin.Construct(2);
        capabilities->mWidth.Reset();
        capabilities->mWidth.Construct(widthRange);

        dom::ULongRange heightRange;
        heightRange.mMax.Construct(maxHeight);
        heightRange.mMin.Construct(2);
        capabilities->mHeight.Reset();
        capabilities->mHeight.Construct(heightRange);

        dom::DoubleRange frameRateRange;
        frameRateRange.mMax.Construct(maxFps);
        frameRateRange.mMin.Construct(0);
        capabilities->mFrameRate.Reset();
        capabilities->mFrameRate.Construct(frameRateRange);
      }));

  if (mCapabilitiesAreHardcoded && mCapEngine == camera::CameraEngine) {
    // We have a hardcoded capability, which means this camera didn't report
    // discrete capabilities. It might still allow a ranged capability, so we
    // add a couple of default candidates based on prefs and constraints.
    // The chosen candidate will be propagated to StartCapture() which will fail
    // for an invalid candidate.
    MOZ_DIAGNOSTIC_ASSERT(mCapabilities.Length() == 1);
    MOZ_DIAGNOSTIC_ASSERT(candidateSet.Length() == 1);
    candidateSet.Clear();

    FlattenedConstraints c(aConstraints);
    // Reuse the code across both the low-definition (`false`) pref and
    // the high-definition (`true`) pref.
    // If there are constraints we try to satisfy them but we default to prefs.
    // Note that since constraints are from content and can literally be
    // anything we put (rather generous) caps on them.
    for (bool isHd : {false, true}) {
      webrtc::CaptureCapability cap;
      int32_t prefWidth = aPrefs.GetWidth(isHd);
      int32_t prefHeight = aPrefs.GetHeight(isHd);

      cap.width = c.mWidth.Get(prefWidth);
      cap.width = std::clamp(cap.width, 0, 7680);

      cap.height = c.mHeight.Get(prefHeight);
      cap.height = std::clamp(cap.height, 0, 4320);

      cap.maxFPS =
          SaturatingCast<int32_t>(std::lround(c.mFrameRate.Get(aPrefs.mFPS)));
      cap.maxFPS = std::clamp(cap.maxFPS, 0, 480);

      if (cap.width != prefWidth) {
        // Width was affected by constraints.
        // We'll adjust the height too so the aspect ratio is retained.
        cap.height = cap.width * prefHeight / prefWidth;
      } else if (cap.height != prefHeight) {
        // Height was affected by constraints but not width.
        // We'll adjust the width too so the aspect ratio is retained.
        cap.width = cap.height * prefWidth / prefHeight;
      }

      if (candidateSet.Contains(cap, CapabilityComparator())) {
        continue;
      }
      LogCapability("Hardcoded capability", cap, 0);
      candidateSet.AppendElement(cap);
    }
  }

  // First, filter capabilities by required constraints (min, max, exact).

  for (size_t i = 0; i < candidateSet.Length();) {
    auto& candidate = candidateSet[i];
    candidate.mDistance =
        GetDistance(candidate.mCapability, aConstraints, aCalculate);
    LogCapability("Capability", candidate.mCapability, candidate.mDistance);
    if (candidate.mDistance == UINT32_MAX) {
      candidateSet.RemoveElementAt(i);
    } else {
      ++i;
    }
  }

  if (candidateSet.IsEmpty()) {
    LOG("failed to find capability match from %zu choices",
        candidateSet.Length());
    return false;
  }

  // Filter further with all advanced constraints (that don't overconstrain).

  for (const auto& cs : aConstraints.mAdvanced) {
    nsTArray<CapabilityCandidate> rejects;
    for (size_t i = 0; i < candidateSet.Length();) {
      if (GetDistance(candidateSet[i].mCapability, cs, aCalculate) ==
          UINT32_MAX) {
        rejects.AppendElement(candidateSet[i]);
        candidateSet.RemoveElementAt(i);
      } else {
        ++i;
      }
    }
    if (!candidateSet.Length()) {
      candidateSet.AppendElements(std::move(rejects));
    }
  }
  MOZ_ASSERT(
      candidateSet.Length(),
      "advanced constraints filtering step can't reduce candidates to zero");

  // Remaining algorithm is up to the UA.

  TrimLessFitCandidates(candidateSet);

  // Any remaining multiples all have the same distance. A common case of this
  // occurs when no ideal is specified. Lean toward defaults.
  uint32_t sameDistance = candidateSet[0].mDistance;
  {
    MediaTrackConstraintSet prefs;
    prefs.mWidth.Construct().SetAsLong() = aPrefs.GetWidth();
    prefs.mHeight.Construct().SetAsLong() = aPrefs.GetHeight();
    prefs.mFrameRate.Construct().SetAsDouble() = aPrefs.mFPS;
    NormalizedConstraintSet normPrefs(prefs, false);

    for (auto& candidate : candidateSet) {
      candidate.mDistance =
          GetDistance(candidate.mCapability, normPrefs, aCalculate);
    }
    TrimLessFitCandidates(candidateSet);
  }

  aCapability = candidateSet[0].mCapability;

  LogCapability("Chosen capability", aCapability, sameDistance);
  return true;
}

void MediaEngineRemoteVideoSource::GetSettings(
    MediaTrackSettings& aOutSettings) const {
  aOutSettings = *mSettings;
}

void MediaEngineRemoteVideoSource::GetCapabilities(
    dom::MediaTrackCapabilities& aOutCapabilities) const {
  aOutCapabilities = *mTrackCapabilities;
}

}  // namespace mozilla
