/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsSpeechTask.h"

#include "AudioChannelService.h"
#include "AudioSegment.h"
#include "SharedBuffer.h"
#include "SpeechSynthesis.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/ContentMediaController.h"
#include "mozilla/dom/MediaControlUtils.h"
#include "nsGlobalWindowInner.h"
#include "nsPIDOMWindowInlines.h"
#include "nsSynthVoiceRegistry.h"
#include "nsXULAppAPI.h"

#undef LOG
extern mozilla::LogModule* GetSpeechSynthLog();
#define LOG(type, msg) \
  MOZ_LOG_FMT(GetSpeechSynthLog(), type, MOZ_LOG_EXPAND_ARGS msg)

#define MEDIA_CONTROL_LOG(msg, ...) \
  MOZ_LOG_FMT(gMediaControlLog, LogLevel::Debug, msg, ##__VA_ARGS__)

#define AUDIO_TRACK 1

namespace mozilla::dom {

// Registers the speech task as an uncontrollable receiver while it is
// speaking, reports audibility, and reacts to media control keys. The owning
// nsSpeechTask outlives this listener (Shutdown() runs from
// DispatchEndImpl/DispatchErrorImpl before the task is released), so the
// back-reference is always valid until Shutdown.
//
// Note that on Linux/speechd and Android, nsISpeechService::OnPause is a
// no-op, so MediaControlKey::Stop will not actually silence speech on those
// platforms (tracked by Bug 2038329 / Bug 1238538). Audibility is still
// reported so the tab sound indicator and the audiblechange event remain
// accurate.
class MediaSharedKeysListener final : public ContentMediaControlKeyReceiver {
 public:
  NS_INLINE_DECL_REFCOUNTING(MediaSharedKeysListener, override)

  // The W3C Audio Session API does not cover Web Speech / SpeechSynthesis;
  // see https://github.com/w3c/audio-session/issues/28. We tag utterances as
  // "transient" as an interim choice — short-lived TTS briefly takes focus
  // and may duck concurrent audio for the utterance's duration. Revisit and
  // align with the spec once it adds Web Speech support.
  static constexpr AudioSessionType kSessionType = AudioSessionType::Transient;

  explicit MediaSharedKeysListener(nsSpeechTask& aTask) : mTask(aTask) {
    MOZ_ASSERT(NS_IsMainThread());
  }

  void Start(nsPIDOMWindowInner* aWindow) {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(!mAgent, "Start() must not be retried");
    BrowsingContext* bc = aWindow ? aWindow->GetBrowsingContext() : nullptr;
    if (!bc) {
      MEDIA_CONTROL_LOG(
          "MediaSharedKeysListener {} Start: no browsing context, skip",
          fmt::ptr(this));
      return;
    }
    mAgent = ContentMediaAgent::Get(bc);
    if (!mAgent) {
      MEDIA_CONTROL_LOG(
          "MediaSharedKeysListener {} Start: no ContentMediaAgent, skip",
          fmt::ptr(this));
      return;
    }
    mBrowsingContextId = bc->Id();
    mAgent->AddReceiver(this, ControlType::eUncontrollable);
    // Speech is audible from the moment the platform starts speaking until
    // DispatchEnd; there is no separate audibility detection.
    mAgent->NotifyMediaAudibleChanged(
        mBrowsingContextId, MediaAudibleState::eAudible,
        ControlType::eUncontrollable, kSessionType);
    mIsAudible = true;
    MEDIA_CONTROL_LOG(
        "MediaSharedKeysListener {} Start: registered as uncontrollable "
        "receiver and reported audible in BC {}",
        fmt::ptr(this), mBrowsingContextId);
  }

  void Shutdown() {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(!mShutdown, "Shutdown() must not be retried");
    mShutdown = true;
    if (!mAgent) {
      // Start() bailed out (no BC or no agent at the time); nothing to undo.
      MEDIA_CONTROL_LOG(
          "MediaSharedKeysListener {} Shutdown: never registered, skip",
          fmt::ptr(this));
      return;
    }
    if (mIsAudible) {
      mAgent->NotifyMediaAudibleChanged(
          mBrowsingContextId, MediaAudibleState::eInaudible,
          ControlType::eUncontrollable, kSessionType);
      mIsAudible = false;
    }
    mAgent->RemoveReceiver(this, ControlType::eUncontrollable);
    mAgent = nullptr;
    MEDIA_CONTROL_LOG(
        "MediaSharedKeysListener {} Shutdown: unregistered from BC {}",
        fmt::ptr(this), mBrowsingContextId);
  }

  bool IsPlaying() const override { return mTask.IsSpeaking(); }

  void HandleMediaKey(MediaControlKey aKey,
                      const MediaControlActionParams& aParams) override {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(!mShutdown, "HandleMediaKey must not be called after Shutdown");
    MEDIA_CONTROL_LOG("MediaSharedKeysListener {} HandleMediaKey '{}'",
                      fmt::ptr(this), GetEnumString(aKey).get());
    if (aKey == MediaControlKey::Stop) {
      mTask.Pause();
    }
    // TODO: implement Setvolume/Mute/Unmute for Web Speech.
  }

 private:
  ~MediaSharedKeysListener() = default;

  nsSpeechTask& mTask;
  RefPtr<ContentMediaAgent> mAgent;
  uint64_t mBrowsingContextId = 0;
  bool mIsAudible = false;
  bool mShutdown = false;
};

// nsSpeechTask

NS_IMPL_CYCLE_COLLECTION_WEAK(nsSpeechTask, mSpeechSynthesis, mUtterance,
                              mCallback, mAudioChannelAgent)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(nsSpeechTask)
  NS_INTERFACE_MAP_ENTRY(nsISpeechTask)
  NS_INTERFACE_MAP_ENTRY(nsIAudioChannelAgentCallback)
  NS_INTERFACE_MAP_ENTRY(nsISupportsWeakReference)
  NS_INTERFACE_MAP_ENTRY_AMBIGUOUS(nsISupports, nsISpeechTask)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(nsSpeechTask)
NS_IMPL_CYCLE_COLLECTING_RELEASE(nsSpeechTask)

nsSpeechTask::nsSpeechTask(SpeechSynthesisUtterance* aUtterance,
                           bool aShouldResistFingerprinting)
    : mUtterance(aUtterance),
      mInited(false),
      mPrePaused(false),
      mPreCanceled(false),
      mCallback(nullptr),
      mShouldResistFingerprinting(aShouldResistFingerprinting),
      mState(STATE_PENDING) {
  mText = aUtterance->mText;
  mVolume = aUtterance->Volume();
}

nsSpeechTask::nsSpeechTask(float aVolume, const nsAString& aText,
                           bool aShouldResistFingerprinting)
    : mUtterance(nullptr),
      mVolume(aVolume),
      mText(aText),
      mInited(false),
      mPrePaused(false),
      mPreCanceled(false),
      mCallback(nullptr),
      mShouldResistFingerprinting(aShouldResistFingerprinting),
      mState(STATE_PENDING) {}

nsSpeechTask::~nsSpeechTask() { LOG(LogLevel::Debug, ("~nsSpeechTask")); }

void nsSpeechTask::Init() { mInited = true; }

void nsSpeechTask::SetChosenVoiceURI(const nsAString& aUri) {
  mChosenVoiceURI = aUri;
}

NS_IMETHODIMP
nsSpeechTask::Setup(nsISpeechTaskCallback* aCallback) {
  MOZ_ASSERT(XRE_IsParentProcess());

  LOG(LogLevel::Debug, ("nsSpeechTask::Setup"));

  mCallback = aCallback;

  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::DispatchStart() {
  nsSynthVoiceRegistry::GetInstance()->SetIsSpeaking(true);
  return DispatchStartImpl();
}

nsresult nsSpeechTask::DispatchStartImpl() {
  return DispatchStartImpl(mChosenVoiceURI);
}

nsresult nsSpeechTask::DispatchStartImpl(const nsAString& aUri) {
  LOG(LogLevel::Debug, ("nsSpeechTask::DispatchStartImpl"));

  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(mState != STATE_PENDING)) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  CreateAudioChannelAgent();

  mSharedKeysListener = new MediaSharedKeysListener(*this);
  mSharedKeysListener->Start(mUtterance->GetOwnerWindow());

  mState = STATE_SPEAKING;
  mUtterance->mChosenVoiceURI = aUri;
  mUtterance->DispatchSpeechSynthesisEvent(u"start"_ns, 0, nullptr, 0, u""_ns);

  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::DispatchEnd(float aElapsedTime, uint32_t aCharIndex) {
  // After we end, no callback functions should go through.
  mCallback = nullptr;

  if (!mPreCanceled) {
    nsSynthVoiceRegistry::GetInstance()->SpeakNext();
  }

  return DispatchEndImpl(aElapsedTime, aCharIndex);
}

nsresult nsSpeechTask::DispatchEndImpl(float aElapsedTime,
                                       uint32_t aCharIndex) {
  LOG(LogLevel::Debug, ("nsSpeechTask::DispatchEndImpl"));

  DestroyAudioChannelAgent();

  if (mSharedKeysListener) {
    mSharedKeysListener->Shutdown();
    mSharedKeysListener = nullptr;
  }

  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(mState == STATE_ENDED)) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  RefPtr<SpeechSynthesisUtterance> utterance = mUtterance;

  if (mSpeechSynthesis) {
    mSpeechSynthesis->OnEnd(this);
  }

  mState = STATE_ENDED;
  utterance->DispatchSpeechSynthesisEvent(u"end"_ns, aCharIndex, nullptr,
                                          aElapsedTime, u""_ns);

  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::DispatchPause(float aElapsedTime, uint32_t aCharIndex) {
  return DispatchPauseImpl(aElapsedTime, aCharIndex);
}

nsresult nsSpeechTask::DispatchPauseImpl(float aElapsedTime,
                                         uint32_t aCharIndex) {
  LOG(LogLevel::Debug, ("nsSpeechTask::DispatchPauseImpl"));
  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(mUtterance->mPaused)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (NS_WARN_IF(mState == STATE_ENDED)) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  mUtterance->mPaused = true;
  if (mState == STATE_SPEAKING) {
    mUtterance->DispatchSpeechSynthesisEvent(u"pause"_ns, aCharIndex, nullptr,
                                             aElapsedTime, u""_ns);
  }

  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::DispatchResume(float aElapsedTime, uint32_t aCharIndex) {
  return DispatchResumeImpl(aElapsedTime, aCharIndex);
}

nsresult nsSpeechTask::DispatchResumeImpl(float aElapsedTime,
                                          uint32_t aCharIndex) {
  LOG(LogLevel::Debug, ("nsSpeechTask::DispatchResumeImpl"));
  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(!(mUtterance->mPaused))) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  if (NS_WARN_IF(mState == STATE_ENDED)) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  mUtterance->mPaused = false;
  if (mState == STATE_SPEAKING) {
    mUtterance->DispatchSpeechSynthesisEvent(u"resume"_ns, aCharIndex, nullptr,
                                             aElapsedTime, u""_ns);
  }

  return NS_OK;
}

void nsSpeechTask::ForceError(float aElapsedTime, uint32_t aCharIndex) {
  DispatchError(aElapsedTime, aCharIndex);
}

NS_IMETHODIMP
nsSpeechTask::DispatchError(float aElapsedTime, uint32_t aCharIndex) {
  if (!mPreCanceled) {
    nsSynthVoiceRegistry::GetInstance()->SpeakNext();
  }

  return DispatchErrorImpl(aElapsedTime, aCharIndex);
}

nsresult nsSpeechTask::DispatchErrorImpl(float aElapsedTime,
                                         uint32_t aCharIndex) {
  LOG(LogLevel::Debug, ("nsSpeechTask::DispatchErrorImpl"));

  DestroyAudioChannelAgent();

  if (mSharedKeysListener) {
    mSharedKeysListener->Shutdown();
    mSharedKeysListener = nullptr;
  }

  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(mState == STATE_ENDED)) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  if (mSpeechSynthesis) {
    mSpeechSynthesis->OnEnd(this);
  }

  mState = STATE_ENDED;
  mUtterance->DispatchSpeechSynthesisEvent(u"error"_ns, aCharIndex, nullptr,
                                           aElapsedTime, u""_ns);
  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::DispatchBoundary(const nsAString& aName, float aElapsedTime,
                               uint32_t aCharIndex, uint32_t aCharLength,
                               uint8_t argc) {
  return DispatchBoundaryImpl(aName, aElapsedTime, aCharIndex, aCharLength,
                              argc);
}

nsresult nsSpeechTask::DispatchBoundaryImpl(const nsAString& aName,
                                            float aElapsedTime,
                                            uint32_t aCharIndex,
                                            uint32_t aCharLength,
                                            uint8_t argc) {
  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(mState != STATE_SPEAKING)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  mUtterance->DispatchSpeechSynthesisEvent(
      u"boundary"_ns, aCharIndex,
      argc ? static_cast<Nullable<uint32_t> >(aCharLength) : nullptr,
      aElapsedTime, aName);

  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::DispatchMark(const nsAString& aName, float aElapsedTime,
                           uint32_t aCharIndex) {
  return DispatchMarkImpl(aName, aElapsedTime, aCharIndex);
}

nsresult nsSpeechTask::DispatchMarkImpl(const nsAString& aName,
                                        float aElapsedTime,
                                        uint32_t aCharIndex) {
  MOZ_ASSERT(mUtterance);
  if (NS_WARN_IF(mState != STATE_SPEAKING)) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  mUtterance->DispatchSpeechSynthesisEvent(u"mark"_ns, aCharIndex, nullptr,
                                           aElapsedTime, aName);
  return NS_OK;
}

void nsSpeechTask::Pause() {
  MOZ_ASSERT(XRE_IsParentProcess());

  RefPtr<nsSpeechTask> kungFuDeathGrip(this);
  if (mCallback) {
    DebugOnly<nsresult> rv = mCallback->OnPause();
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv), "Unable to call onPause() callback");
  }

  if (!mInited) {
    mPrePaused = true;
  }
}

void nsSpeechTask::Resume() {
  MOZ_ASSERT(XRE_IsParentProcess());

  RefPtr<nsSpeechTask> kungFuDeathGrip(this);
  if (mCallback) {
    DebugOnly<nsresult> rv = mCallback->OnResume();
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "Unable to call onResume() callback");
  }

  if (mPrePaused) {
    mPrePaused = false;
    nsSynthVoiceRegistry::GetInstance()->ResumeQueue();
  }
}

void nsSpeechTask::Cancel() {
  MOZ_ASSERT(XRE_IsParentProcess());

  LOG(LogLevel::Debug, ("nsSpeechTask::Cancel"));

  if (nsCOMPtr<nsISpeechTaskCallback> callback = mCallback) {
    DebugOnly<nsresult> rv = callback->OnCancel();
    NS_WARNING_ASSERTION(NS_SUCCEEDED(rv),
                         "Unable to call onCancel() callback");
  }

  if (!mInited) {
    mPreCanceled = true;
  }
}

void nsSpeechTask::ForceEnd() {
  if (!mInited) {
    mPreCanceled = true;
  }

  DispatchEnd(0, 0);
}

void nsSpeechTask::SetSpeechSynthesis(SpeechSynthesis* aSpeechSynthesis) {
  mSpeechSynthesis = aSpeechSynthesis;
}

void nsSpeechTask::CreateAudioChannelAgent() {
  if (!mUtterance) {
    return;
  }

  if (mAudioChannelAgent) {
    mAudioChannelAgent->NotifyStoppedPlaying();
  }

  mAudioChannelAgent = new AudioChannelAgent();
  mAudioChannelAgent->InitWithWeakCallback(mUtterance->GetOwnerWindow(), this);

  nsresult rv = mAudioChannelAgent->NotifyStartedPlaying(
      AudioChannelService::AudibleState::eAudible);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return;
  }

  mAudioChannelAgent->PullInitialUpdate();
}

void nsSpeechTask::DestroyAudioChannelAgent() {
  if (mAudioChannelAgent) {
    mAudioChannelAgent->NotifyStoppedPlaying();
    mAudioChannelAgent = nullptr;
  }
}

NS_IMETHODIMP
nsSpeechTask::WindowVolumeChanged(float aVolume, bool aMuted) {
  SetAudioOutputVolume(aMuted ? 0.0 : mVolume * aVolume);
  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::WindowSuspendChanged(nsSuspendedTypes aSuspend) {
  if (!mUtterance) {
    return NS_OK;
  }

  if (aSuspend == nsISuspendedTypes::NONE_SUSPENDED && mUtterance->mPaused) {
    Resume();
  } else if (aSuspend != nsISuspendedTypes::NONE_SUSPENDED &&
             !mUtterance->mPaused) {
    Pause();
  }
  return NS_OK;
}

NS_IMETHODIMP
nsSpeechTask::WindowAudioCaptureChanged(bool aCapture) {
  // This is not supported yet.
  return NS_OK;
}

void nsSpeechTask::SetAudioOutputVolume(float aVolume) {
  if (mCallback) {
    mCallback->OnVolumeChanged(aVolume);
  }
}

}  // namespace mozilla::dom

#undef MEDIA_CONTROL_LOG
