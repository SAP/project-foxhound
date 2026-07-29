/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaStatusManager.h"

#include "MediaControlService.h"
#include "mozilla/StaticPrefs_media.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/Element.h"
#include "mozilla/dom/MediaControlUtils.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "nsContentUtils.h"
#include "nsIChromeRegistry.h"
#include "nsIObserverService.h"
#include "nsIXULAppInfo.h"
#include "nsNetUtil.h"

#ifdef MOZ_PLACES
#  include "nsIFaviconService.h"
#endif  // MOZ_PLACES

extern mozilla::LazyLogModule gMediaControlLog;

// avoid redefined macro in unified build
#undef LOG
#define LOG(msg, ...)                            \
  MOZ_LOG_FMT(gMediaControlLog, LogLevel::Debug, \
              "MediaStatusManager={}, " msg, fmt::ptr(this), ##__VA_ARGS__)

namespace mozilla::dom {

static bool IsMetadataEmpty(const Maybe<MediaMetadataBase>& aMetadata) {
  // Media session's metadata is null.
  if (!aMetadata) {
    return true;
  }

  // All attirbutes in metadata are empty.
  // https://w3c.github.io/mediasession/#empty-metadata
  const MediaMetadataBase& metadata = *aMetadata;
  return metadata.mTitle.IsEmpty() && metadata.mArtist.IsEmpty() &&
         metadata.mAlbum.IsEmpty() && metadata.mArtwork.IsEmpty();
}

MediaStatusManager::MediaStatusManager(uint64_t aBrowsingContextId)
    : mTopLevelBrowsingContextId(aBrowsingContextId) {
  MOZ_DIAGNOSTIC_ASSERT(XRE_IsParentProcess(),
                        "MediaStatusManager only runs on Chrome process!");
}

void MediaStatusManager::NotifyMediaAudibleChanged(
    uint64_t aBrowsingContextId, MediaAudibleState aState, ControlType aType,
    AudioSessionType aSessionType) {
  const bool ownerChanged = mPlaybackStatusDelegate.UpdateMediaAudibleState(
      aBrowsingContextId, aState, aType, aSessionType);
  if (ownerChanged) {
    Maybe<uint64_t> newOwner =
        mPlaybackStatusDelegate.GetActiveAudibleControllableContextId();
    HandleActiveAudibleControllableContextChanged(newOwner);
  }
}

void MediaStatusManager::NotifySessionCreated(uint64_t aBrowsingContextId) {
  const bool created = mMediaSessionInfoMap.WithEntryHandle(
      aBrowsingContextId, [&](auto&& entry) {
        if (entry) return false;

        LOG("Session {} has been created", aBrowsingContextId);
        entry.Insert(MediaSessionInfo::EmptyInfo());
        return true;
      });

  if (created &&
      mPlaybackStatusDelegate.GetActiveAudibleControllableContextId() ==
          Some(aBrowsingContextId)) {
    // This can't be done from within the WithEntryHandle functor, since it
    // accesses mMediaSessionInfoMap.
    SetActiveMediaSessionContextId(aBrowsingContextId);
  }
}

void MediaStatusManager::NotifySessionDestroyed(uint64_t aBrowsingContextId) {
  if (mMediaSessionInfoMap.Remove(aBrowsingContextId)) {
    LOG("Session {} has been destroyed", aBrowsingContextId);

    if (mActiveMediaSessionContextId &&
        *mActiveMediaSessionContextId == aBrowsingContextId) {
      ClearActiveMediaSessionContextIdIfNeeded();
    }
  }
}

void MediaStatusManager::UpdateMetadata(
    uint64_t aBrowsingContextId, const Maybe<MediaMetadataBase>& aMetadata) {
  auto info = mMediaSessionInfoMap.Lookup(aBrowsingContextId);
  if (!info) {
    return;
  }
  if (IsMetadataEmpty(aMetadata)) {
    LOG("Reset metadata for session {}", aBrowsingContextId);
    info->mMetadata.reset();
  } else {
    LOG("Update metadata for session {} title={} artist={} album={}",
        aBrowsingContextId, NS_ConvertUTF16toUTF8((*aMetadata).mTitle).get(),
        NS_ConvertUTF16toUTF8(aMetadata->mArtist).get(),
        NS_ConvertUTF16toUTF8(aMetadata->mAlbum).get());
    info->mMetadata = aMetadata;
  }
  // Only notify the event if the changed metadata belongs to the active media
  // session.
  if (mActiveMediaSessionContextId &&
      *mActiveMediaSessionContextId == aBrowsingContextId) {
    LOG("Notify metadata change for active session {}", aBrowsingContextId);
    mMetadataChangedEvent.Notify(GetCurrentMediaMetadata());
  }
  if (StaticPrefs::media_mediacontrol_testingevents_enabled()) {
    if (nsCOMPtr<nsIObserverService> obs = services::GetObserverService()) {
      obs->NotifyObservers(nullptr, "media-session-controller-metadata-changed",
                           nullptr);
    }
  }
}

void MediaStatusManager::HandleActiveAudibleControllableContextChanged(
    Maybe<uint64_t>& aBrowsingContextId) {
  // No context currently qualifies; there is no active media session.
  if (!aBrowsingContextId) {
    LOG("No active audible controllable context");
    return ClearActiveMediaSessionContextIdIfNeeded();
  }

  // The qualifying context has no MediaSession registered; the active media
  // session cannot be derived from it.
  if (!mMediaSessionInfoMap.Contains(*aBrowsingContextId)) {
    LOG("The active audible controllable context has no media session");
    return ClearActiveMediaSessionContextIdIfNeeded();
  }

  // The qualifying context has a MediaSession; promote it to the active
  // media session.
  SetActiveMediaSessionContextId(*aBrowsingContextId);
}

void MediaStatusManager::SetActiveMediaSessionContextId(
    uint64_t aBrowsingContextId) {
  if (mActiveMediaSessionContextId &&
      *mActiveMediaSessionContextId == aBrowsingContextId) {
    LOG("Active session context {} keeps unchanged",
        *mActiveMediaSessionContextId);
    return;
  }
  mActiveMediaSessionContextId = Some(aBrowsingContextId);
  StoreMediaSessionContextIdOnWindowContext();
  LOG("context {} becomes active session context",
      *mActiveMediaSessionContextId);
  mMetadataChangedEvent.Notify(GetCurrentMediaMetadata());
  mSupportedActionsChangedEvent.Notify(GetSupportedActions());
  mPositionStateChangedEvent.Notify(GetCurrentPositionState());
  if (StaticPrefs::media_mediacontrol_testingevents_enabled()) {
    if (nsCOMPtr<nsIObserverService> obs = services::GetObserverService()) {
      obs->NotifyObservers(nullptr, "active-media-session-changed", nullptr);
    }
  }
}

void MediaStatusManager::ClearActiveMediaSessionContextIdIfNeeded() {
  if (!mActiveMediaSessionContextId) {
    return;
  }
  LOG("Clear active session context");
  mActiveMediaSessionContextId.reset();
  StoreMediaSessionContextIdOnWindowContext();
  mMetadataChangedEvent.Notify(GetCurrentMediaMetadata());
  mSupportedActionsChangedEvent.Notify(GetSupportedActions());
  mPositionStateChangedEvent.Notify(GetCurrentPositionState());
  if (StaticPrefs::media_mediacontrol_testingevents_enabled()) {
    if (nsCOMPtr<nsIObserverService> obs = services::GetObserverService()) {
      obs->NotifyObservers(nullptr, "active-media-session-changed", nullptr);
    }
  }
}

void MediaStatusManager::StoreMediaSessionContextIdOnWindowContext() {
  RefPtr<CanonicalBrowsingContext> bc =
      CanonicalBrowsingContext::Get(mTopLevelBrowsingContextId);
  if (bc && bc->GetTopWindowContext()) {
    (void)bc->GetTopWindowContext()->SetActiveMediaSessionContextId(
        mActiveMediaSessionContextId);
  }
}

MediaMetadataBase MediaStatusManager::CreateDefaultMetadata() const {
  MediaMetadataBase metadata;
  metadata.mTitle = GetDefaultTitle();
  metadata.mUrl = GetUrl();
  metadata.mArtwork.AppendElement()->mSrc = GetDefaultFaviconURL();

  LOG("Default media metadata, title={}, album src={}",
      NS_ConvertUTF16toUTF8(metadata.mTitle).get(),
      NS_ConvertUTF16toUTF8(metadata.mArtwork[0].mSrc).get());
  return metadata;
}

nsString MediaStatusManager::GetDefaultTitle() const {
  RefPtr<MediaControlService> service = MediaControlService::GetService();
  nsString defaultTitle = service->GetFallbackTitle();

  RefPtr<CanonicalBrowsingContext> bc =
      CanonicalBrowsingContext::Get(mTopLevelBrowsingContextId);
  if (!bc) {
    return defaultTitle;
  }

  RefPtr<WindowGlobalParent> globalParent = bc->GetCurrentWindowGlobal();
  if (!globalParent) {
    return defaultTitle;
  }

  // The media metadata would be shown on the virtual controller interface. For
  // example, on Android, the interface would be shown on both notification bar
  // and lockscreen. Therefore, what information we provide via metadata is
  // quite important, because if we're in private browsing, we don't want to
  // expose details about what website the user is browsing on the lockscreen.
  // Therefore, using the default title when in the private browsing or the
  // document title is empty. Otherwise, use the document title.
  nsString documentTitle;
  if (!IsInPrivateBrowsing()) {
    globalParent->GetDocumentTitle(documentTitle);
  }
  return documentTitle.IsEmpty() ? defaultTitle : documentTitle;
}

nsCString MediaStatusManager::GetUrl() const {
  nsCString defaultUrl;

  RefPtr<CanonicalBrowsingContext> bc =
      CanonicalBrowsingContext::Get(mTopLevelBrowsingContextId);
  if (!bc) {
    return defaultUrl;
  }

  RefPtr<WindowGlobalParent> globalParent = bc->GetCurrentWindowGlobal();
  if (!globalParent) {
    return defaultUrl;
  }

  if (IsInPrivateBrowsing()) {
    return defaultUrl;
  }

  nsIURI* documentURI = globalParent->GetDocumentURI();
  if (!documentURI) {
    return defaultUrl;
  }

  return documentURI->GetSpecOrDefault();
}

nsString MediaStatusManager::GetDefaultFaviconURL() const {
#ifdef MOZ_PLACES
  nsCOMPtr<nsIURI> faviconURI;
  nsresult rv = NS_NewURI(getter_AddRefs(faviconURI),
                          nsLiteralCString(FAVICON_DEFAULT_URL));
  NS_ENSURE_SUCCESS(rv, u""_ns);

  // Convert URI from `chrome://XXX` to `file://XXX` because we would like to
  // let OS related frameworks, such as SMTC and MPRIS, handle this URL in order
  // to show the icon on virtual controller interface.
  nsCOMPtr<nsIChromeRegistry> regService = services::GetChromeRegistry();
  if (!regService) {
    return u""_ns;
  }
  nsCOMPtr<nsIURI> processedURI;
  regService->ConvertChromeURL(faviconURI, getter_AddRefs(processedURI));

  nsAutoCString spec;
  if (NS_FAILED(processedURI->GetSpec(spec))) {
    return u""_ns;
  }
  return NS_ConvertUTF8toUTF16(spec);
#else
  return u""_ns;
#endif
}

void MediaStatusManager::SetDeclaredPlaybackState(
    uint64_t aBrowsingContextId, MediaSessionPlaybackState aState) {
  auto info = mMediaSessionInfoMap.Lookup(aBrowsingContextId);
  if (!info) {
    return;
  }
  LOG("SetDeclaredPlaybackState from {} to {}",
      ToMediaSessionPlaybackStateStr(info->mDeclaredPlaybackState),
      ToMediaSessionPlaybackStateStr(aState));
  info->mDeclaredPlaybackState = aState;
  UpdateActualPlaybackState();
}

MediaSessionPlaybackState MediaStatusManager::GetCurrentDeclaredPlaybackState()
    const {
  if (!mActiveMediaSessionContextId) {
    return MediaSessionPlaybackState::None;
  }
  return mMediaSessionInfoMap.Get(*mActiveMediaSessionContextId)
      .mDeclaredPlaybackState;
}

void MediaStatusManager::NotifyMediaPlaybackChanged(uint64_t aBrowsingContextId,
                                                    MediaPlaybackState aState) {
  LOG("UpdateMediaPlaybackState {} for context {}", EnumValueToString(aState),
      aBrowsingContextId);
  const bool oldPlaying = mPlaybackStatusDelegate.IsPlaying();
  mPlaybackStatusDelegate.UpdateMediaPlaybackState(aBrowsingContextId, aState);

  // Playback state doesn't change, we don't need to update the guessed playback
  // state. This is used to prevent the state from changing from `none` to
  // `paused` when receiving `MediaPlaybackState::eStarted`.
  if (mPlaybackStatusDelegate.IsPlaying() == oldPlaying) {
    return;
  }
  if (mPlaybackStatusDelegate.IsPlaying()) {
    SetGuessedPlayState(MediaSessionPlaybackState::Playing);
  } else {
    SetGuessedPlayState(MediaSessionPlaybackState::Paused);
  }
}

void MediaStatusManager::SetGuessedPlayState(MediaSessionPlaybackState aState) {
  if (aState == mGuessedPlaybackState) {
    return;
  }
  LOG("SetGuessedPlayState : '{}'", ToMediaSessionPlaybackStateStr(aState));
  mGuessedPlaybackState = aState;
  UpdateActualPlaybackState();
}

void MediaStatusManager::UpdateActualPlaybackState() {
  // The way to compute the actual playback state is based on the spec.
  // https://w3c.github.io/mediasession/#actual-playback-state
  MediaSessionPlaybackState newState =
      GetCurrentDeclaredPlaybackState() == MediaSessionPlaybackState::Playing
          ? MediaSessionPlaybackState::Playing
          : mGuessedPlaybackState;
  if (mActualPlaybackState == newState) {
    return;
  }
  mActualPlaybackState = newState;
  LOG("UpdateActualPlaybackState : '{}'",
      ToMediaSessionPlaybackStateStr(mActualPlaybackState));
  mPlaybackStateChangedEvent.Notify(mActualPlaybackState);
}

void MediaStatusManager::EnableAction(uint64_t aBrowsingContextId,
                                      MediaSessionAction aAction) {
  auto info = mMediaSessionInfoMap.Lookup(aBrowsingContextId);
  if (!info) {
    return;
  }
  if (info->IsActionSupported(aAction)) {
    LOG("Action '{}' has already been enabled for context {}",
        GetEnumString(aAction).get(), aBrowsingContextId);
    return;
  }
  LOG("Enable action {} for context {}", GetEnumString(aAction).get(),
      aBrowsingContextId);
  info->EnableAction(aAction);
  NotifySupportedKeysChangedIfNeeded(aBrowsingContextId);
}

void MediaStatusManager::DisableAction(uint64_t aBrowsingContextId,
                                       MediaSessionAction aAction) {
  auto info = mMediaSessionInfoMap.Lookup(aBrowsingContextId);
  if (!info) {
    return;
  }
  if (!info->IsActionSupported(aAction)) {
    LOG("Action '{}' hasn't been enabled yet for context {}",
        GetEnumString(aAction).get(), aBrowsingContextId);
    return;
  }
  LOG("Disable action {} for context {}", GetEnumString(aAction).get(),
      aBrowsingContextId);
  info->DisableAction(aAction);
  NotifySupportedKeysChangedIfNeeded(aBrowsingContextId);
}

void MediaStatusManager::UpdatePositionState(
    uint64_t aBrowsingContextId, const Maybe<PositionState>& aState) {
  auto info = mMediaSessionInfoMap.Lookup(aBrowsingContextId);
  if (info) {
    LOG("Update position state for context {}", aBrowsingContextId);
    info->mPositionState = aState;
  }

  // The position state comes from non-active media session which we don't care.
  if (!mActiveMediaSessionContextId ||
      *mActiveMediaSessionContextId != aBrowsingContextId) {
    return;
  }
  mPositionStateChangedEvent.Notify(aState);
}

void MediaStatusManager::UpdateGuessedPositionState(
    uint64_t aBrowsingContextId, const nsID& aMediaId,
    const Maybe<PositionState>& aGuessedState) {
  mPlaybackStatusDelegate.UpdateGuessedPositionState(aBrowsingContextId,
                                                     aMediaId, aGuessedState);

  // The position state comes from a non-active media session and
  // there is another one active (with some metadata).
  if (mActiveMediaSessionContextId &&
      *mActiveMediaSessionContextId != aBrowsingContextId) {
    return;
  }

  // media session is declared for the updated session, but there's no active
  // session - it will get emitted once the session becomes active
  if (mMediaSessionInfoMap.Contains(aBrowsingContextId) &&
      !mActiveMediaSessionContextId) {
    return;
  }

  mPositionStateChangedEvent.Notify(GetCurrentPositionState());
}

void MediaStatusManager::NotifySupportedKeysChangedIfNeeded(
    uint64_t aBrowsingContextId) {
  // Only the active media session's supported actions would be shown in virtual
  // control interface, so we only notify the event when supported actions
  // change happens on the active media session.
  if (!mActiveMediaSessionContextId ||
      *mActiveMediaSessionContextId != aBrowsingContextId) {
    return;
  }
  mSupportedActionsChangedEvent.Notify(GetSupportedActions());
}

CopyableTArray<MediaSessionAction> MediaStatusManager::GetSupportedActions()
    const {
  CopyableTArray<MediaSessionAction> supportedActions;
  if (!mActiveMediaSessionContextId) {
    return supportedActions;
  }

  MediaSessionInfo info =
      mMediaSessionInfoMap.Get(*mActiveMediaSessionContextId);
  for (MediaSessionAction action :
       MakeWebIDLEnumeratedRange<MediaSessionAction>()) {
    if (info.IsActionSupported(action)) {
      supportedActions.AppendElement(action);
    }
  }
  return supportedActions;
}

MediaMetadataBase MediaStatusManager::GetCurrentMediaMetadata() const {
  // If we don't have active media session, active media session doesn't have
  // media metadata, or we're in private browsing mode, then we should create a
  // default metadata which is using website's title and favicon as title and
  // artwork.
  if (mActiveMediaSessionContextId && !IsInPrivateBrowsing()) {
    MediaSessionInfo info =
        mMediaSessionInfoMap.Get(*mActiveMediaSessionContextId);
    if (!info.mMetadata) {
      return CreateDefaultMetadata();
    }
    MediaMetadataBase& metadata = *(info.mMetadata);
    FillMissingTitleAndArtworkIfNeeded(metadata);
    metadata.mUrl = GetUrl();
    return metadata;
  }
  return CreateDefaultMetadata();
}

Maybe<PositionState> MediaStatusManager::GetCurrentPositionState() const {
  if (mActiveMediaSessionContextId) {
    auto info = mMediaSessionInfoMap.Lookup(*mActiveMediaSessionContextId);
    if (info && info->mPositionState) {
      return info->mPositionState;
    }
  }

  return mPlaybackStatusDelegate.GuessedMediaPositionState(
      mActiveMediaSessionContextId);
}

void MediaStatusManager::FillMissingTitleAndArtworkIfNeeded(
    MediaMetadataBase& aMetadata) const {
  // If the metadata doesn't set its title and artwork properly, we would like
  // to use default title and favicon instead in order to prevent showing
  // nothing on the virtual control interface.
  if (aMetadata.mTitle.IsEmpty()) {
    aMetadata.mTitle = GetDefaultTitle();
  }
  if (aMetadata.mArtwork.IsEmpty()) {
    aMetadata.mArtwork.AppendElement()->mSrc = GetDefaultFaviconURL();
  }
}

bool MediaStatusManager::IsInPrivateBrowsing() const {
  RefPtr<CanonicalBrowsingContext> bc =
      CanonicalBrowsingContext::Get(mTopLevelBrowsingContextId);
  if (!bc) {
    return false;
  }
  RefPtr<Element> element = bc->GetEmbedderElement();
  if (!element) {
    return false;
  }
  if (StaticPrefs::media_privatebrowsing_metadata_enabled()) {
    return false;
  }
  return element->OwnerDoc()->IsInPrivateBrowsing();
}

MediaSessionPlaybackState MediaStatusManager::PlaybackState() const {
  return mActualPlaybackState;
}

bool MediaStatusManager::IsMediaAudible() const {
  return mPlaybackStatusDelegate.IsAudible();
}

bool MediaStatusManager::IsMediaPlaying() const {
  return mActualPlaybackState == MediaSessionPlaybackState::Playing;
}

bool MediaStatusManager::IsAnyMediaBeingControlled() const {
  return mPlaybackStatusDelegate.IsAnyMediaBeingControlled();
}

AudioSessionType MediaStatusManager::EffectiveTypeForBc(
    uint64_t aBrowsingContextId) const {
  return mPlaybackStatusDelegate.EffectiveTypeForBc(aBrowsingContextId);
}

bool MediaStatusManager::IsBcAudible(uint64_t aBrowsingContextId) const {
  return mPlaybackStatusDelegate.IsBcAudible(aBrowsingContextId);
}

void MediaStatusManager::NotifyPageTitleChanged() {
  // If active media session has set non-empty metadata, then we would use that
  // instead of using default metadata.
  if (mActiveMediaSessionContextId &&
      mMediaSessionInfoMap.Lookup(*mActiveMediaSessionContextId)->mMetadata) {
    return;
  }
  // In private browsing mode, we won't show page title on default metadata so
  // we don't need to update that.
  if (IsInPrivateBrowsing()) {
    return;
  }
  LOG("page title changed, update default metadata");
  mMetadataChangedEvent.Notify(GetCurrentMediaMetadata());
}

}  // namespace mozilla::dom
