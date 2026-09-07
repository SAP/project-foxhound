/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CamerasParent.h"

#include <algorithm>

#include "CamerasTypes.h"
#include "MediaEngineSource.h"
#include "PerformanceRecorder.h"
#include "VideoEngine.h"
#include "VideoFrameUtils.h"
#include "api/video/video_frame_buffer.h"
#include "common/browser_logging/WebRtcLog.h"
#include "common_video/libyuv/include/webrtc_libyuv.h"
#include "mozilla/Assertions.h"
#include "mozilla/Logging.h"
#include "mozilla/Preferences.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/Services.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/ipc/BackgroundParent.h"
#include "mozilla/ipc/PBackgroundParent.h"
#include "mozilla/media/DesktopCaptureInterface.h"
#include "mozilla/media/MediaUtils.h"
#include "nsAppRunner.h"
#include "nsIPermissionManager.h"
#include "nsIThread.h"
#include "nsNetUtil.h"
#include "nsThreadUtils.h"
#include "video_engine/desktop_capture_impl.h"
#include "video_engine/video_capture_factory.h"

#if defined(_WIN32)
#  include <process.h>
#  define getpid() _getpid()
#endif

mozilla::LazyLogModule gCamerasParentLog("CamerasParent");
#define LOG(...) \
  MOZ_LOG_FMT(gCamerasParentLog, mozilla::LogLevel::Debug, __VA_ARGS__)
#define LOG_FUNCTION()                                     \
  MOZ_LOG_FMT(gCamerasParentLog, mozilla::LogLevel::Debug, \
              "CamerasParent({})::{}", fmt::ptr(this), __func__)
#define LOG_VERBOSE(...) \
  MOZ_LOG_FMT(gCamerasParentLog, mozilla::LogLevel::Verbose, __VA_ARGS__)
#define LOG_ENABLED() MOZ_LOG_TEST(gCamerasParentLog, mozilla::LogLevel::Debug)

namespace mozilla {
using dom::VideoResizeModeEnum;
using media::ShutdownBlockingTicket;
namespace camera {

uint32_t ResolutionFeasibilityDistance(int32_t candidate, int32_t requested) {
  // The purpose of this function is to find a smallest resolution
  // which is larger than all requested capabilities.
  // Then we can use down-scaling to fulfill each request.

  MOZ_DIAGNOSTIC_ASSERT(candidate >= 0, "Candidate unexpectedly negative");
  MOZ_DIAGNOSTIC_ASSERT(requested >= 0, "Requested unexpectedly negative");

  if (candidate == 0) {
    // Treat width|height capability of 0 as "can do any".
    // This allows for orthogonal capabilities that are not in discrete steps.
    return 0;
  }

  uint32_t distance =
      std::abs(candidate - requested) * 1000 / std::max(candidate, requested);
  if (candidate >= requested) {
    // This is a good case, the candidate covers the requested resolution.
    return distance;
  }

  // This is a bad case, the candidate is lower than the requested resolution.
  // This is penalized with an added weight of 10000.
  return 10000 + distance;
}

uint32_t FeasibilityDistance(int32_t candidate, int32_t requested) {
  MOZ_DIAGNOSTIC_ASSERT(candidate >= 0, "Candidate unexpectedly negative");
  MOZ_DIAGNOSTIC_ASSERT(requested >= 0, "Requested unexpectedly negative");

  if (candidate == 0) {
    // Treat maxFPS capability of 0 as "can do any".
    // This allows for orthogonal capabilities that are not in discrete steps.
    return 0;
  }

  return std::abs(candidate - requested) * 1000 /
         std::max(candidate, requested);
}

class CamerasParent::VideoEngineArray
    : public media::Refcountable<nsTArray<RefPtr<VideoEngine>>> {};

// Singleton video engines. The sEngines RefPtr is IPC background thread only
// and outlives the CamerasParent instances. The array elements are video
// capture thread only.
using VideoEngineArray = CamerasParent::VideoEngineArray;
static StaticRefPtr<VideoEngineArray> sEngines;
// Number of CamerasParents instances in the current process for which
// mVideoCaptureThread has been set. IPC background thread only.
static int32_t sNumCamerasParents = 0;
// Video processing thread - where webrtc.org capturer code runs. Outlives the
// CamerasParent instances. IPC background thread only.
static StaticRefPtr<nsIThread> sVideoCaptureThread;
// Main VideoCaptureFactory used to create and manage all capture related
// objects. Created on IPC background thread, destroyed on main thread on
// shutdown. Outlives the CamerasParent instances.
static StaticRefPtr<VideoCaptureFactory> sVideoCaptureFactory;
// All live aggregators across all CamerasParent instances. The array and its
// members are only modified on the video capture thread. The outermost refcount
// is IPC background thread only.
static StaticRefPtr<
    media::Refcountable<nsTArray<std::unique_ptr<AggregateCapturer>>>>
    sAggregators;

static void ClearCameraDeviceInfo() {
  ipc::AssertIsOnBackgroundThread();
  if (sVideoCaptureThread) {
    MOZ_ASSERT(sEngines);
    MOZ_ALWAYS_SUCCEEDS(sVideoCaptureThread->Dispatch(
        NS_NewRunnableFunction(__func__, [engines = RefPtr(sEngines.get())] {
          if (VideoEngine* engine = engines->ElementAt(CameraEngine)) {
            engine->ClearVideoCaptureDeviceInfo();
          }
        })));
  }
}

static inline nsCString FakeCameraPref() {
  return nsDependentCString(
      StaticPrefs::GetPrefName_media_getusermedia_camera_fake_force());
}

static void OnPrefChange(const char* aPref, void* aClosure) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(FakeCameraPref() == aPref);
  if (!sVideoCaptureFactory) {
    return;
  }
  nsCOMPtr<nsISerialEventTarget> backgroundTarget =
      ipc::BackgroundParent::GetBackgroundThread();
  if (!backgroundTarget) {
    return;
  }
  MOZ_ALWAYS_SUCCEEDS(backgroundTarget->Dispatch(NS_NewRunnableFunction(
      "CamerasParent::OnPrefChange", &ClearCameraDeviceInfo)));
}

static VideoCaptureFactory* EnsureVideoCaptureFactory() {
  ipc::AssertIsOnBackgroundThread();

  if (sVideoCaptureFactory) {
    return sVideoCaptureFactory;
  }

  sVideoCaptureFactory = MakeRefPtr<VideoCaptureFactory>();
  NS_DispatchToMainThread(
      NS_NewRunnableFunction("CamerasParent::EnsureVideoCaptureFactory", []() {
        Preferences::RegisterCallback(&OnPrefChange, FakeCameraPref());
        RunOnShutdown([] {
          sVideoCaptureFactory = nullptr;
          Preferences::UnregisterCallback(&OnPrefChange, FakeCameraPref());
        });
      }));
  return sVideoCaptureFactory;
}

static already_AddRefed<nsISerialEventTarget>
MakeAndAddRefVideoCaptureThreadAndSingletons() {
  ipc::AssertIsOnBackgroundThread();

  MOZ_ASSERT_IF(sVideoCaptureThread, sNumCamerasParents > 0);
  MOZ_ASSERT_IF(!sVideoCaptureThread, sNumCamerasParents == 0);

  if (!sVideoCaptureThread) {
    LOG("Spinning up WebRTC Cameras Thread");
    nsIThreadManager::ThreadCreationOptions options;
#ifdef XP_WIN
    // Windows desktop capture needs a UI thread
    options.isUiThread = true;
#endif
    nsCOMPtr<nsIThread> videoCaptureThread;
    if (NS_FAILED(NS_NewNamedThread("VideoCapture",
                                    getter_AddRefs(videoCaptureThread), nullptr,
                                    options))) {
      return nullptr;
    }
    sVideoCaptureThread = videoCaptureThread.forget();

    sEngines = MakeRefPtr<VideoEngineArray>();
    sEngines->AppendElements(CaptureEngine::MaxEngine);

    sAggregators = MakeRefPtr<
        media::Refcountable<nsTArray<std::unique_ptr<AggregateCapturer>>>>();
  }

  ++sNumCamerasParents;
  return do_AddRef(sVideoCaptureThread);
}

static void ReleaseVideoCaptureThreadAndSingletons() {
  ipc::AssertIsOnBackgroundThread();

  if (--sNumCamerasParents > 0) {
    // Other CamerasParent instances are using the singleton classes.
    return;
  }

  MOZ_ASSERT(sNumCamerasParents == 0, "Double release!");

  // No other CamerasParent instances alive. Clean up.
  LOG("Shutting down VideoEngines and the VideoCapture thread");
  MOZ_ALWAYS_SUCCEEDS(sVideoCaptureThread->Dispatch(NS_NewRunnableFunction(
      __func__, [engines = RefPtr(sEngines.forget()),
                 aggregators = RefPtr(sAggregators.forget())] {
        MOZ_ASSERT(aggregators->IsEmpty(), "No capturers expected on shutdown");
        for (RefPtr<VideoEngine>& engine : *engines) {
          if (engine) {
            engine = nullptr;
          }
        }
      })));

  MOZ_ALWAYS_SUCCEEDS(RefPtr(sVideoCaptureThread.forget())->AsyncShutdown());
}

// 3 threads are involved in this code:
// - the main thread for some setups, and occassionally for video capture setup
//   calls that don't work correctly elsewhere.
// - the IPC thread on which PBackground is running and which receives and
//   sends messages
// - a thread which will execute the actual (possibly slow) camera access
//   called "VideoCapture". On Windows this is a thread with an event loop
//   suitable for UI access.

void CamerasParent::OnDeviceChange() {
  LOG_FUNCTION();

  mPBackgroundEventTarget.Dispatch(
      NS_NewRunnableFunction(__func__, [this, self = RefPtr(this)]() {
        mPBackgroundEventTarget.AssertOnCurrentThread();
        if (mDestroyed) {
          LOG("OnDeviceChanged failure: parent shutting down.");
          return;
        }
        (void)SendDeviceChange();
      }));
};

class DeliverFrameRunnable : public mozilla::Runnable {
 public:
  // Constructor for when no ShmemBuffer (of the right size) was available, so
  // keep the frame around until we can allocate one on PBackground (in Run).
  DeliverFrameRunnable(already_AddRefed<CamerasParent> aParent,
                       CaptureEngine aEngine, int aCaptureId,
                       nsTArray<int>&& aStreamIds,
                       const TrackingId& aTrackingId,
                       const webrtc::VideoFrame& aFrame,
                       const VideoFrameProperties& aProperties)
      : Runnable("camera::DeliverFrameRunnable"),
        mParent(aParent),
        mCapEngine(aEngine),
        mCaptureId(aCaptureId),
        mStreamIds(std::move(aStreamIds)),
        mTrackingId(aTrackingId),
        mBuffer(aFrame),
        mProperties(aProperties) {}

  DeliverFrameRunnable(already_AddRefed<CamerasParent> aParent,
                       CaptureEngine aEngine, int aCaptureId,
                       nsTArray<int>&& aStreamIds,
                       const TrackingId& aTrackingId, ShmemBuffer aBuffer,
                       VideoFrameProperties& aProperties)
      : Runnable("camera::DeliverFrameRunnable"),
        mParent(aParent),
        mCapEngine(aEngine),
        mCaptureId(aCaptureId),
        mStreamIds(std::move(aStreamIds)),
        mTrackingId(aTrackingId),
        mBuffer(std::move(aBuffer)),
        mProperties(aProperties) {}

  NS_IMETHOD Run() override {
    // runs on BackgroundEventTarget
    mParent->mPBackgroundEventTarget.AssertOnCurrentThread();
    if (mParent->mDestroyed) {
      // Communication channel is being torn down
      return NS_OK;
    }
    mParent->DeliverFrameOverIPC(mCapEngine, mCaptureId, mStreamIds,
                                 mTrackingId, std::move(mBuffer), mProperties);
    return NS_OK;
  }

 private:
  const RefPtr<CamerasParent> mParent;
  const CaptureEngine mCapEngine;
  const int mCaptureId;
  const nsTArray<int> mStreamIds;
  const TrackingId mTrackingId;
  Variant<ShmemBuffer, webrtc::VideoFrame> mBuffer;
  const VideoFrameProperties mProperties;
};

int CamerasParent::DeliverFrameOverIPC(
    CaptureEngine aCapEngine, int aCaptureId, const Span<const int>& aStreamIds,
    const TrackingId& aTrackingId,
    Variant<ShmemBuffer, webrtc::VideoFrame>&& aBuffer,
    const VideoFrameProperties& aProps) {
  // No ShmemBuffers were available, so construct one now of the right size
  // and copy into it. That is an extra copy, but we expect this to be
  // the exceptional case, because we just assured the next call *will* have a
  // buffer of the right size.
  if (!aBuffer.is<ShmemBuffer>()) {
    // Get a shared memory buffer from the pool, at least size big
    ShmemBuffer shMemBuff;
    {
      auto guard = mShmemPools.Lock();
      auto it = guard->find(aCaptureId);
      if (it != guard->end()) {
        auto& [_, pool] = *it;
        shMemBuff = pool.Get(this, aProps.bufferSize());
      }
    }

    if (!shMemBuff.Valid()) {
      LOG("No usable Video shmem in DeliverFrame (out of buffers?)");
      // We can skip this frame if we run out of buffers, it's not a real error.
      return 0;
    }

    PerformanceRecorder<CopyVideoStage> rec(
        "CamerasParent::AltBufferToShmem"_ns, aTrackingId, aProps.width(),
        aProps.height());
    VideoFrameUtils::CopyVideoFrameBuffers(shMemBuff,
                                           aBuffer.as<webrtc::VideoFrame>());
    rec.Record();

    if (!SendDeliverFrame(aCaptureId, aStreamIds, std::move(shMemBuff.Get()),
                          aProps)) {
      return -1;
    }
  } else {
    MOZ_ASSERT(aBuffer.as<ShmemBuffer>().Valid());
    // ShmemBuffer was available, we're all good. A single copy happened
    // in the original webrtc callback.
    if (!SendDeliverFrame(aCaptureId, aStreamIds,
                          std::move(aBuffer.as<ShmemBuffer>().Get()), aProps)) {
      return -1;
    }
  }

  return 0;
}

bool CamerasParent::IsWindowCapturing(uint64_t aWindowId,
                                      const nsACString& aUniqueId) const {
  mVideoCaptureThread->AssertOnCurrentThread();
  for (const auto& aggregator : *mAggregators) {
    if (aggregator->mUniqueId != aUniqueId) {
      continue;
    }
    auto streamsGuard = aggregator->mStreams.ConstLock();
    for (const auto& stream : *streamsGuard) {
      if (stream->mWindowId == aWindowId) {
        return true;
      }
    }
  }
  return false;
}

ShmemBuffer CamerasParent::GetBuffer(int aCaptureId, size_t aSize) {
  auto guard = mShmemPools.Lock();
  auto it = guard->find(aCaptureId);
  if (it == guard->end()) {
    return ShmemBuffer();
  }
  auto& [_, pool] = *it;
  return pool.GetIfAvailable(aSize);
}

/*static*/
std::unique_ptr<AggregateCapturer> AggregateCapturer::Create(
    nsISerialEventTarget* aVideoCaptureThread, CaptureEngine aCapEng,
    VideoEngine* aEngine, const nsCString& aUniqueId, uint64_t aWindowId,
    nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities,
    CamerasParent* aParent) {
  MOZ_ASSERT(aVideoCaptureThread->IsOnCurrentThread());
  int32_t captureId = aEngine->GenerateId();
  auto result = aEngine->CreateVideoCapture(captureId, aUniqueId.get());
  if (!result.mCapturer) {
    return nullptr;
  }
  auto aggregator = WrapUnique(new AggregateCapturer(
      aVideoCaptureThread, aCapEng, aEngine, aUniqueId, captureId,
      result.mCapturer.get(), result.mDesktopImpl, std::move(aCapabilities)));
  aggregator->AddStream(aParent, captureId, aWindowId);
  aggregator->mCapturer->SetTrackingId(aggregator->mTrackingId.mUniqueInProcId);
  aggregator->mCapturer->RegisterCaptureDataCallback(aggregator.get());
  if (auto* dc = aggregator->mDesktopCapturer) {
    aggregator->mCaptureEndedListener =
        dc->CaptureEndedEvent()->Connect(aVideoCaptureThread, aggregator.get(),
                                         &AggregateCapturer::OnCaptureEnded);
  }
  return aggregator;
}

AggregateCapturer::AggregateCapturer(
    nsISerialEventTarget* aVideoCaptureThread, CaptureEngine aCapEng,
    VideoEngine* aEngine, const nsCString& aUniqueId, int aCaptureId,
    webrtc::VideoCaptureModule* aCapturer,
    DesktopCaptureInterface* aDesktopCapturer,
    nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities)
    : mVideoCaptureThread(aVideoCaptureThread),
      mCapEngine(aCapEng),
      mEngine(aEngine),
      mUniqueId(aUniqueId),
      mCaptureId(aCaptureId),
      mCapturer(aCapturer),
      mDesktopCapturer(aDesktopCapturer),
      mTrackingId(CaptureEngineToTrackingSourceStr(aCapEng), mCaptureId),
      mCapabilities(std::move(aCapabilities)),
      mStreams("CallbackHelper::mStreams") {
  MOZ_ASSERT(mVideoCaptureThread->IsOnCurrentThread());
}

AggregateCapturer::~AggregateCapturer() {
  MOZ_ASSERT(mVideoCaptureThread->IsOnCurrentThread());
#ifdef DEBUG
  {
    auto streamsGuard = mStreams.Lock();
    MOZ_ASSERT(streamsGuard->IsEmpty());
  }
#endif
  mCaptureEndedListener.DisconnectIfExists();
  mCapturer->DeRegisterCaptureDataCallback();
  mCapturer->StopCapture();
}

void AggregateCapturer::AddStream(CamerasParent* aParent, int aStreamId,
                                  uint64_t aWindowId) {
  auto streamsGuard = mStreams.Lock();
#ifdef DEBUG
  for (const auto& stream : *streamsGuard) {
    MOZ_ASSERT(stream->mId != aStreamId);
  }
#endif
  streamsGuard->AppendElement(
      new Stream{.mParent = aParent, .mId = aStreamId, .mWindowId = aWindowId});
}

auto AggregateCapturer::RemoveStream(int aStreamId) -> RemoveStreamResult {
  auto streamsGuard = mStreams.Lock();
  size_t idx = streamsGuard->IndexOf(
      aStreamId, 0,
      [](const auto& aElem, const auto& aId) { return aElem->mId - aId; });
  if (idx == streamsGuard->NoIndex) {
    return {.mNumRemainingStreams = 0, .mNumRemainingStreamsForParent = 0};
  }
  MOZ_ASSERT(!streamsGuard->ElementAt(idx)->mActive);
  CamerasParent* parent = streamsGuard->ElementAt(idx)->mParent;
  streamsGuard->RemoveElementAt(idx);
  size_t remainingForParent = 0;
  for (const auto& s : *streamsGuard) {
    if (s->mParent == parent) {
      remainingForParent += 1;
    }
  }
  return {.mNumRemainingStreams = streamsGuard->Length(),
          .mNumRemainingStreamsForParent = remainingForParent};
}

auto AggregateCapturer::RemoveStreamsFor(CamerasParent* aParent)
    -> RemoveStreamResult {
  auto streamsGuard = mStreams.Lock();
  streamsGuard->RemoveElementsBy(
      [&](const auto& aElem) { return aElem->mParent == aParent; });
  return {.mNumRemainingStreams = streamsGuard->Length(),
          .mNumRemainingStreamsForParent = 0};
}

Maybe<int> AggregateCapturer::CaptureIdFor(int aStreamId,
                                           CamerasParent* aParent) {
  auto streamsGuard = mStreams.Lock();
  for (auto& stream : *streamsGuard) {
    if (stream->mId == aStreamId && stream->mParent == aParent) {
      return Some(mCaptureId);
    }
  }
  return Nothing();
}

int32_t AggregateCapturer::StartStream(
    int aStreamId, const webrtc::VideoCaptureCapability& aCapability,
    const NormalizedConstraints& aConstraints,
    const dom::VideoResizeModeEnum& aResizeMode) {
  MOZ_ASSERT(mVideoCaptureThread->IsOnCurrentThread());
  Maybe<webrtc::VideoCaptureCapability> oldCapability;
  Maybe<webrtc::VideoCaptureCapability> newCapability;
  {
    auto streamsGuard = mStreams.Lock();
    oldCapability = CombinedCapability(streamsGuard);

    for (auto& stream : *streamsGuard) {
      if (stream->mId != aStreamId) {
        continue;
      }
      stream->mConfiguration = {
          .mCapability = aCapability,
          .mConstraints = aConstraints,
          .mResizeMode = aResizeMode,
      };
      stream->mActive = true;

      LOG("AggregateCapturer::{} id={}: Starting stream {} for capability "
          "{}x{}@{}",
          __func__, mCaptureId, aStreamId, aCapability.width,
          aCapability.height, aCapability.maxFPS);
      break;
    }

    newCapability = CombinedCapability(streamsGuard);
  }

  if (newCapability == oldCapability) {
    return 0;
  }

  int32_t err = UpdateDevice(newCapability);
  if (err) {
    LOG("AggregateCapturer::{} id={}, stream={}: Failed to start", __func__,
        mCaptureId, aStreamId);
    {
      auto streamsGuard = mStreams.Lock();
      for (auto& stream : *streamsGuard) {
        if (stream->mId != aStreamId) {
          continue;
        }
        stream->mActive = false;
        break;
      }
      MOZ_ASSERT(oldCapability == CombinedCapability(streamsGuard));
    }
    if (UpdateDevice(oldCapability)) {
      LOG("AggregateCapturer::{} id={}, stream={}: Failed to restore "
          "previous combined capability",
          __func__, mCaptureId, aStreamId);
    }
  } else {
    LOG("AggregateCapturer::{} id={}: Started for new combined capability "
        "{}x{}@{}",
        __func__, mCaptureId, newCapability->width, newCapability->height,
        newCapability->maxFPS);
  }
  return err;
}

int32_t AggregateCapturer::StopStream(int aStreamId) {
  MOZ_ASSERT(mVideoCaptureThread->IsOnCurrentThread());
  Maybe<webrtc::VideoCaptureCapability> oldCapability;
  Maybe<webrtc::VideoCaptureCapability> newCapability;
  {
    auto streamsGuard = mStreams.Lock();
    oldCapability = CombinedCapability(streamsGuard);

    for (auto& stream : *streamsGuard) {
      if (stream->mId != aStreamId) {
        continue;
      }
      LOG("AggregateCapturer::{} id={}: Stopping stream {} with capability "
          "{}x{}@{}",
          __func__, mCaptureId, aStreamId,
          stream->mConfiguration.mCapability.width,
          stream->mConfiguration.mCapability.height,
          stream->mConfiguration.mCapability.maxFPS);

      stream->mConfiguration = {};
      stream->mActive = false;
      break;
    }

    newCapability = CombinedCapability(streamsGuard);
  }

  if (newCapability == oldCapability) {
    return 0;
  }

  int32_t err = UpdateDevice(newCapability);
  if (err) {
    LOG("AggregateCapturer::{} id={}, stream={}: Failed to stop", __func__,
        mCaptureId, aStreamId);
    {
      auto streamsGuard = mStreams.Lock();
      for (auto& stream : *streamsGuard) {
        if (stream->mId != aStreamId) {
          continue;
        }
        stream->mActive = false;
        break;
      }
      MOZ_ASSERT(oldCapability == CombinedCapability(streamsGuard));
    }
    if (UpdateDevice(oldCapability)) {
      LOG("AggregateCapturer::{} id={}, stream={}: Failed to restore "
          "previous combined capability",
          __func__, mCaptureId, aStreamId);
    }
  }
  return err;
}

Maybe<webrtc::VideoCaptureCapability> AggregateCapturer::CombinedCapability(
    const decltype(mStreams)::AutoLock& aStreamsGuard) {
  Maybe<webrtc::VideoCaptureCapability> combinedCap;
  CamerasParent* someParent{};
  for (const auto& stream : *aStreamsGuard) {
    if (!stream->mActive) {
      continue;
    }
    if (!someParent) {
      someParent = stream->mParent;
    }
    const auto& cap = stream->mConfiguration.mCapability;
    if (!combinedCap) {
      combinedCap = Some(cap);
      continue;
    }
    auto combinedRes = combinedCap->width * combinedCap->height;
    combinedCap->maxFPS = std::max(combinedCap->maxFPS, cap.maxFPS);
    if (mCapEngine == CaptureEngine::CameraEngine) {
      auto newCombinedRes = cap.width * cap.height;
      if (newCombinedRes > combinedRes) {
        combinedCap->videoType = cap.videoType;
      }
      combinedCap->width = std::max(combinedCap->width, cap.width);
      combinedCap->height = std::max(combinedCap->height, cap.height);
    }
  }

  if (!combinedCap) {
    return Nothing();
  }

  if (mCapEngine == CameraEngine) {
    const webrtc::VideoCaptureCapability* minDistanceCapability{};
    uint64_t minDistance = UINT64_MAX;

    for (const auto& candidateCapability : mCapabilities) {
      // The first priority is finding a suitable resolution.
      // So here we raise the weight of width and height
      uint64_t distance =
          uint64_t(ResolutionFeasibilityDistance(candidateCapability.width,
                                                 combinedCap->width)) +
          uint64_t(ResolutionFeasibilityDistance(candidateCapability.height,
                                                 combinedCap->height)) +
          uint64_t(FeasibilityDistance(candidateCapability.maxFPS,
                                       combinedCap->maxFPS));
      if (distance < minDistance) {
        minDistanceCapability = &candidateCapability;
        minDistance = distance;
      }
    }
    if (minDistanceCapability) {
      combinedCap = Some(*minDistanceCapability);
    }
  }
  return combinedCap;
}

int32_t AggregateCapturer::UpdateDevice(
    const Maybe<webrtc::VideoCaptureCapability>& aState) {
  MOZ_ASSERT(mVideoCaptureThread->IsOnCurrentThread());
  // Start-/StopCapture will start or reconfigure as appropriate.
  int32_t err = 0;
  if (aState) {
    err = mCapturer->StartCapture(*aState);
    LOG("AggregateCapturer::{} id={}, {} device with new combined capability "
        "({}x{}@{}) (err={})",
        __func__, mCaptureId,
        err == 0 ? "Started or updated" : "Failed to start or update",
        aState->width, aState->height, aState->maxFPS, err);
  } else {
    err = mCapturer->StopCapture();
    if (err) {
      LOG("AggregateCapturer::{} id={}, Failed to stop device (err={})",
          __func__, mCaptureId, err);
    }
  }
  return err;
}

void AggregateCapturer::OnCaptureEnded() {
  MOZ_ASSERT(mVideoCaptureThread->IsOnCurrentThread());
  std::multimap<CamerasParent*, int> parentsAndIds;
  {
    auto streamsGuard = mStreams.Lock();
    for (const auto& stream : *streamsGuard) {
      parentsAndIds.insert({stream->mParent, stream->mId});
    }
  }

  for (auto it = parentsAndIds.begin(); it != parentsAndIds.end();) {
    const auto& parent = it->first;
    auto nextParentIt = parentsAndIds.upper_bound(parent);
    AutoTArray<int, 4> ids;
    while (it != nextParentIt) {
      const auto& [_, id] = *it;
      ids.AppendElement(id);
      ++it;
    }
    nsIEventTarget* target = parent->GetBackgroundEventTarget();
    MOZ_ALWAYS_SUCCEEDS(target->Dispatch(NS_NewRunnableFunction(
        __func__, [parent = RefPtr(parent), ids = std::move(ids)] {
          (void)parent->SendCaptureEnded(ids);
        })));
  }
}

void AggregateCapturer::OnFrame(const webrtc::VideoFrame& aVideoFrame) {
  std::multimap<RefPtr<CamerasParent>, int> parentsAndIds;
  {
    // Proactively drop frames that would not get processed anyway.
    auto streamsGuard = mStreams.Lock();

    for (auto& stream : *streamsGuard) {
      if (!stream->mActive) {
        continue;
      }
      auto& c = stream->mConfiguration;
      const double maxFramerate = static_cast<double>(
          c.mCapability.maxFPS > 0 ? c.mCapability.maxFPS : 120);
      const double desiredFramerate =
          c.mResizeMode == VideoResizeModeEnum::Crop_and_scale
              ? c.mConstraints.mFrameRate.Get(maxFramerate)
              : maxFramerate;
      const double targetFramerate = std::clamp(desiredFramerate, 0.01, 120.);

      // Allow 5% higher fps than configured as frame time sampling is timing
      // dependent.
      const auto minInterval =
          media::TimeUnit(1000, static_cast<int64_t>(1050 * targetFramerate));
      const auto frameTime =
          media::TimeUnit::FromMicroseconds(aVideoFrame.timestamp_us());
      const auto frameInterval = frameTime - stream->mLastFrameTime;
      if (frameInterval < minInterval) {
        continue;
      }
      stream->mLastFrameTime = frameTime;
      LOG_VERBOSE("CamerasParent::{} parent={}, id={}.", __func__,
                  fmt::ptr(stream->mParent), stream->mId);
      parentsAndIds.insert({stream->mParent, stream->mId});
    }
  }

  if (profiler_thread_is_being_profiled_for_markers()) {
    PROFILER_MARKER_UNTYPED(
        nsPrintfCString("CaptureVideoFrame %dx%d %s %s", aVideoFrame.width(),
                        aVideoFrame.height(),
                        webrtc::VideoFrameBufferTypeToString(
                            aVideoFrame.video_frame_buffer()->type()),
                        mTrackingId.ToString().get()),
        MEDIA_RT);
  }

  // Get frame properties
  camera::VideoFrameProperties properties;
  VideoFrameUtils::InitFrameBufferProperties(aVideoFrame, properties);

  for (auto it = parentsAndIds.begin(); it != parentsAndIds.end();) {
    const auto& parent = it->first;
    auto nextParentIt = parentsAndIds.upper_bound(parent);
    AutoTArray<int, 4> ids;
    while (it != nextParentIt) {
      const auto& [_, id] = *it;
      ids.AppendElement(id);
      ++it;
    }

    LOG_VERBOSE("CamerasParent({})::{}", fmt::ptr(parent.get()), __func__);
    RefPtr<DeliverFrameRunnable> runnable = nullptr;
    // Get a shared memory buffer to copy the frame data into
    ShmemBuffer shMemBuffer =
        parent->GetBuffer(mCaptureId, properties.bufferSize());
    if (!shMemBuffer.Valid()) {
      // Either we ran out of buffers or they're not the right size yet
      LOG("Correctly sized Video shmem not available in DeliverFrame");
      // We will do the copy into a(n extra) temporary buffer inside
      // the DeliverFrameRunnable constructor.
    } else {
      // Shared memory buffers of the right size are available, do the copy
      // here.
      PerformanceRecorder<CopyVideoStage> rec(
          "CamerasParent::VideoFrameToShmem"_ns, mTrackingId,
          aVideoFrame.width(), aVideoFrame.height());
      VideoFrameUtils::CopyVideoFrameBuffers(
          shMemBuffer.GetBytes(), properties.bufferSize(), aVideoFrame);
      rec.Record();
      runnable = new DeliverFrameRunnable(
          do_AddRef(parent), mCapEngine, mCaptureId, std::move(ids),
          mTrackingId, std::move(shMemBuffer), properties);
    }
    if (!runnable) {
      runnable = new DeliverFrameRunnable(do_AddRef(parent), mCapEngine,
                                          mCaptureId, std::move(ids),
                                          mTrackingId, aVideoFrame, properties);
    }
    nsIEventTarget* target = parent->GetBackgroundEventTarget();
    target->Dispatch(runnable, NS_DISPATCH_NORMAL);
  }
}

ipc::IPCResult CamerasParent::RecvReleaseFrame(const int& aCaptureId,
                                               ipc::Shmem&& aShmem) {
  mPBackgroundEventTarget.AssertOnCurrentThread();

  auto guard = mShmemPools.Lock();
  auto it = guard->find(aCaptureId);
  if (it == guard->end()) {
    MOZ_ASSERT_UNREACHABLE(
        "Releasing shmem but pool is already gone. Shmem must have been "
        "deallocated.");
    return IPC_FAIL(this, "Shmem was already deallocated");
  }
  auto& [_, pool] = *it;
  pool.Put(ShmemBuffer(aShmem));
  return IPC_OK();
}

void CamerasParent::CloseEngines() {
  mVideoCaptureThread->AssertOnCurrentThread();
  LOG_FUNCTION();

  // Stop the capturers.
  for (const auto& aggregator : Reversed(*mAggregators)) {
    auto removed = aggregator->RemoveStreamsFor(this);
    if (removed.mNumRemainingStreams == 0) {
      auto capEngine = aggregator->mCapEngine;
      auto captureId = aggregator->mCaptureId;
      size_t idx = mAggregators->LastIndexOf(aggregator);
      mAggregators->RemoveElementAtUnsafe(idx);
      LOG("Forcing shutdown of engine {}, capturer {}",
          static_cast<int>(capEngine), captureId);
    }
  }

  mDeviceChangeEventListener.DisconnectIfExists();
  mDeviceChangeEventListenerConnected = false;
  mDestroyedCaptureThread = true;
}

std::shared_ptr<webrtc::VideoCaptureModule::DeviceInfo>
CamerasParent::GetDeviceInfo(CaptureEngine aEngine) {
  mVideoCaptureThread->AssertOnCurrentThread();
  LOG_VERBOSE("CamerasParent({})::{}", fmt::ptr(this), __func__);

  auto* engine = EnsureInitialized(aEngine);
  if (!engine) {
    return nullptr;
  }
  auto info = engine->GetOrCreateVideoCaptureDeviceInfo();

  if (!mDeviceChangeEventListenerConnected && aEngine == CameraEngine) {
    mDeviceChangeEventListener = engine->DeviceChangeEvent().Connect(
        mVideoCaptureThread->GetEventTarget(), this,
        &CamerasParent::OnDeviceChange);
    mDeviceChangeEventListenerConnected = true;
  }

  return info;
}

VideoEngine* CamerasParent::EnsureInitialized(CaptureEngine aEngine) {
  mVideoCaptureThread->AssertOnCurrentThread();
  LOG_VERBOSE("CamerasParent({})::{}", fmt::ptr(this), __func__);
  if (mDestroyedCaptureThread) {
    return nullptr;
  }

  if (VideoEngine* engine = mEngines->ElementAt(aEngine); engine) {
    return engine;
  }

  CaptureDeviceType captureDeviceType = CaptureDeviceType::Camera;
  switch (aEngine) {
    case ScreenEngine:
      captureDeviceType = CaptureDeviceType::Screen;
      break;
    case BrowserEngine:
      captureDeviceType = CaptureDeviceType::Browser;
      break;
    case WinEngine:
      captureDeviceType = CaptureDeviceType::Window;
      break;
    case CameraEngine:
      captureDeviceType = CaptureDeviceType::Camera;
      break;
    default:
      LOG("Invalid webrtc Video engine");
      return nullptr;
  }

  RefPtr<VideoEngine> engine =
      VideoEngine::Create(captureDeviceType, mVideoCaptureFactory);
  if (!engine) {
    LOG("VideoEngine::Create failed");
    return nullptr;
  }

  return mEngines->ElementAt(aEngine) = std::move(engine);
}

// Dispatch the runnable to do the camera operation on the
// specific Cameras thread, preventing us from blocking, and
// chain a runnable to send back the result on the IPC thread.
// It would be nice to get rid of the code duplication here,
// perhaps via Promises.
ipc::IPCResult CamerasParent::RecvNumberOfCaptureDevices(
    const CaptureEngine& aCapEngine) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();
  LOG("CaptureEngine={}", static_cast<int>(aCapEngine));

  using Promise = MozPromise<int, bool, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), aCapEngine] {
                mVideoCaptureThread->AssertOnCurrentThread();
                int num = -1;
                if (auto devInfo = GetDeviceInfo(aCapEngine)) {
                  num = static_cast<int>(devInfo->NumberOfDevices());
                }

                return Promise::CreateAndResolve(
                    num, "CamerasParent::RecvNumberOfCaptureDevices");
              })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            int nrDevices = aValue.ResolveValue();

            if (mDestroyed) {
              LOG("RecvNumberOfCaptureDevices failure: child not alive");
              return;
            }

            if (nrDevices < 0) {
              LOG("RecvNumberOfCaptureDevices couldn't find devices");
              (void)SendReplyFailure();
              return;
            }

            LOG("RecvNumberOfCaptureDevices: {}", nrDevices);
            (void)SendReplyNumberOfCaptureDevices(nrDevices);
          });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvEnsureInitialized(
    const CaptureEngine& aCapEngine) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();

  using Promise = MozPromise<bool, bool, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), aCapEngine] {
                mVideoCaptureThread->AssertOnCurrentThread();
                return Promise::CreateAndResolve(
                    EnsureInitialized(aCapEngine),
                    "CamerasParent::RecvEnsureInitialized");
              })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            bool result = aValue.ResolveValue();

            if (mDestroyed) {
              LOG("RecvEnsureInitialized: child not alive");
              return;
            }

            if (!result) {
              LOG("RecvEnsureInitialized failed");
              (void)SendReplyFailure();
              return;
            }

            LOG("RecvEnsureInitialized succeeded");
            (void)SendReplySuccess();
          });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvNumberOfCapabilities(
    const CaptureEngine& aCapEngine, const nsACString& aUniqueId) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();
  LOG("Getting caps for {}", PromiseFlatCString(aUniqueId).get());

  using Promise = MozPromise<int, bool, true>;
  InvokeAsync(
      mVideoCaptureThread->GetEventTarget(), __func__,
      [this, self = RefPtr(this), id = nsCString(aUniqueId), aCapEngine]() {
        mVideoCaptureThread->AssertOnCurrentThread();
        int num = -1;
        if (auto devInfo = GetDeviceInfo(aCapEngine)) {
          num = devInfo->NumberOfCapabilities(id.get());
        }
        return Promise::CreateAndResolve(
            num, "CamerasParent::RecvNumberOfCapabilities");
      })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            int aNrCapabilities = aValue.ResolveValue();

            if (mDestroyed) {
              LOG("RecvNumberOfCapabilities: child not alive");
              return;
            }

            if (aNrCapabilities < 0) {
              LOG("RecvNumberOfCapabilities couldn't find capabilities");
              (void)SendReplyFailure();
              return;
            }

            LOG("RecvNumberOfCapabilities: {}", aNrCapabilities);
            (void)SendReplyNumberOfCapabilities(aNrCapabilities);
          });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvGetCaptureCapability(
    const CaptureEngine& aCapEngine, const nsACString& aUniqueId,
    const int& aIndex) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();
  LOG("RecvGetCaptureCapability: {} {}", PromiseFlatCString(aUniqueId).get(),
      aIndex);

  using Promise = MozPromise<webrtc::VideoCaptureCapability, int, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), id = nsCString(aUniqueId), aCapEngine,
               aIndex] {
                mVideoCaptureThread->AssertOnCurrentThread();
                nsTArray<webrtc::VideoCaptureCapability> const* capabilities =
                    EnsureCapabilitiesPopulated(aCapEngine, id);
                webrtc::VideoCaptureCapability webrtcCaps;
                if (!capabilities) {
                  return Promise::CreateAndReject(
                      -1, "CamerasParent::RecvGetCaptureCapability");
                }
                if (aIndex < 0 ||
                    static_cast<size_t>(aIndex) >= capabilities->Length()) {
                  return Promise::CreateAndReject(
                      -2, "CamerasParent::RecvGetCaptureCapability");
                }
                return Promise::CreateAndResolve(
                    capabilities->ElementAt(aIndex),
                    "CamerasParent::RecvGetCaptureCapability");
              })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            if (mDestroyed) {
              LOG("RecvGetCaptureCapability: child not alive");
              return;
            }

            if (aValue.IsReject()) {
              LOG("RecvGetCaptureCapability: reply failure");
              (void)SendReplyFailure();
              return;
            }

            auto webrtcCaps = aValue.ResolveValue();
            VideoCaptureCapability capCap(
                webrtcCaps.width, webrtcCaps.height, webrtcCaps.maxFPS,
                webrtcCaps.videoType, webrtcCaps.interlaced);
            LOG("Capability: {} {} {} {} {}", webrtcCaps.width,
                webrtcCaps.height, webrtcCaps.maxFPS,
                static_cast<int>(webrtcCaps.videoType), webrtcCaps.interlaced);
            (void)SendReplyGetCaptureCapability(capCap);
          });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvGetCaptureDevice(
    const CaptureEngine& aCapEngine, const int& aDeviceIndex) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();

  using Data = std::tuple<nsCString, nsCString, pid_t, int>;
  using Promise = MozPromise<Data, bool, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), aCapEngine, aDeviceIndex] {
                mVideoCaptureThread->AssertOnCurrentThread();
                char deviceName[MediaEngineSource::kMaxDeviceNameLength] = {};
                char deviceUniqueId[MediaEngineSource::kMaxUniqueIdLength] = {};
                nsCString name;
                nsCString uniqueId;
                pid_t devicePid = 0;
                int error = -1;
                if (auto devInfo = GetDeviceInfo(aCapEngine)) {
                  error = devInfo->GetDeviceName(
                      aDeviceIndex, deviceName, sizeof(deviceName),
                      deviceUniqueId, sizeof(deviceUniqueId), nullptr, 0,
                      &devicePid);
                }

                if (error == 0) {
                  name.Assign(deviceName);
                  uniqueId.Assign(deviceUniqueId);
                }

                return Promise::CreateAndResolve(
                    std::make_tuple(std::move(name), std::move(uniqueId),
                                    devicePid, error),
                    "CamerasParent::RecvGetCaptureDevice");
              })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            const auto& [name, uniqueId, devicePid, error] =
                aValue.ResolveValue();
            if (mDestroyed) {
              return;
            }
            if (error != 0) {
              LOG("GetCaptureDevice failed: {}", error);
              (void)SendReplyFailure();
              return;
            }
            bool scary = (devicePid == getpid());

            LOG("Returning {} name {} id (pid = {}){}", name.get(),
                uniqueId.get(), devicePid, (scary ? " (scary)" : ""));
            (void)SendReplyGetCaptureDevice(name, uniqueId, scary);
          });
  return IPC_OK();
}

// Find out whether the given window with id has permission to use the
// camera. If the permission is not persistent, we'll make it a one-shot by
// removing the (session) permission.
static bool HasCameraPermission(const uint64_t& aWindowId) {
  MOZ_ASSERT(NS_IsMainThread());

  RefPtr<dom::WindowGlobalParent> window =
      dom::WindowGlobalParent::GetByInnerWindowId(aWindowId);
  if (!window) {
    // Could not find window by id
    return false;
  }

  // when we delegate permission from first party, we should use the top level
  // window
  RefPtr<dom::BrowsingContext> topBC = window->BrowsingContext()->Top();
  window = topBC->Canonical()->GetCurrentWindowGlobal();

  // Return false if the window is not the currently-active window for its
  // BrowsingContext.
  if (!window || !window->IsCurrentGlobal()) {
    return false;
  }

  nsIPrincipal* principal = window->DocumentPrincipal();
  if (principal->GetIsNullPrincipal()) {
    return false;
  }

  if (principal->IsSystemPrincipal()) {
    return true;
  }

  MOZ_ASSERT(principal->GetIsContentPrincipal());

  nsresult rv;
  // Name used with nsIPermissionManager
  static const nsLiteralCString cameraPermission = "MediaManagerVideo"_ns;
  nsCOMPtr<nsIPermissionManager> mgr =
      do_GetService(NS_PERMISSIONMANAGER_CONTRACTID, &rv);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return false;
  }

  uint32_t video = nsIPermissionManager::UNKNOWN_ACTION;
  rv = mgr->TestExactPermissionFromPrincipal(principal, cameraPermission,
                                             &video);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return false;
  }

  bool allowed = (video == nsIPermissionManager::ALLOW_ACTION);

  // Session permissions are removed after one use.
  if (allowed) {
    mgr->RemoveFromPrincipal(principal, cameraPermission);
  }

  return allowed;
}

ipc::IPCResult CamerasParent::RecvAllocateCapture(
    const CaptureEngine& aCapEngine, const nsACString& aUniqueIdUTF8,
    const uint64_t& aWindowID) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG("CamerasParent({})::{}: Verifying permissions", fmt::ptr(this), __func__);

  PBackgroundParent* manager = Manager();
  MOZ_ASSERT_IF(!manager, RunningGTest());
  RefPtr<dom::ThreadsafeContentParentHandle> contentParent =
      manager ? ipc::BackgroundParent::GetContentParentHandle(manager)
              : nullptr;

  enum class CapturePermission { Invalid, Allowed, NotAllowed };
  using Promise1 = MozPromise<CapturePermission, bool, true>;
  using Promise2 = MozPromise<Maybe<int>, bool, true>;
  InvokeAsync(
      GetMainThreadSerialEventTarget(), __func__,
      [aWindowID, contentParent] {
        if (contentParent) {
          RefPtr<dom::WindowGlobalParent> wgp =
              dom::WindowGlobalParent::GetByInnerWindowId(aWindowID);
          if (!wgp || wgp->ContentParentId() != contentParent->ChildID()) {
            LOG("Window does not belong to sending process");
            return Promise1::CreateAndResolve(
                CapturePermission::Invalid,
                "CamerasParent::RecvAllocateCapture");
          }
        }
        // Verify whether the claimed origin has received permission
        // to use the camera, either persistently or this session (one
        // shot).
        bool allowed = HasCameraPermission(aWindowID);
        if (!allowed && Preferences::GetBool(
                            "media.navigator.permission.disabled", false)) {
          // Developer preference for turning off permission check.
          allowed = true;
          LOG("No permission but checks are disabled");
        }
        if (!allowed) {
          LOG("No camera permission for this origin");
        }
        return Promise1::CreateAndResolve(allowed
                                              ? CapturePermission::Allowed
                                              : CapturePermission::NotAllowed,
                                          "CamerasParent::RecvAllocateCapture");
      })
      ->Then(mVideoCaptureThread->GetEventTarget(), __func__,
             [this, self = RefPtr(this), aCapEngine, aWindowID,
              unique_id = nsCString(aUniqueIdUTF8)](
                 Promise1::ResolveOrRejectValue&& aValue) {
               mVideoCaptureThread->AssertOnCurrentThread();
               VideoEngine* engine = EnsureInitialized(aCapEngine);
               if (!engine) {
                 return Promise2::CreateAndResolve(
                     Nothing(), "CamerasParent::RecvAllocateCapture no engine");
               }
               CapturePermission permission = aValue.ResolveValue();
               if (permission == CapturePermission::Invalid) {
                 return Promise2::CreateAndResolve(
                     Nothing(), "CamerasParent::RecvAllocateCapture");
               }
               bool allowed = permission == CapturePermission::Allowed;
               if (!allowed && IsWindowCapturing(aWindowID, unique_id)) {
                 allowed = true;
                 LOG("No permission but window is already capturing this "
                     "device");
               }
               if (!allowed) {
                 return Promise2::CreateAndResolve(
                     Nothing(), "CamerasParent::RecvAllocateCapture");
               }

               nsTArray<webrtc::VideoCaptureCapability> capabilities;
               if (const auto* caps =
                       EnsureCapabilitiesPopulated(aCapEngine, unique_id)) {
                 capabilities.AppendElements(*caps);
               }

               auto created = GetOrCreateAggregator(
                   aCapEngine, aWindowID, unique_id, std::move(capabilities));
               return Promise2::CreateAndResolve(
                   created.mAggregator ? Some(created.mStreamId) : Nothing(),
                   "CamerasParent::RecvAllocateCapture");
             })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise2::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            const Maybe<int> captureId = aValue.ResolveValue();
            if (mDestroyed) {
              LOG("RecvAllocateCapture: child not alive");
              return;
            }

            if (!captureId) {
              (void)SendReplyFailure();
              LOG("RecvAllocateCapture: failed to create capturer");
              return;
            }

            LOG("Allocated device nr {}", *captureId);
            (void)SendReplyAllocateCapture(*captureId);
          });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvReleaseCapture(
    const CaptureEngine& aCapEngine, const int& aStreamId) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();
  LOG("RecvReleaseCapture stream nr {}", aStreamId);

  using Promise = MozPromise<int, bool, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), aCapEngine, aStreamId] {
                mVideoCaptureThread->AssertOnCurrentThread();
                return Promise::CreateAndResolve(
                    ReleaseStream(aCapEngine, aStreamId),
                    "CamerasParent::RecvReleaseCapture");
              })
      ->Then(mPBackgroundEventTarget.GetEventTarget(), __func__,
             [this, self = RefPtr(this),
              aStreamId](Promise::ResolveOrRejectValue&& aValue) {
               mPBackgroundEventTarget.AssertOnCurrentThread();
               int error = aValue.ResolveValue();

               if (mDestroyed) {
                 LOG("RecvReleaseCapture: child not alive");
                 return;
               }

               if (error != 0) {
                 (void)SendReplyFailure();
                 LOG("RecvReleaseCapture: Failed to free stream nr {}",
                     aStreamId);
                 return;
               }

               (void)SendReplySuccess();
               LOG("Freed stream nr {}", aStreamId);
             });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvStartCapture(
    const CaptureEngine& aCapEngine, const int& aStreamId,
    const VideoCaptureCapability& aIpcCaps,
    const NormalizedConstraints& aConstraints,
    const dom::VideoResizeModeEnum& aResizeMode) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();

  using Promise = MozPromise<int, bool, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), aCapEngine, aStreamId, aIpcCaps,
               aConstraints, aResizeMode] {
                mVideoCaptureThread->AssertOnCurrentThread();
                LOG_FUNCTION();

                if (!EnsureInitialized(aCapEngine)) {
                  return Promise::CreateAndResolve(
                      -1, "CamerasParent::RecvStartCapture");
                }

                AggregateCapturer* aggregator =
                    GetAggregator(aCapEngine, aStreamId);
                if (!aggregator) {
                  return Promise::CreateAndResolve(
                      -1, "CamerasParent::RecvStartCapture");
                }

                int error = -1;
                if (aggregator) {
                  webrtc::VideoCaptureCapability capability;
                  capability.width = aIpcCaps.width();
                  capability.height = aIpcCaps.height();
                  capability.maxFPS = aIpcCaps.maxFPS();
                  capability.videoType =
                      static_cast<webrtc::VideoType>(aIpcCaps.videoType());
                  capability.interlaced = aIpcCaps.interlaced();

                  if (aggregator) {
                    error = aggregator->StartStream(aStreamId, capability,
                                                    aConstraints, aResizeMode);
                  }
                }

                return Promise::CreateAndResolve(
                    error, "CamerasParent::RecvStartCapture");
              })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            int error = aValue.ResolveValue();

            if (mDestroyed) {
              LOG("RecvStartCapture failure: child is not alive");
              return;
            }

            if (error != 0) {
              LOG("RecvStartCapture failure: StartCapture failed");
              (void)SendReplyFailure();
              return;
            }

            (void)SendReplySuccess();
          });
  return IPC_OK();
}

ipc::IPCResult CamerasParent::RecvFocusOnSelectedSource(
    const CaptureEngine& aCapEngine, const int& aStreamId) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();

  using Promise = MozPromise<bool, bool, true>;
  InvokeAsync(mVideoCaptureThread->GetEventTarget(), __func__,
              [this, self = RefPtr(this), aCapEngine, aStreamId] {
                mVideoCaptureThread->AssertOnCurrentThread();
                auto* aggregator = GetAggregator(aCapEngine, aStreamId);
                bool result = false;
                if (aggregator) {
                  result = aggregator->mCapturer->FocusOnSelectedSource();
                }
                return Promise::CreateAndResolve(
                    result, "CamerasParent::RecvFocusOnSelectedSource");
              })
      ->Then(
          mPBackgroundEventTarget.GetEventTarget(), __func__,
          [this, self = RefPtr(this)](Promise::ResolveOrRejectValue&& aValue) {
            mPBackgroundEventTarget.AssertOnCurrentThread();
            bool result = aValue.ResolveValue();
            if (mDestroyed) {
              LOG("RecvFocusOnSelectedSource failure: child is not alive");
              return;
            }

            if (!result) {
              (void)SendReplyFailure();
              LOG("RecvFocusOnSelectedSource failure.");
              return;
            }

            (void)SendReplySuccess();
          });
  return IPC_OK();
}

auto CamerasParent::GetOrCreateAggregator(
    CaptureEngine aEngine, uint64_t aWindowId, const nsCString& aUniqueId,
    nsTArray<webrtc::VideoCaptureCapability>&& aCapabilities)
    -> GetOrCreateAggregatorResult {
  mVideoCaptureThread->AssertOnCurrentThread();
  VideoEngine* engine = EnsureInitialized(aEngine);
  const auto ensureShmemPool = [&](int aCaptureId) {
    auto guard = mShmemPools.Lock();
    constexpr size_t kMaxShmemBuffers = 1;
    guard->try_emplace(aCaptureId, kMaxShmemBuffers);
  };
  for (auto& aggregator : *mAggregators) {
    if (aggregator->mCapEngine != aEngine) {
      continue;
    }
    if (aggregator->mUniqueId.Equals(aUniqueId)) {
      int streamId = engine->GenerateId();
      ensureShmemPool(aggregator->mCaptureId);
      aggregator->AddStream(this, streamId, aWindowId);
      return {.mAggregator = aggregator.get(), .mStreamId = streamId};
    }
  }
  std::unique_ptr aggregate = AggregateCapturer::Create(
      mVideoCaptureThread->GetEventTarget(), aEngine, engine, aUniqueId,
      aWindowId, std::move(aCapabilities), this);
  if (!aggregate) {
    return {};
  }
  NotNull aggregator = mAggregators->AppendElement(std::move(aggregate));
  ensureShmemPool(aggregator->get()->mCaptureId);
  return {.mAggregator = aggregator->get(),
          .mStreamId = aggregator->get()->mCaptureId};
}

AggregateCapturer* CamerasParent::GetAggregator(CaptureEngine aEngine,
                                                int aStreamId) {
  mVideoCaptureThread->AssertOnCurrentThread();
  for (auto& aggregator : *mAggregators) {
    if (aggregator->mCapEngine != aEngine) {
      continue;
    }
    Maybe captureId = aggregator->CaptureIdFor(aStreamId, this);
    if (captureId) {
      return aggregator.get();
    }
  }
  return nullptr;
}

int CamerasParent::ReleaseStream(CaptureEngine aEngine, int aStreamId) {
  mVideoCaptureThread->AssertOnCurrentThread();
  auto* aggregator = GetAggregator(aEngine, aStreamId);
  if (!aggregator) {
    return -1;
  }
  auto removed = aggregator->RemoveStream(aStreamId);
  if (removed.mNumRemainingStreams == 0) {
    mAggregators->RemoveElement(aggregator);
  }
  return 0;
}

nsTArray<webrtc::VideoCaptureCapability> const*
CamerasParent::EnsureCapabilitiesPopulated(CaptureEngine aEngine,
                                           const nsCString& aUniqueId) {
  mVideoCaptureThread->AssertOnCurrentThread();
  if (auto iter = mAllCandidateCapabilities.find(aUniqueId);
      iter != mAllCandidateCapabilities.end()) {
    return &iter->second;
  }
  auto devInfo = GetDeviceInfo(aEngine);
  if (!devInfo) {
    return nullptr;
  }
  const int num = devInfo->NumberOfCapabilities(aUniqueId.get());
  if (num <= 0) {
    return nullptr;
  }
  nsTArray<webrtc::VideoCaptureCapability> capabilities(num);
  for (int i = 0; i < num; ++i) {
    webrtc::VideoCaptureCapability capability;
    if (devInfo->GetCapability(aUniqueId.get(), i, capability)) {
      return nullptr;
    }
    capabilities.AppendElement(capability);
  }
  const auto& [iter, _] =
      mAllCandidateCapabilities.emplace(aUniqueId, std::move(capabilities));
  return &iter->second;
}

ipc::IPCResult CamerasParent::RecvStopCapture(const CaptureEngine& aCapEngine,
                                              const int& aStreamId) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  MOZ_ASSERT(!mDestroyed);

  LOG_FUNCTION();

  nsresult rv = mVideoCaptureThread->Dispatch(NS_NewRunnableFunction(
      __func__, [this, self = RefPtr(this), aCapEngine, aStreamId] {
        mVideoCaptureThread->AssertOnCurrentThread();
        auto* aggregator = GetAggregator(aCapEngine, aStreamId);
        if (!aggregator) {
          return;
        }

        aggregator->StopStream(aStreamId);
      }));

  if (mDestroyed) {
    if (NS_FAILED(rv)) {
      return IPC_FAIL_NO_REASON(this);
    }
  } else {
    if (NS_SUCCEEDED(rv)) {
      if (!SendReplySuccess()) {
        return IPC_FAIL_NO_REASON(this);
      }
    } else {
      if (!SendReplyFailure()) {
        return IPC_FAIL_NO_REASON(this);
      }
    }
  }
  return IPC_OK();
}

void CamerasParent::ActorDestroy(ActorDestroyReason aWhy) {
  mPBackgroundEventTarget.AssertOnCurrentThread();
  LOG_FUNCTION();

  // Release shared memory now, it's our last chance
  {
    auto guard = mShmemPools.Lock();
    for (auto& [captureId, pool] : *guard) {
      pool.Cleanup(this);
    }
  }
  // We don't want to receive callbacks or anything if we can't
  // forward them anymore anyway.
  mDestroyed = true;
  // We don't need to listen for shutdown any longer. Disconnect the request.
  // This breaks the reference cycle between CamerasParent and the shutdown
  // promise's Then handler.
  mShutdownRequest.DisconnectIfExists();

  if (mVideoCaptureThread) {
    // Shut down the WebRTC stack, on the video capture thread.
    MOZ_ALWAYS_SUCCEEDS(mVideoCaptureThread->Dispatch(
        NewRunnableMethod(__func__, this, &CamerasParent::CloseEngines)));
  }
}

void CamerasParent::OnShutdown() {
  ipc::AssertIsOnBackgroundThread();
  LOG("CamerasParent({}) ShutdownEvent", fmt::ptr(this));
  mShutdownRequest.Complete();
  (void)Send__delete__(this);
}

CamerasParent::CamerasParent()
    : mShutdownBlocker(ShutdownBlockingTicket::Create(
          u"CamerasParent"_ns, NS_LITERAL_STRING_FROM_CSTRING(__FILE__),
          __LINE__)),
      mVideoCaptureThread(
          mShutdownBlocker
              ? Some(RefPtr(MakeAndAddRefVideoCaptureThreadAndSingletons())
                         .get())
              : Nothing()),
      mEngines(sEngines),
      mAggregators(sAggregators),
      mVideoCaptureFactory(EnsureVideoCaptureFactory()),
      mShmemPools("CamerasParent::mShmemPools"),
      mPBackgroundEventTarget(GetCurrentSerialEventTarget()),
      mDestroyed(false),
      mDestroyedCaptureThread(!mVideoCaptureThread) {
  MOZ_ASSERT(mPBackgroundEventTarget.GetEventTarget() != nullptr,
             "GetCurrentThreadEventTarget failed");
  MOZ_ASSERT_IF(mVideoCaptureThread, mEngines);
  LOG("CamerasParent: {}", fmt::ptr(this));

  // Don't dispatch from the constructor a runnable that may toggle the
  // reference count, because the IPC thread does not get a reference until
  // after the constructor returns.
}

/* static */
auto CamerasParent::RequestCameraAccess(bool aAllowPermissionRequest)
    -> RefPtr<CameraAccessRequestPromise> {
  ipc::AssertIsOnBackgroundThread();

  // Special case for PipeWire where we at this point just need to make sure
  // we have information about camera availabilty through the camera portal
  if (!aAllowPermissionRequest) {
    return EnsureVideoCaptureFactory()->UpdateCameraAvailability()->Then(
        GetCurrentSerialEventTarget(),
        "CamerasParent::RequestCameraAccess update camera availability",
        [](const VideoCaptureFactory::UpdateCameraAvailabilityPromise::
               ResolveOrRejectValue& aValue) {
          LOG("Camera availability updated to {}",
              aValue.IsResolve()
                  ? aValue.ResolveValue() ==
                            VideoCaptureFactory::CameraAvailability::Available
                        ? "available"
                        : "not available"
                  : "still unknown");
          return CameraAccessRequestPromise::CreateAndResolve(
              CamerasAccessStatus::RequestRequired,
              "CamerasParent::RequestCameraAccess camera availability "
              "updated");
        });
  }

  static StaticRefPtr<CameraAccessRequestPromise> sCameraAccessRequestPromise;
  if (!sCameraAccessRequestPromise) {
    sCameraAccessRequestPromise = RefPtr<CameraAccessRequestPromise>(
        EnsureVideoCaptureFactory()->InitCameraBackend()->Then(
            GetCurrentSerialEventTarget(),
            "CamerasParent::RequestCameraAccess camera backend init handler",
            [](nsresult aRv) mutable {
              MOZ_ASSERT(NS_SUCCEEDED(aRv));
              ClearCameraDeviceInfo();
              return CameraAccessRequestPromise::CreateAndResolve(
                  CamerasAccessStatus::Granted,
                  "CamerasParent::RequestCameraAccess camera backend init "
                  "resolve");
            },
            [](nsresult aRv) mutable {
              MOZ_ASSERT(NS_FAILED(aRv));
              return CameraAccessRequestPromise::CreateAndResolve(
                  aRv == NS_ERROR_DOM_MEDIA_NOT_ALLOWED_ERR
                      ? CamerasAccessStatus::Rejected
                      : CamerasAccessStatus::Error,
                  "CamerasParent::RequestCameraAccess camera backend init "
                  "reject");
            }));
    static nsresult clearingRv = NS_DispatchToMainThread(NS_NewRunnableFunction(
        __func__, [] { ClearOnShutdown(&sCameraAccessRequestPromise); }));
    (void)clearingRv;
  }

  // If camera acess is granted, all is jolly. But we need to handle rejection.
  return sCameraAccessRequestPromise->Then(
      GetCurrentSerialEventTarget(),
      "CamerasParent::CameraAccessRequestPromise rejection handler",
      [](CamerasAccessStatus aStatus) {
        return CameraAccessRequestPromise::CreateAndResolve(
            aStatus, "CamerasParent::RequestCameraAccess resolve");
      },
      [promise = RefPtr(sCameraAccessRequestPromise.get()),
       aAllowPermissionRequest](void_t aRv) {
        if (promise == sCameraAccessRequestPromise) {
          sCameraAccessRequestPromise = nullptr;
          return CameraAccessRequestPromise::CreateAndResolve(
              CamerasAccessStatus::Error,
              "CamerasParent::RequestCameraAccess reject");
        }
        return CamerasParent::RequestCameraAccess(aAllowPermissionRequest);
      });
}

// RecvPCamerasConstructor() is used because IPC messages, for
// Send__delete__(), cannot be sent from AllocPCamerasParent().
ipc::IPCResult CamerasParent::RecvPCamerasConstructor() {
  mPBackgroundEventTarget.AssertOnCurrentThread();

  // AsyncShutdown barriers are available only for ShutdownPhases as late as
  // XPCOMWillShutdown.  The IPC background thread shuts down during
  // XPCOMShutdownThreads, so actors may be created when AsyncShutdown barriers
  // are no longer available.  Should shutdown be past XPCOMWillShutdown we end
  // up with a null mShutdownBlocker.

  if (!mShutdownBlocker) {
    LOG("CamerasParent({}) Got no ShutdownBlockingTicket. We are already in "
        "shutdown. Deleting.",
        fmt::ptr(this));
    return Send__delete__(this) ? IPC_OK() : IPC_FAIL(this, "Failed to send");
  }

  if (!mVideoCaptureThread) {
    return Send__delete__(this) ? IPC_OK() : IPC_FAIL(this, "Failed to send");
  }

  NS_DispatchToMainThread(
      NS_NewRunnableFunction(__func__, [this, self = RefPtr(this)] {
        AssertIsOnMainThread();
        mLogHandle = new nsMainThreadPtrHolder<WebrtcLogSinkHandle>(
            "CamerasParent::mLogHandle", EnsureWebrtcLogging());
      }));

  mShutdownBlocker->ShutdownPromise()
      ->Then(mPBackgroundEventTarget.GetEventTarget(),
             "CamerasParent OnShutdown",
             [this, self = RefPtr(this)](
                 const ShutdownPromise::ResolveOrRejectValue& aValue) {
               mPBackgroundEventTarget.AssertOnCurrentThread();
               MOZ_ASSERT(aValue.IsResolve(),
                          "ShutdownBlockingTicket must have been destroyed "
                          "without us disconnecting the shutdown request");
               OnShutdown();
             })
      ->Track(mShutdownRequest);

  return IPC_OK();
}

CamerasParent::~CamerasParent() {
  ipc::AssertIsOnBackgroundThread();
  LOG_FUNCTION();

  if (!mVideoCaptureThread) {
    // No video engines or video capture thread to shutdown here.
    return;
  }

  MOZ_ASSERT(mShutdownBlocker,
             "A ShutdownBlocker is a prerequisite for mVideoCaptureThread");

  ReleaseVideoCaptureThreadAndSingletons();
}

already_AddRefed<CamerasParent> CamerasParent::Create() {
  ipc::AssertIsOnBackgroundThread();
  return MakeAndAddRef<CamerasParent>();
}

}  // namespace camera
}  // namespace mozilla

#undef LOG
#undef LOG_FUNCTION
#undef LOG_VERBOSE
#undef LOG_ENABLED
