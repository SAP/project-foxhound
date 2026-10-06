/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ContentMediaController.h"

#include "MediaControlUtils.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/ToString.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/ContentChild.h"
#include "nsGlobalWindowInner.h"

namespace mozilla::dom {

#undef LOG
#define LOG(msg, ...)                                            \
  MOZ_LOG_FMT(gMediaControlLog, LogLevel::Debug,                 \
              "ContentMediaController={}, " msg, fmt::ptr(this), \
              ##__VA_ARGS__)

static Maybe<bool> sXPCOMShutdown;

static void InitXPCOMShutdownMonitor() {
  if (sXPCOMShutdown) {
    return;
  }
  sXPCOMShutdown.emplace(false);
  RunOnShutdown([&] { sXPCOMShutdown = Some(true); });
}

static ContentMediaController* GetContentMediaControllerFromBrowsingContext(
    BrowsingContext* aBrowsingContext) {
  MOZ_ASSERT(NS_IsMainThread());
  InitXPCOMShutdownMonitor();
  if (!aBrowsingContext || aBrowsingContext->IsDiscarded()) {
    return nullptr;
  }

  nsPIDOMWindowOuter* outer = aBrowsingContext->GetDOMWindow();
  if (!outer) {
    return nullptr;
  }

  nsGlobalWindowInner* inner =
      nsGlobalWindowInner::Cast(outer->GetCurrentInnerWindow());
  return inner ? inner->GetContentMediaController() : nullptr;
}

static already_AddRefed<BrowsingContext> GetBrowsingContextForAgent(
    uint64_t aBrowsingContextId) {
  // If XPCOM has been shutdown, then we're not able to access browsing context.
  if (sXPCOMShutdown && *sXPCOMShutdown) {
    return nullptr;
  }
  return BrowsingContext::Get(aBrowsingContextId);
}

/* static */
ContentMediaControlKeyReceiver* ContentMediaControlKeyReceiver::Get(
    BrowsingContext* aBC) {
  MOZ_ASSERT(NS_IsMainThread());
  return GetContentMediaControllerFromBrowsingContext(aBC);
}

/* static */
ContentMediaAgent* ContentMediaAgent::Get(BrowsingContext* aBC) {
  MOZ_ASSERT(NS_IsMainThread());
  return GetContentMediaControllerFromBrowsingContext(aBC);
}

void ContentMediaAgent::NotifyMediaPlaybackChanged(uint64_t aBrowsingContextId,
                                                   MediaPlaybackState aState) {
  MOZ_ASSERT(NS_IsMainThread());
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify media {} in BC {}", ToString(aState).c_str(), bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaPlaybackChanged(bc, aState);
  } else {
    // Currently this only happen when we disable e10s, otherwise all controlled
    // media would be run in the content process.
    if (RefPtr<IMediaInfoUpdater> updater =
            bc->Canonical()->GetMediaController()) {
      updater->NotifyMediaPlaybackChanged(bc->Id(), aState);
    }
  }
}

void ContentMediaAgent::NotifyMediaAudibleChanged(
    uint64_t aBrowsingContextId, MediaAudibleState aState, ControlType aType,
    AudioSessionType aSessionType) {
  MOZ_ASSERT(NS_IsMainThread());
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify media became {} in BC {}",
      aState == MediaAudibleState::eAudible ? "audible" : "inaudible",
      bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaAudibleChanged(bc, aState, aType,
                                                      aSessionType);
  } else {
    // Currently this only happen when we disable e10s, otherwise all controlled
    // media would be run in the content process.
    if (RefPtr<IMediaInfoUpdater> updater =
            bc->Canonical()->GetMediaController()) {
      updater->NotifyMediaAudibleChanged(bc->Id(), aState, aType, aSessionType);
    }
  }
}

void ContentMediaAgent::SetIsInPictureInPictureMode(
    uint64_t aBrowsingContextId, bool aIsInPictureInPictureMode) {
  MOZ_ASSERT(NS_IsMainThread());
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify media Picture-in-Picture mode '{}' in BC {}",
      aIsInPictureInPictureMode ? "enabled" : "disabled", bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyPictureInPictureModeChanged(
        bc, aIsInPictureInPictureMode);
  } else {
    // Currently this only happen when we disable e10s, otherwise all controlled
    // media would be run in the content process.
    if (RefPtr<IMediaInfoUpdater> updater =
            bc->Canonical()->GetMediaController()) {
      updater->SetIsInPictureInPictureMode(bc->Id(), aIsInPictureInPictureMode);
    }
  }
}

void ContentMediaAgent::SetDeclaredPlaybackState(
    uint64_t aBrowsingContextId, MediaSessionPlaybackState aState) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify declared playback state  '{}' in BC {}",
      ToMediaSessionPlaybackStateStr(aState), bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaSessionPlaybackStateChanged(bc, aState);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->SetDeclaredPlaybackState(bc->Id(), aState);
  }
}

void ContentMediaAgent::NotifySessionCreated(uint64_t aBrowsingContextId) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify media session being created in BC {}", bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaSessionUpdated(bc, true);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->NotifySessionCreated(bc->Id());
  }
}

void ContentMediaAgent::NotifySessionDestroyed(uint64_t aBrowsingContextId) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify media session being destroyed in BC {}", bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaSessionUpdated(bc, false);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->NotifySessionDestroyed(bc->Id());
  }
}

void ContentMediaAgent::UpdateMetadata(
    uint64_t aBrowsingContextId, const Maybe<MediaMetadataBase>& aMetadata) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify media session metadata change in BC {}", bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyUpdateMediaMetadata(bc, aMetadata);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->UpdateMetadata(bc->Id(), aMetadata);
  }
}

void ContentMediaAgent::EnableAction(uint64_t aBrowsingContextId,
                                     MediaSessionAction aAction) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify to enable action '{}' in BC {}", GetEnumString(aAction).get(),
      bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaSessionSupportedActionChanged(
        bc, aAction, true);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->EnableAction(bc->Id(), aAction);
  }
}

void ContentMediaAgent::DisableAction(uint64_t aBrowsingContextId,
                                      MediaSessionAction aAction) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify to disable action '{}' in BC {}", GetEnumString(aAction).get(),
      bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaSessionSupportedActionChanged(
        bc, aAction, false);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->DisableAction(bc->Id(), aAction);
  }
}

void ContentMediaAgent::NotifyMediaFullScreenState(uint64_t aBrowsingContextId,
                                                   bool aIsInFullScreen) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  LOG("Notify {} fullscreen in BC {}", aIsInFullScreen ? "entered" : "left",
      bc->Id());
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyMediaFullScreenState(bc, aIsInFullScreen);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->NotifyMediaFullScreenState(bc->Id(), aIsInFullScreen);
  }
}

void ContentMediaAgent::UpdatePositionState(
    uint64_t aBrowsingContextId, const Maybe<PositionState>& aState) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }
  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyPositionStateChanged(bc, aState);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->UpdatePositionState(bc->Id(), aState);
  }
}

void ContentMediaAgent::UpdateGuessedPositionState(
    uint64_t aBrowsingContextId, const nsID& aMediaId,
    const Maybe<PositionState>& aState) {
  RefPtr<BrowsingContext> bc = GetBrowsingContextForAgent(aBrowsingContextId);
  if (!bc || bc->IsDiscarded()) {
    return;
  }

  if (aState) {
    LOG("Update guessed position state for BC {} media id {} (duration={}, "
        "playbackRate={}, position={})",
        bc->Id(), aMediaId.ToString().get(), aState->mDuration,
        aState->mPlaybackRate, aState->mLastReportedPlaybackPosition);
  } else {
    LOG("Clear guessed position state for BC {} media id {}", bc->Id(),
        aMediaId.ToString().get());
  }

  if (XRE_IsContentProcess()) {
    ContentChild* contentChild = ContentChild::GetSingleton();
    (void)contentChild->SendNotifyGuessedPositionStateChanged(bc, aMediaId,
                                                              aState);
    return;
  }
  // This would only happen when we disable e10s.
  if (RefPtr<IMediaInfoUpdater> updater =
          bc->Canonical()->GetMediaController()) {
    updater->UpdateGuessedPositionState(bc->Id(), aMediaId, aState);
  }
}

ContentMediaController::ContentMediaController(uint64_t aId) {
  LOG("Create content media controller for BC {}", aId);
}

void ContentMediaController::AddReceiver(
    ContentMediaControlKeyReceiver* aListener, ControlType aType) {
  MOZ_ASSERT(NS_IsMainThread());
  if (aType == ControlType::eControllable) {
    mControllableReceivers.AppendElement(aListener);
  } else {
    mUncontrollableReceivers.AppendElement(aListener);
  }
}

void ContentMediaController::RemoveReceiver(
    ContentMediaControlKeyReceiver* aListener, ControlType aType) {
  MOZ_ASSERT(NS_IsMainThread());
  if (aType == ControlType::eControllable) {
    mControllableReceivers.RemoveElement(aListener);
  } else {
    mUncontrollableReceivers.RemoveElement(aListener);
  }
}

void ContentMediaController::HandleMediaKey(
    MediaControlKey aKey, const MediaControlActionParams& aParams) {
  MOZ_ASSERT(NS_IsMainThread());
  if (mControllableReceivers.IsEmpty() && mUncontrollableReceivers.IsEmpty()) {
    return;
  }
  LOG("Handle '{}' event, controllable num={}, uncontrollable num={}",
      GetEnumString(aKey).get(), mControllableReceivers.Length(),
      mUncontrollableReceivers.Length());
  // We have default handlers for these actions
  // https://w3c.github.io/mediasession/#ref-for-dom-mediasessionaction-play%E2%91%A3
  switch (aKey) {
    case MediaControlKey::Pause:
      PauseOrStopMedia();
      return;
    case MediaControlKey::Play:
    case MediaControlKey::Seekto:
    case MediaControlKey::Seekforward:
    case MediaControlKey::Seekbackward:
      for (auto& receiver : Reversed(mControllableReceivers)) {
        receiver->HandleMediaKey(aKey, aParams);
      }
      return;
    case MediaControlKey::Stop:
    case MediaControlKey::Setvolume:
    case MediaControlKey::Mute:
    case MediaControlKey::Unmute:
      // Audio focus loss arrives as Stop and must silence uncontrollable
      // sources too; volume/mute always target both lists. Iterate backward
      // because Stop can shrink the controllable list during iteration.
      for (auto& receiver : Reversed(mControllableReceivers)) {
        receiver->HandleMediaKey(aKey, aParams);
      }
      for (auto& receiver : Reversed(mUncontrollableReceivers)) {
        receiver->HandleMediaKey(aKey, aParams);
      }
      return;
    default:
      MOZ_ASSERT_UNREACHABLE("Not supported media key for default handler");
  }
}

void ContentMediaController::PauseOrStopMedia() {
  // When receiving `pause`, if a page contains playing media and paused media
  // at that moment, that means a user intends to pause those playing
  // media, not the already paused ones. Then, we're going to stop those already
  // paused media and keep those latest paused media in
  // `mControllableReceivers`. The reason for doing that is, when resuming
  // paused media, we only want to resume latest paused media, not all media, in
  // order to get a better user experience, which matches Chrome's behavior.
  bool isAnyMediaPlaying = false;
  for (const auto& receiver : mControllableReceivers) {
    if (receiver->IsPlaying()) {
      isAnyMediaPlaying = true;
      break;
    }
  }

  for (auto& receiver : Reversed(mControllableReceivers)) {
    if (isAnyMediaPlaying && !receiver->IsPlaying()) {
      receiver->HandleMediaKey(MediaControlKey::Stop);
    } else {
      receiver->HandleMediaKey(MediaControlKey::Pause);
    }
  }
}

}  // namespace mozilla::dom
