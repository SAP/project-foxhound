/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-*/
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_MEDIATRACKGRAPHIMPL_H_
#define MOZILLA_MEDIATRACKGRAPHIMPL_H_

#include "MediaTrackGraph.h"

#include "AudioMixer.h"
#include "GraphDriver.h"
#include "DeviceInputTrack.h"
#include "mozilla/Atomics.h"
#include "mozilla/Maybe.h"
#include "mozilla/Monitor.h"
#include "mozilla/TimeStamp.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/WeakPtr.h"
#include "nsClassHashtable.h"
#include "nsIMemoryReporter.h"
#include "nsINamed.h"
#include "nsIRunnable.h"
#include "nsIThreadInternal.h"
#include "nsITimer.h"
#include "AsyncLogger.h"

namespace mozilla {

namespace media {
class ShutdownBlocker;
}

class AudioContextOperationControlMessage;
template <typename T>
class LinkedList;
class GraphRunner;

class DeviceInputTrackManager {
 public:
  DeviceInputTrackManager() = default;

  // Returns the current NativeInputTrack.
  NativeInputTrack* GetNativeInputTrack();
  // Returns the DeviceInputTrack paired with the device of aID if it exists.
  // Otherwise, returns nullptr.
  DeviceInputTrack* GetDeviceInputTrack(CubebUtils::AudioDeviceID aID);
  // Returns the first added NonNativeInputTrack if any. Otherwise, returns
  // nullptr.
  NonNativeInputTrack* GetFirstNonNativeInputTrack();
  // Adds DeviceInputTrack to the managing list.
  void Add(DeviceInputTrack* aTrack);
  // Removes DeviceInputTrack from the managing list.
  void Remove(DeviceInputTrack* aTrack);

 private:
  RefPtr<NativeInputTrack> mNativeInputTrack;
  nsTArray<RefPtr<NonNativeInputTrack>> mNonNativeInputTracks;
};

/**
 * A per-track update message passed from the media graph thread to the
 * main thread.
 */
struct TrackUpdate {
  RefPtr<MediaTrack> mTrack;
  TrackTime mNextMainThreadCurrentTime;
  bool mNextMainThreadEnded;
};

/**
 * This represents a message run on the graph thread to modify track or graph
 * state.  These are passed from main thread to graph thread through
 * AppendMessage().  A ControlMessage often has a weak reference to a
 * particular affected track.
 */
class ControlMessage : public MediaTrack::ControlMessageInterface {
 public:
  explicit ControlMessage(MediaTrack* aTrack) : mTrack(aTrack) {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_RELEASE_ASSERT(!aTrack || !aTrack->IsDestroyed());
  }

  MediaTrack* GetTrack() { return mTrack; }

 protected:
  // We do not hold a reference to mTrack. The graph will be holding a reference
  // to the track until the Destroy message is processed. The last message
  // referencing a track is the Destroy message for that track.
  MediaTrack* const mTrack;
};

class MessageBlock {
 public:
  nsTArray<UniquePtr<MediaTrack::ControlMessageInterface>> mMessages;
};

/**
 * The implementation of a media track graph. This class is private to this
 * file. It's not in the anonymous namespace because MediaTrack needs to
 * be able to friend it.
 *
 * There can be multiple MediaTrackGraph per process: one per document.
 * Additionaly, each OfflineAudioContext object creates its own MediaTrackGraph
 * object too.
 */
class MediaTrackGraphImpl : public MediaTrackGraph,
                            public GraphInterface,
                            public nsIMemoryReporter,
                            public nsIObserver,
                            public nsIThreadObserver,
                            public nsITimerCallback,
                            public nsINamed {
 public:
  using ControlMessageInterface = MediaTrack::ControlMessageInterface;

  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIMEMORYREPORTER
  NS_DECL_NSIOBSERVER
  NS_DECL_NSITHREADOBSERVER
  NS_DECL_NSITIMERCALLBACK
  NS_DECL_NSINAMED

  /**
   * Use aGraphDriverRequested with SYSTEM_THREAD_DRIVER or AUDIO_THREAD_DRIVER
   * to create a MediaTrackGraph which provides support for real-time audio
   * and/or video.  Set it to OFFLINE_THREAD_DRIVER in order to create a
   * non-realtime instance which just churns through its inputs and produces
   * output.  Those objects currently only support audio, and are used to
   * implement OfflineAudioContext.  They do not support MediaTrack inputs.
   */
  explicit MediaTrackGraphImpl(uint64_t aWindowID, TrackRate aSampleRate,
                               CubebUtils::AudioDeviceID aOutputDeviceID,
                               nsISerialEventTarget* aMainThread);

  static MediaTrackGraphImpl* GetInstance(
      GraphDriverType aGraphDriverRequested, uint64_t aWindowID,
      TrackRate aSampleRate, CubebUtils::AudioDeviceID aPrimaryOutputDeviceID,
      nsISerialEventTarget* aMainThread);
  static MediaTrackGraphImpl* GetInstanceIfExists(
      uint64_t aWindowID, TrackRate aSampleRate,
      CubebUtils::AudioDeviceID aPrimaryOutputDeviceID);
  static MediaTrackGraph* CreateNonRealtimeInstance(TrackRate aSampleRate);
  // For GraphHashSet:
  struct Lookup;
  operator Lookup() const;

  // Intended only for assertions, either on graph thread or not running (in
  // which case we must be on the main thread).
  bool OnGraphThreadOrNotRunning() const override;
  bool OnGraphThread() const override;

  bool Destroyed() const override;

#ifdef DEBUG
  /**
   * True if we're on aDriver's thread, or if we're on mGraphRunner's thread
   * and mGraphRunner is currently run by aDriver.
   */
  bool InDriverIteration(const GraphDriver* aDriver) const override;
#endif

  /**
   * Unregisters memory reporting and deletes this instance. This should be
   * called instead of calling the destructor directly.
   */
  void Destroy();

  // Main thread only.
  /**
   * This runs every time we need to sync state from the media graph thread
   * to the main thread while the main thread is not in the middle
   * of a script. It runs during a "stable state" (per HTML5) or during
   * an event posted to the main thread.
   * The boolean affects which boolean controlling runnable dispatch is cleared
   */
  void RunInStableState(bool aSourceIsMTG);
  /**
   * Ensure a runnable to run RunInStableState is posted to the appshell to
   * run at the next stable state (per HTML5).
   * See EnsureStableStateEventPosted.
   */
  void EnsureRunInStableState();
  /**
   * Called to apply a TrackUpdate to its track.
   */
  void ApplyTrackUpdate(TrackUpdate* aUpdate) MOZ_REQUIRES(mMonitor);
  /**
   * Append a control message to the message queue. This queue is drained
   * during RunInStableState; the messages will run on the graph thread.
   */
  virtual void AppendMessage(UniquePtr<ControlMessageInterface> aMessage);
  /**
   * Append to the message queue a control message to execute a given lambda
   * function with no parameters.  The lambda will be executed on the graph
   * thread.  The lambda will not be executed if the graph has been forced to
   * shut down.
   **/
  template <typename Function>
  void QueueControlMessageWithNoShutdown(Function&& aFunction) {
    AppendMessage(WrapUnique(new MediaTrack::ControlMessageWithNoShutdown(
        std::forward<Function>(aFunction))));
  }
  /**
   * Append to the message queue a control message to execute a given lambda
   * function with a single IsInShutdown parameter.  A No argument indicates
   * execution on the thread of a graph that is still running.  A Yes argument
   * indicates execution on the main thread when the graph has been forced to
   * shut down.
   **/
  template <typename Function>
  void QueueControlOrShutdownMessage(Function&& aFunction) {
    AppendMessage(WrapUnique(new MediaTrack::ControlOrShutdownMessage(
        std::forward<Function>(aFunction))));
  }
  /* Add or remove an audio output for this track.  At most one output may be
   * registered per key.  aPreferredSampleRate is the rate preferred by the
   * output device; it may be zero to indicate the preferred rate for the
   * default device; it is unused when aDeviceID is the graph's primary output.
   */
  void RegisterAudioOutput(MediaTrack* aTrack, void* aKey,
                           CubebUtils::AudioDeviceID aDeviceID,
                           TrackRate aPreferredSampleRate);
  void UnregisterAudioOutput(MediaTrack* aTrack, void* aKey);

  void SetAudioOutputVolume(MediaTrack* aTrack, void* aKey, float aVolume);
  /* Manage the creation and destruction of CrossGraphReceivers.
   * aPreferredSampleRate is the rate preferred by the output device. */
  void IncrementOutputDeviceRefCnt(CubebUtils::AudioDeviceID aDeviceID,
                                   TrackRate aPreferredSampleRate);
  void DecrementOutputDeviceRefCnt(CubebUtils::AudioDeviceID aDeviceID);
  /* Send a control message to update mOutputDevices for main thread changes to
   * mAudioOutputParams. */
  void UpdateAudioOutput(MediaTrack* aTrack,
                         CubebUtils::AudioDeviceID aDeviceID);
  /**
   * Dispatches a runnable from any thread to the correct main thread for this
   * MediaTrackGraph.
   */
  void Dispatch(already_AddRefed<nsIRunnable>&& aRunnable);

  /**
   * Make this MediaTrackGraph enter forced-shutdown state. This state
   * will be noticed by the media graph thread, which will shut down all tracks
   * and other state controlled by the media graph thread.
   * This is called during application shutdown, and on document unload if an
   * AudioContext is using the graph.
   */
  void ForceShutDown();

  /**
   * Sets mShutdownBlocker and makes it block shutdown.
   * Main thread only. Not idempotent. Returns true if a blocker was added,
   * false if this failed.
   */
  bool AddShutdownBlocker();

  /**
   * Removes mShutdownBlocker and unblocks shutdown.
   * Main thread only. Idempotent.
   */
  void RemoveShutdownBlocker();

  /**
   * Called before the thread runs.
   */
  void Init(GraphDriverType aDriverRequested, GraphRunType aRunTypeRequested,
            uint32_t aChannelCount);

  /**
   * Respond to CollectReports with sizes collected on the graph thread.
   */
  static void FinishCollectReports(
      nsIHandleReportCallback* aHandleReport, nsISupports* aData,
      const nsTArray<AudioNodeSizes>& aAudioTrackSizes);

  // The following methods run on the graph thread (or possibly the main thread
  // if mLifecycleState > LIFECYCLE_RUNNING)
  void CollectSizesForMemoryReport(
      already_AddRefed<nsIHandleReportCallback> aHandleReport,
      already_AddRefed<nsISupports> aHandlerData);

  /**
   * Returns true if this MediaTrackGraph should keep running
   */
  bool UpdateMainThreadState();

  /**
   * Proxy method called by GraphDriver to iterate the graph.
   * If this graph was created with GraphRunType SINGLE_THREAD, mGraphRunner
   * will take care of calling OneIterationImpl from its thread. Otherwise,
   * OneIterationImpl is called directly. Mixed audio output from the graph is
   * passed into aMixerReceiver, if it is non-null.
   */
  IterationResult OneIteration(GraphTime aStateTime, GraphTime aIterationEnd,
                               MixerCallbackReceiver* aMixerReceiver) override;

  /**
   * Returns true if this MediaTrackGraph should keep running
   */
  IterationResult OneIterationImpl(GraphTime aStateTime,
                                   GraphTime aIterationEnd,
                                   MixerCallbackReceiver* aMixerReceiver);

  /**
   * Called from the driver, when the graph thread is about to stop, to tell
   * the main thread to attempt to begin cleanup.  The main thread may either
   * shutdown or revive the graph depending on whether it receives new
   * messages.
   */
  void SignalMainThreadCleanup();

  /* This is the end of the current iteration, that is, the current time of the
   * graph. */
  GraphTime IterationEnd() const;

  /**
   * Ensure there is an event posted to the main thread to run RunInStableState.
   * mMonitor must be held.
   * See EnsureRunInStableState
   */
  void EnsureStableStateEventPosted() MOZ_REQUIRES(mMonitor);
  /**
   * Generate messages to the main thread to update it for all state changes.
   * mMonitor must be held.
   */
  void PrepareUpdatesToMainThreadState(bool aFinalUpdate)
      MOZ_REQUIRES(mMonitor);
  /**
   * If we are rendering in non-realtime mode, we don't want to send messages to
   * the main thread at each iteration for performance reasons. We instead
   * notify the main thread at the same rate
   */
  bool ShouldUpdateMainThread();
  // The following methods are the various stages of RunThread processing.
  /**
   * Advance all track state to mStateComputedTime.
   */
  void UpdateCurrentTimeForTracks(GraphTime aPrevCurrentTime);
  /**
   * Process chunks for all tracks and raise events for properties that have
   * changed, such as principalId.
   */
  void ProcessChunkMetadata(GraphTime aPrevCurrentTime);
  /**
   * Process chunks for the given track and interval, and raise events for
   * properties that have changed, such as principalHandle.
   */
  template <typename C, typename Chunk>
  void ProcessChunkMetadataForInterval(MediaTrack* aTrack, C& aSegment,
                                       TrackTime aStart, TrackTime aEnd);
  /**
   * Process graph messages in mFrontMessageQueue.
   */
  void RunMessagesInQueue();
  /**
   * Update track processing order and recompute track blocking until
   * aEndBlockingDecisions.
   */
  void UpdateGraph(GraphTime aEndBlockingDecisions);

  void SwapMessageQueues() MOZ_REQUIRES(mMonitor) {
    MOZ_ASSERT(OnGraphThreadOrNotRunning());
    mMonitor.AssertCurrentThreadOwns();
    MOZ_ASSERT(mFrontMessageQueue.IsEmpty());
    mFrontMessageQueue.SwapElements(mBackMessageQueue);
    if (!mFrontMessageQueue.IsEmpty()) {
      EnsureNextIteration();
    }
  }
  /**
   * Do all the processing and play the audio and video, from
   * mProcessedTime to mStateComputedTime.
   */
  void Process(MixerCallbackReceiver* aMixerReceiver);

  /**
   * For use during ProcessedMediaTrack::ProcessInput() or
   * MediaTrackListener callbacks, when graph state cannot be changed.
   * Schedules |aMessage| to run after processing, at a time when graph state
   * can be changed.  Graph thread.
   */
  void RunMessageAfterProcessing(UniquePtr<ControlMessageInterface> aMessage);

  /* From the main thread, ask the MTG to resolve the returned promise when
   * the device specified has started.
   * A null aDeviceID indicates the default audio output device.
   * The promise is rejected with NS_ERROR_INVALID_ARG if aSink does not
   * correspond to any output devices used by the graph, or
   * NS_ERROR_NOT_AVAILABLE if outputs to the device are removed or
   * NS_ERROR_ILLEGAL_DURING_SHUTDOWN if the graph is force shut down
   * before the promise could be resolved.
   */
  using GraphStartedPromise = GenericPromise;
  RefPtr<GraphStartedPromise> NotifyWhenDeviceStarted(
      CubebUtils::AudioDeviceID aDeviceID) override;

  /**
   * Resolve the GraphStartedPromise when the driver has started processing on
   * the audio thread after the device has started.
   * (Audio is initially processed in the FallbackDriver's thread while the
   * device is starting up.)
   */
  void NotifyWhenPrimaryDeviceStarted(
      MozPromiseHolder<GraphStartedPromise>&& aHolder);

  /**
   * Apply an AudioContext operation (suspend/resume/close), on the graph
   * thread.
   */
  void ApplyAudioContextOperationImpl(
      AudioContextOperationControlMessage* aMessage);

  /**
   * Determine if we have any audio tracks, or are about to add any audiotracks.
   */
  bool AudioTrackPresent();

  /**
   * Schedules a replacement GraphDriver in mNextDriver, if necessary.
   */
  void CheckDriver();

  /**
   * Sort mTracks so that every track not in a cycle is after any tracks
   * it depends on, and every track in a cycle is marked as being in a cycle.
   */
  void UpdateTrackOrder();

  /**
   * Returns smallest value of t such that t is a multiple of
   * WEBAUDIO_BLOCK_SIZE and t >= aTime.
   */
  static GraphTime RoundUpToEndOfAudioBlock(GraphTime aTime);
  /**
   * Returns smallest value of t such that t is a multiple of
   * WEBAUDIO_BLOCK_SIZE and t > aTime.
   */
  static GraphTime RoundUpToNextAudioBlock(GraphTime aTime);
  /**
   * Produce data for all tracks >= aTrackIndex for the current time interval.
   * Advances block by block, each iteration producing data for all tracks
   * for a single block.
   * This is called whenever we have an AudioNodeTrack in the graph.
   */
  void ProduceDataForTracksBlockByBlock(uint32_t aTrackIndex,
                                        TrackRate aSampleRate);
  /**
   * If aTrack will underrun between aTime, and aEndBlockingDecisions, returns
   * the time at which the underrun will start. Otherwise return
   * aEndBlockingDecisions.
   */
  GraphTime WillUnderrun(MediaTrack* aTrack, GraphTime aEndBlockingDecisions);

  /**
   * Given a graph time aTime, convert it to a track time taking into
   * account the time during which aTrack is scheduled to be blocked.
   */
  TrackTime GraphTimeToTrackTimeWithBlocking(const MediaTrack* aTrack,
                                             GraphTime aTime) const;

 private:
  /**
   * Set mOutputDeviceForAEC to indicate the audio output to be passed as the
   * reverse stream for audio echo cancellation.  Graph thread.
   */
  void SelectOutputDeviceForAEC();
  /**
   * Queue audio (mix of track audio and silence for blocked intervals)
   * to the audio output track. Returns the number of frames played.
   */
  struct TrackAndVolume;
  TrackTime PlayAudio(const TrackAndVolume& aOutput, GraphTime aPlayedTime,
                      uint32_t aOutputChannelCount);

 public:
  /* Runs off a message on the graph thread when something requests audio from
   * an input audio device of ID aID, and delivers the input audio frames to
   * aListener. */
  void OpenAudioInputImpl(DeviceInputTrack* aTrack);
  /* Called on the main thread when something requests audio from an input
   * audio device aID. */
  virtual void OpenAudioInput(DeviceInputTrack* aTrack) override;

  /* Runs off a message on the graph when input audio from aID is not needed
   * anymore, for a particular track. It can be that other tracks still need
   * audio from this audio input device. */
  void CloseAudioInputImpl(DeviceInputTrack* aTrack);
  /* Called on the main thread when input audio from aID is not needed
   * anymore, for a particular track. It can be that other tracks still need
   * audio from this audio input device. */
  virtual void CloseAudioInput(DeviceInputTrack* aTrack) override;

  void UnregisterAllAudioOutputs(MediaTrack* aTrack);

  /* Called on the graph thread when the input device settings should be
   * reevaluated, for example, if the channel count of the input track should
   * be changed. */
  void ReevaluateInputDevice(CubebUtils::AudioDeviceID aID);

  /* Called on the graph thread when there is new output data for listeners.
   * This is the mixed audio output of this MediaTrackGraph. */
  void NotifyOutputData(const AudioChunk& aChunk);
  /* Called on the graph thread after an AudioCallbackDriver with an input
   * stream has stopped. */
  void NotifyInputStopped() override;
  /* Called on the graph thread when there is new input data for listeners. This
   * is the raw audio input for this MediaTrackGraph. */
  void NotifyInputData(const AudioDataValue* aBuffer, size_t aFrames,
                       TrackRate aRate, uint32_t aChannels,
                       uint32_t aAlreadyBuffered) override;
  /* Called on the main thread after an AudioCallbackDriver has attempted an
   * operation to set aRequestedParams on the cubeb stream. */
  void NotifySetRequestedInputProcessingParamsResult(
      AudioCallbackDriver* aDriver,
      cubeb_input_processing_params aRequestedParams,
      Result<cubeb_input_processing_params, int>&& aResult) override;
  /* Called every time there are changes to input/output audio devices like
   * plug/unplug etc. This can be called on any thread, and posts a message to
   * the main thread so that it can post a message to the graph thread. */
  void DeviceChanged() override;
  /* Called every time there are changes to input/output audio devices. This is
   * called on the graph thread. */
  void DeviceChangedImpl();

  /**
   * Compute how much track data we would like to buffer for aTrack.
   */
  TrackTime GetDesiredBufferEnd(MediaTrack* aTrack);
  /**
   * Returns true when there are no active tracks.
   */
  bool IsEmpty() const {
    MOZ_ASSERT(
        OnGraphThreadOrNotRunning() ||
        (NS_IsMainThread() &&
         LifecycleStateRef() >= LIFECYCLE_WAITING_FOR_MAIN_THREAD_CLEANUP));
    return mTracks.IsEmpty() && mSuspendedTracks.IsEmpty() && mPortCount == 0;
  }

  /**
   * Add aTrack to the graph and initializes its graph-specific state.
   */
  void AddTrackGraphThread(MediaTrack* aTrack);
  /**
   * Remove aTrack from the graph. Ensures that pending messages about the
   * track back to the main thread are flushed.
   */
  void RemoveTrackGraphThread(MediaTrack* aTrack);
  /**
   * Remove a track from the graph. Main thread.
   */
  void RemoveTrack(MediaTrack* aTrack);
  /**
   * Remove aPort from the graph and release it.
   */
  void DestroyPort(MediaInputPort* aPort);
  /**
   * Mark the media track order as dirty.
   */
  void SetTrackOrderDirty() {
    MOZ_ASSERT(OnGraphThreadOrNotRunning());
    mTrackOrderDirty = true;
  }

 private:
  // Get the current maximum channel count required for a device.
  // aDevice is an element of mOutputDevices.  Graph thread only.
  struct OutputDeviceEntry;
  uint32_t AudioOutputChannelCount(const OutputDeviceEntry& aDevice) const;
  // Get the current maximum channel count for audio output through an
  // AudioCallbackDriver.  Graph thread only.
  uint32_t PrimaryOutputChannelCount() const;

 public:
  // Set a new maximum channel count. Graph thread only.
  void SetMaxOutputChannelCount(uint32_t aMaxChannelCount);

  double AudioOutputLatency();
  /* Return whether the clock for the audio output device used for the AEC
   * reverse stream might drift from the clock for this MediaTrackGraph. */
  bool OutputForAECMightDrift() {
    AssertOnGraphThread();
    return mOutputDeviceForAEC != PrimaryOutputDeviceID();
  }
  /**
   * The audio input channel count for a MediaTrackGraph is the max of all the
   * channel counts requested by the listeners. The max channel count is
   * delivered to the listeners themselves, and they take care of downmixing.
   */
  uint32_t AudioInputChannelCount(CubebUtils::AudioDeviceID aID);

  AudioInputType AudioInputDevicePreference(CubebUtils::AudioDeviceID aID);

  /**
   * The input processing params requested for any processing tracks tied to the
   * input device with id aID.
   */
  cubeb_input_processing_params RequestedAudioInputProcessingParams(
      CubebUtils::AudioDeviceID aID);

  double MediaTimeToSeconds(GraphTime aTime) const {
    NS_ASSERTION(aTime > -TRACK_TIME_MAX && aTime <= TRACK_TIME_MAX,
                 "Bad time");
    return static_cast<double>(aTime) / GraphRate();
  }

  /**
   * Signal to the graph that the thread has paused indefinitly,
   * or resumed.
   */
  void PausedIndefinitly();
  void ResumedFromPaused();

  /**
   * Not safe to call off the MediaTrackGraph thread unless monitor is held!
   */
  GraphDriver* CurrentDriver() const MOZ_NO_THREAD_SAFETY_ANALYSIS {
#ifdef DEBUG
    if (!OnGraphThreadOrNotRunning()) {
      mMonitor.AssertCurrentThreadOwns();
    }
#endif
    return mDriver;
  }

  /**
   * Effectively set the new driver, while we are switching.
   * It is only safe to call this at the very end of an iteration, when there
   * has been a SwitchAtNextIteration call during the iteration. The driver
   * should return and pass the control to the new driver shortly after.
   * Monitor must be held.
   */
  void SetCurrentDriver(GraphDriver* aDriver) {
    MOZ_ASSERT_IF(mGraphDriverRunning, InDriverIteration(mDriver));
    MOZ_ASSERT_IF(!mGraphDriverRunning, NS_IsMainThread());
    MonitorAutoLock lock(GetMonitor());
    mDriver = aDriver;
  }

  GraphDriver* NextDriver() const {
    MOZ_ASSERT(OnGraphThread());
    return mNextDriver;
  }

  bool Switching() const { return NextDriver(); }

  void SwitchAtNextIteration(GraphDriver* aNextDriver);

  Monitor& GetMonitor() { return mMonitor; }

  void EnsureNextIteration() { CurrentDriver()->EnsureNextIteration(); }

  // Capture API. This allows to get a mixed-down output for a window.
  void RegisterCaptureTrackForWindow(uint64_t aWindowId,
                                     ProcessedMediaTrack* aCaptureTrack);
  void UnregisterCaptureTrackForWindow(uint64_t aWindowId);
  already_AddRefed<MediaInputPort> ConnectToCaptureTrack(
      uint64_t aWindowId, MediaTrack* aMediaTrack);

  Watchable<GraphTime>& CurrentTime() override;

  /**
   * Interrupt any JS running on the graph thread.
   * Called on the main thread when shutting down the graph.
   */
  void InterruptJS();

  class TrackSet {
   public:
    class iterator {
     public:
      explicit iterator(MediaTrackGraphImpl& aGraph)
          : mGraph(&aGraph), mArrayNum(-1), mArrayIndex(0) {
        ++(*this);
      }
      iterator() : mGraph(nullptr), mArrayNum(2), mArrayIndex(0) {}
      MediaTrack* operator*() { return Array()->ElementAt(mArrayIndex); }
      iterator operator++() {
        ++mArrayIndex;
        while (mArrayNum < 2 &&
               (mArrayNum < 0 || mArrayIndex >= Array()->Length())) {
          ++mArrayNum;
          mArrayIndex = 0;
        }
        return *this;
      }
      bool operator==(const iterator& aOther) const {
        return mArrayNum == aOther.mArrayNum &&
               mArrayIndex == aOther.mArrayIndex;
      }
      bool operator!=(const iterator& aOther) const {
        return !(*this == aOther);
      }

     private:
      nsTArray<MediaTrack*>* Array() {
        return mArrayNum == 0 ? &mGraph->mTracks : &mGraph->mSuspendedTracks;
      }
      MediaTrackGraphImpl* mGraph;
      int mArrayNum;
      uint32_t mArrayIndex;
    };

    explicit TrackSet(MediaTrackGraphImpl& aGraph) : mGraph(aGraph) {}
    iterator begin() { return iterator(mGraph); }
    iterator end() { return iterator(); }

   private:
    MediaTrackGraphImpl& mGraph;
  };
  TrackSet AllTracks() { return TrackSet(*this); }

  // Data members

  /**
   * The ID of the inner Window which uses this graph, or zero for offline
   * graphs.
   */
  const uint64_t mWindowID;
  /*
   * If set, the GraphRunner class handles handing over data from audio
   * callbacks to a common single thread, shared across GraphDrivers.
   */
  RefPtr<GraphRunner> mGraphRunner;

  /**
   * Main-thread view of the number of tracks in this graph, for lifetime
   * management.
   *
   * When this becomes zero, the graph is marked as forbidden to add more
   * tracks to. It will be shut down shortly after.
   */
  size_t mMainThreadTrackCount = 0;

  /**
   * Main-thread view of the number of ports in this graph, to catch bugs.
   *
   * When this becomes zero, and mMainThreadTrackCount is 0, the graph is
   * marked as forbidden to add more control messages to. It will be shut down
   * shortly after.
   */
  size_t mMainThreadPortCount = 0;

  /**
   * Graphs own owning references to their driver, until shutdown. When a driver
   * switch occur, previous driver is either deleted, or it's ownership is
   * passed to a event that will take care of the asynchronous cleanup, as
   * audio track can take some time to shut down.
   * Accessed on both the main thread and the graph thread; both read and write.
   * Must hold monitor to access it.
   */
  RefPtr<GraphDriver> mDriver;

  // Set during an iteration to switch driver after the iteration has finished.
  // Should the current iteration be the last iteration, the next driver will be
  // discarded. Access through SwitchAtNextIteration()/NextDriver(). Graph
  // thread only.
  RefPtr<GraphDriver> mNextDriver;

  // The following state is managed on the graph thread only, unless
  // mLifecycleState > LIFECYCLE_RUNNING in which case the graph thread
  // is not running and this state can be used from the main thread.

  /**
   * The graph keeps a reference to each track.
   * References are maintained manually to simplify reordering without
   * unnecessary thread-safe refcount changes.
   * Must satisfy OnGraphThreadOrNotRunning().
   */
  nsTArray<MediaTrack*> mTracks;
  /**
   * This stores MediaTracks that are part of suspended AudioContexts.
   * mTracks and mSuspendTracks are disjoint sets: a track is either suspended
   * or not suspended. Suspended tracks are not ordered in UpdateTrackOrder,
   * and are therefore not doing any processing.
   * Must satisfy OnGraphThreadOrNotRunning().
   */
  nsTArray<MediaTrack*> mSuspendedTracks;
  /**
   * Tracks from mFirstCycleBreaker to the end of mTracks produce output before
   * they receive input.  They correspond to DelayNodes that are in cycles.
   */
  uint32_t mFirstCycleBreaker;
  /**
   * Blocking decisions have been computed up to this time.
   * Between each iteration, this is the same as mProcessedTime.
   */
  GraphTime mStateComputedTime = 0;
  /**
   * All track contents have been computed up to this time.
   * The next batch of updates from the main thread will be processed
   * at this time.  This is behind mStateComputedTime during processing.
   */
  GraphTime mProcessedTime = 0;
  /**
   * The graph should stop processing at this time.
   */
  GraphTime mEndTime;
  /**
   * Date of the last time we updated the main thread with the graph state.
   */
  TimeStamp mLastMainThreadUpdate;
  /**
   * Number of active MediaInputPorts
   */
  int32_t mPortCount;
  /**
   * Runnables to run after the next update to main thread state, but that are
   * still waiting for the next iteration to finish.
   */
  nsTArray<nsCOMPtr<nsIRunnable>> mPendingUpdateRunnables;

  /**
   * List of resume operations waiting for a switch to an AudioCallbackDriver.
   */
  class PendingResumeOperation {
   public:
    explicit PendingResumeOperation(
        AudioContextOperationControlMessage* aMessage);
    void Apply(MediaTrackGraphImpl* aGraph);
    void Abort();
    MediaTrack* DestinationTrack() const { return mDestinationTrack; }

   private:
    RefPtr<MediaTrack> mDestinationTrack;
    nsTArray<RefPtr<MediaTrack>> mTracks;
    MozPromiseHolder<AudioContextOperationPromise> mHolder;
  };
  AutoTArray<PendingResumeOperation, 1> mPendingResumeOperations;

  // mMonitor guards the data below.
  // MediaTrackGraph normally does its work without holding mMonitor, so it is
  // not safe to just grab mMonitor from some thread and start monkeying with
  // the graph. Instead, communicate with the graph thread using provided
  // mechanisms such as the control message queue.
  Monitor mMonitor;

  // Data guarded by mMonitor (must always be accessed with mMonitor held,
  // regardless of the value of mLifecycleState).

  /**
   * State to copy to main thread
   */
  nsTArray<TrackUpdate> mTrackUpdates MOZ_GUARDED_BY(mMonitor);
  /**
   * Runnables to run after the next update to main thread state.
   */
  nsTArray<nsCOMPtr<nsIRunnable>> mUpdateRunnables MOZ_GUARDED_BY(mMonitor);
  /**
   * A list of batches of messages to process. Each batch is processed
   * as an atomic unit.
   */
  /*
   * Message queue processed by the MTG thread during an iteration.
   * Accessed on graph thread only.
   */
  nsTArray<MessageBlock> mFrontMessageQueue;
  /*
   * Message queue in which the main thread appends messages.
   * Access guarded by mMonitor.
   */
  nsTArray<MessageBlock> mBackMessageQueue MOZ_GUARDED_BY(mMonitor);

  /* True if there will messages to process if we swap the message queues. */
  bool MessagesQueued() const MOZ_REQUIRES(mMonitor) {
    mMonitor.AssertCurrentThreadOwns();
    return !mBackMessageQueue.IsEmpty();
  }
  /**
   * This enum specifies where this graph is in its lifecycle. This is used
   * to control shutdown.
   * Shutdown is tricky because it can happen in two different ways:
   * 1) Shutdown due to inactivity. RunThread() detects that it has no
   * pending messages and no tracks, and exits. The next RunInStableState()
   * checks if there are new pending messages from the main thread (true only
   * if new track creation raced with shutdown); if there are, it revives
   * RunThread(), otherwise it commits to shutting down the graph. New track
   * creation after this point will create a new graph. An async event is
   * dispatched to Shutdown() the graph's threads and then delete the graph
   * object.
   * 2) Forced shutdown at application shutdown, completion of a non-realtime
   * graph, or document unload. A flag is set, RunThread() detects the flag
   * and exits, the next RunInStableState() detects the flag, and dispatches
   * the async event to Shutdown() the graph's threads. However the graph
   * object is not deleted. New messages for the graph are processed
   * synchronously on the main thread if necessary. When the last track is
   * destroyed, the graph object is deleted.
   *
   * This should be kept in sync with the LifecycleState_str array in
   * MediaTrackGraph.cpp
   */
  enum LifecycleState {
    // The graph thread hasn't started yet.
    LIFECYCLE_THREAD_NOT_STARTED,
    // RunThread() is running normally.
    LIFECYCLE_RUNNING,
    // In the following states, the graph thread is not running so
    // all "graph thread only" state in this class can be used safely
    // on the main thread.
    // RunThread() has exited and we're waiting for the next
    // RunInStableState(), at which point we can clean up the main-thread
    // side of the graph.
    LIFECYCLE_WAITING_FOR_MAIN_THREAD_CLEANUP,
    // RunInStableState() posted a ShutdownRunnable, and we're waiting for it
    // to shut down the graph thread(s).
    LIFECYCLE_WAITING_FOR_THREAD_SHUTDOWN,
    // Graph threads have shut down but we're waiting for remaining tracks
    // to be destroyed. Only happens during application shutdown and on
    // completed non-realtime graphs, since normally we'd only shut down a
    // realtime graph when it has no tracks.
    LIFECYCLE_WAITING_FOR_TRACK_DESTRUCTION
  };

  /**
   * Modified only in mMonitor.  Transitions to
   * LIFECYCLE_WAITING_FOR_MAIN_THREAD_CLEANUP occur on the graph thread at
   * the end of an iteration.  All other transitions occur on the main thread.
   */
  LifecycleState mLifecycleState MOZ_GUARDED_BY(mMonitor);
  LifecycleState& LifecycleStateRef() MOZ_NO_THREAD_SAFETY_ANALYSIS {
#if DEBUG
    if (mGraphDriverRunning) {
      mMonitor.AssertCurrentThreadOwns();
    } else {
      MOZ_ASSERT(NS_IsMainThread());
    }
#endif
    return mLifecycleState;
  }
  const LifecycleState& LifecycleStateRef() const
      MOZ_NO_THREAD_SAFETY_ANALYSIS {
#if DEBUG
    if (mGraphDriverRunning) {
      mMonitor.AssertCurrentThreadOwns();
    } else {
      MOZ_ASSERT(NS_IsMainThread());
    }
#endif
    return mLifecycleState;
  }

  /**
   * True once the graph thread has received the message from ForceShutDown().
   * This is checked in the decision to shut down the
   * graph thread so that control messages dispatched before forced shutdown
   * are processed on the graph thread.
   * Only set on the graph thread.
   * Can be read safely on the thread currently owning the graph, as indicated
   * by mLifecycleState.
   */
  bool mForceShutDownReceived = false;
  /**
   * true when InterruptJS() has been called, because shutdown (normal or
   * forced) has commenced.  Set on the main thread under mMonitor and read on
   * the graph thread under mMonitor.
   **/
  bool mInterruptJSCalled MOZ_GUARDED_BY(mMonitor) = false;

  /**
   * Remove this blocker to unblock shutdown.
   * Only accessed on the main thread.
   **/
  RefPtr<media::ShutdownBlocker> mShutdownBlocker;

  /**
   * True when we have posted an event to the main thread to run
   * RunInStableState() and the event hasn't run yet.
   * Accessed on both main and MTG thread, mMonitor must be held.
   */
  bool mPostedRunInStableStateEvent MOZ_GUARDED_BY(mMonitor);

  /**
   * The JSContext of the graph thread.  Set under mMonitor on only the graph
   * or GraphRunner thread.  Once set this does not change until reset when
   * the thread is about to exit.  Read under mMonitor on the main thread to
   * interrupt running JS for forced shutdown.
   **/
  JSContext* mJSContext MOZ_GUARDED_BY(mMonitor) = nullptr;

  // Main thread only

  /**
   * Messages posted by the current event loop task. These are forwarded to
   * the media graph thread during RunInStableState. We can't forward them
   * immediately because we want all messages between stable states to be
   * processed as an atomic batch.
   */
  nsTArray<UniquePtr<ControlMessageInterface>> mCurrentTaskMessageQueue;
  /**
   * True from when RunInStableState sets mLifecycleState to LIFECYCLE_RUNNING,
   * until RunInStableState has determined that mLifecycleState is >
   * LIFECYCLE_RUNNING.
   */
  Atomic<bool> mGraphDriverRunning;
  /**
   * True when a stable state runner has been posted to the appshell to run
   * RunInStableState at the next stable state.
   * Only accessed on the main thread.
   */
  bool mPostedRunInStableState;
  /**
   * True when processing real-time audio/video.  False when processing
   * non-realtime audio.
   */
  bool mRealtime;
  /**
   * True when a change has happened which requires us to recompute the track
   * blocking order.
   */
  bool mTrackOrderDirty;
  const RefPtr<nsISerialEventTarget> mMainThread;

  // used to limit graph shutdown time
  // Only accessed on the main thread.
  nsCOMPtr<nsITimer> mShutdownTimer;

 protected:
  virtual ~MediaTrackGraphImpl();

 private:
  MOZ_DEFINE_MALLOC_SIZE_OF(MallocSizeOf)

  // Set a new native iput device when the current native input device is close.
  // Main thread only.
  void SetNewNativeInput();

  /**
   * This class uses manual memory management, and all pointers to it are raw
   * pointers. However, in order for it to implement nsIMemoryReporter, it needs
   * to implement nsISupports and so be ref-counted. So it maintains a single
   * nsRefPtr to itself, giving it a ref-count of 1 during its entire lifetime,
   * and Destroy() nulls this self-reference in order to trigger self-deletion.
   */
  RefPtr<MediaTrackGraphImpl> mSelfRef;

  struct WindowAndTrack {
    uint64_t mWindowId;
    RefPtr<ProcessedMediaTrack> mCaptureTrackSink;
  };
  /**
   * Track for window audio capture.
   */
  nsTArray<WindowAndTrack> mWindowCaptureTracks;

  /**
   * Main thread unordered record of audio outputs, keyed by Track and output
   * key.  Used to determine when an output device is no longer in use and to
   * record the volumes corresponding to each key.  An array is used as a
   * simple hash table, on the assumption that the number of outputs is small.
   */
  struct TrackAndKey {
    MOZ_UNSAFE_REF("struct exists only if track exists") MediaTrack* mTrack;
    void* mKey;
  };
  struct TrackKeyDeviceAndVolume {
    MOZ_UNSAFE_REF("struct exists only if track exists")
    MediaTrack* const mTrack;
    void* const mKey;
    const CubebUtils::AudioDeviceID mDeviceID;
    float mVolume;

    bool operator==(const TrackAndKey& aTrackAndKey) const {
      return mTrack == aTrackAndKey.mTrack && mKey == aTrackAndKey.mKey;
    }
  };
  nsTArray<TrackKeyDeviceAndVolume> mAudioOutputParams;
  /**
   * Main thread record of which audio output devices are active, keyed by
   * AudioDeviceID, and their CrossGraphReceivers if any.
   * mOutputDeviceRefCnts[0] always exists and corresponds to the primary
   * audio output device, which an AudioCallbackDriver will use if active.
   * mCount may be zero for the first entry only.  */
  struct DeviceReceiverAndCount {
    const CubebUtils::AudioDeviceID mDeviceID;
    // For secondary devices, mReceiver receives audio output.
    // Null for the primary output device, fed by an AudioCallbackDriver.
    const RefPtr<CrossGraphReceiver> mReceiver;
    size_t mRefCnt;  // number of mAudioOutputParams entries with this device

    bool operator==(CubebUtils::AudioDeviceID aDeviceID) const {
      return mDeviceID == aDeviceID;
    }
  };
  nsTArray<DeviceReceiverAndCount> mOutputDeviceRefCnts;
  /**
   * Graph thread record of devices to which audio outputs are mixed, keyed by
   * AudioDeviceID.  All tracks that have an audio output to each device are
   * grouped for mixing their outputs to a single stream.
   * mOutputDevices[0] always exists and corresponds to the primary audio
   * output device, which an AudioCallbackDriver will use if active.
   * An AudioCallbackDriver may be active when no audio outputs have audio
   * outputs.
   */
  struct TrackAndVolume {
    MOZ_UNSAFE_REF("struct exists only if track exists")
    MediaTrack* const mTrack;
    float mVolume;

    bool operator==(const MediaTrack* aTrack) const { return mTrack == aTrack; }
  };
  struct OutputDeviceEntry {
    const CubebUtils::AudioDeviceID mDeviceID;
    // For secondary devices, mReceiver receives audio output.
    // Null for the primary output device, fed by an AudioCallbackDriver.
    const RefPtr<CrossGraphReceiver> mReceiver;
    /**
     * Mapping from MediaTrack to volume for all tracks that have their audio
     * output mixed and written to this output device.
     */
    nsTArray<TrackAndVolume> mTrackOutputs;

    bool operator==(CubebUtils::AudioDeviceID aDeviceID) const {
      return mDeviceID == aDeviceID;
    }
  };
  nsTArray<OutputDeviceEntry> mOutputDevices;
  /**
   * mOutputDeviceForAEC identifies the audio output to be passed as the
   * reverse stream for audio echo cancellation.  Used only if a microphone is
   * active.  Graph thread.
   */
  CubebUtils::AudioDeviceID mOutputDeviceForAEC = nullptr;

  /**
   * Global volume scale. Used when running tests so that the output is not too
   * loud.
   */
  const float mGlobalVolume;

#ifdef DEBUG
 protected:
  /**
   * Used to assert when AppendMessage() runs control messages synchronously.
   */
  bool mCanRunMessagesSynchronously;
#endif

 private:
  /**
   * The graph's main-thread observable graph time.
   * Updated by the stable state runnable after each iteration.
   */
  Watchable<GraphTime> mMainThreadGraphTime;

  /**
   * Set based on mProcessedTime at end of iteration.
   * Read by stable state runnable on main thread. Protected by mMonitor.
   */
  GraphTime mNextMainThreadGraphTime MOZ_GUARDED_BY(mMonitor) = 0;

  /**
   * Cached audio output latency, in seconds. Main thread only. This is reset
   * whenever the audio device running this MediaTrackGraph changes.
   */
  double mAudioOutputLatency;

  /**
   * The max audio output channel count the default audio output device
   * supports. This is cached here because it can be expensive to query. The
   * cache is invalidated when the device is changed. This is initialized in the
   * ctor, and the read/write only on the graph thread.
   */
  uint32_t mMaxOutputChannelCount;

 public:
  /**
   * Manage the native or non-native input device in graph. Main thread only.
   */
  DeviceInputTrackManager mDeviceInputTrackManagerMainThread;

 private:
  /**
   * Manage the native or non-native input device in graph. Graph thread only.
   */
  DeviceInputTrackManager mDeviceInputTrackManagerGraphThread;
  /**
   * The mixer that the graph mixes into during an iteration. This is here
   * rather than on the stack so that its buffer is not allocated each
   * iteration. Graph thread only.
   */
  AudioMixer mMixer;
};

}  // namespace mozilla

#endif /* MEDIATRACKGRAPHIMPL_H_ */
