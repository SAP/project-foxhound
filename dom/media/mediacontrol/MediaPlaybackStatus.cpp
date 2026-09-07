/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MediaPlaybackStatus.h"

#include "AudioSessionRecord.h"
#include "MediaControlUtils.h"

namespace mozilla::dom {

#undef LOG
#define LOG(msg, ...)                            \
  MOZ_LOG_FMT(gMediaControlLog, LogLevel::Debug, \
              "MediaPlaybackStatus={}, " msg, fmt::ptr(this), ##__VA_ARGS__)

void MediaPlaybackStatus::UpdateMediaPlaybackState(uint64_t aContextId,
                                                   MediaPlaybackState aState) {
  LOG("Update playback state '{}' for context {}", EnumValueToString(aState),
      aContextId);
  MOZ_ASSERT(NS_IsMainThread());

  ContextMediaInfo& info = GetNotNullContextInfo(aContextId);
  if (aState == MediaPlaybackState::eStarted) {
    info.IncreaseControlledMediaNum();
  } else if (aState == MediaPlaybackState::eStopped) {
    info.DecreaseControlledMediaNum();
  } else if (aState == MediaPlaybackState::ePlayed) {
    info.IncreasePlayingMediaNum();
  } else {
    MOZ_ASSERT(aState == MediaPlaybackState::ePaused);
    info.DecreasePlayingMediaNum();
  }

  LOG("UpdateMediaPlaybackState for context {} (controlled {} audible {})",
      aContextId, info.ControlledMediaNum(), info.AudibleSourceCount());
  // DO NOT access `info` after this line.
  MaybeDestroyContextInfo(aContextId, info);
}

void MediaPlaybackStatus::DestroyContextInfo(uint64_t aContextId) {
  MOZ_ASSERT(NS_IsMainThread());
  LOG("Remove context {}", aContextId);
  mContextInfoMap.Remove(aContextId);
  // If the removed context was the active audible controllable context,
  // re-derive it from the remaining contexts (or clear it if none qualify).
  if (IsActiveAudibleControllableContext(aContextId)) {
    ChooseNewActiveAudibleControllableContext();
  }
}

void MediaPlaybackStatus::MaybeDestroyContextInfo(
    uint64_t aContextId, const ContextMediaInfo& aInfo) {
  // A context entry is kept while it still has any of: controlled media,
  // playing media, or an audible source. Once all three are empty the
  // entry has no remaining purpose and is destroyed.
  if (aInfo.IsAnyMediaBeingControlled() || aInfo.IsPlaying() ||
      aInfo.IsAudible()) {
    return;
  }
  DestroyContextInfo(aContextId);
}

bool MediaPlaybackStatus::UpdateMediaAudibleState(
    uint64_t aContextId, MediaAudibleState aState, ControlType aControlType,
    AudioSessionType aSessionType) {
  LOG("Update audible state '{}' for context {}", EnumValueToString(aState),
      aContextId);
  MOZ_ASSERT(NS_IsMainThread());
  ContextMediaInfo& info = GetNotNullContextInfo(aContextId);
  const Maybe<uint64_t> oldActiveContextId =
      mActiveAudibleControllableContextId;

  if (aState == MediaAudibleState::eAudible) {
    info.AddAudibleSource(aControlType, aSessionType);
  } else {
    MOZ_ASSERT(aState == MediaAudibleState::eInaudible);
    info.RemoveAudibleSource(aControlType, aSessionType);
  }

  if (ShouldClaimActiveAudibleControllableContextForInfo(info, aControlType)) {
    SetActiveAudibleControllableContextId(Some(aContextId));
  } else if (ShouldHandOffActiveAudibleControllableContextForInfo(
                 info, aControlType)) {
    ChooseNewActiveAudibleControllableContext();
  }

  MaybeDestroyContextInfo(aContextId, info);
  return oldActiveContextId != mActiveAudibleControllableContextId;
}

void MediaPlaybackStatus::UpdateGuessedPositionState(
    uint64_t aContextId, const nsID& aElementId,
    const Maybe<PositionState>& aState) {
  MOZ_ASSERT(NS_IsMainThread());
  if (aState) {
    LOG("Update guessed position state for context {} element {} (duration={}, "
        "playbackRate={}, position={})",
        aContextId, aElementId.ToString().get(), aState->mDuration,
        aState->mPlaybackRate, aState->mLastReportedPlaybackPosition);
  } else {
    LOG("Clear guessed position state for context {} element {}", aContextId,
        aElementId.ToString().get());
  }
  ContextMediaInfo& info = GetNotNullContextInfo(aContextId);
  info.UpdateGuessedPositionState(aElementId, aState);
}

bool MediaPlaybackStatus::IsPlaying() const {
  MOZ_ASSERT(NS_IsMainThread());
  return std::any_of(mContextInfoMap.Values().cbegin(),
                     mContextInfoMap.Values().cend(),
                     [](const auto& info) { return info->IsPlaying(); });
}

bool MediaPlaybackStatus::IsAudible() const {
  MOZ_ASSERT(NS_IsMainThread());
  return std::any_of(mContextInfoMap.Values().cbegin(),
                     mContextInfoMap.Values().cend(),
                     [](const auto& info) { return info->IsAudible(); });
}

bool MediaPlaybackStatus::IsBcAudible(uint64_t aBcId) const {
  MOZ_ASSERT(NS_IsMainThread());
  auto entry = mContextInfoMap.Lookup(aBcId);
  return entry && entry.Data()->IsAudible();
}

const nsTArray<AudibleSource>* MediaPlaybackStatus::GetAudibleSourcesForTesting(
    uint64_t aBcId) const {
  auto entry = mContextInfoMap.Lookup(aBcId);
  return entry ? &entry.Data()->AudibleSourcesForTesting() : nullptr;
}

bool MediaPlaybackStatus::IsAnyMediaBeingControlled() const {
  MOZ_ASSERT(NS_IsMainThread());
  return std::any_of(
      mContextInfoMap.Values().cbegin(), mContextInfoMap.Values().cend(),
      [](const auto& info) { return info->IsAnyMediaBeingControlled(); });
}

Maybe<PositionState> MediaPlaybackStatus::GuessedMediaPositionState(
    Maybe<uint64_t> aPreferredContextId) const {
  auto contextId = aPreferredContextId;
  if (!contextId) {
    contextId = mActiveAudibleControllableContextId;
  }

  // either the preferred or focused context
  if (contextId) {
    auto entry = mContextInfoMap.Lookup(*contextId);
    if (!entry) {
      return Nothing();
    }
    LOG("Using guessed position state from preferred/focused BC {}",
        *contextId);
    return entry.Data()->GuessedPositionState();
  }

  // look for the first position state
  for (const auto& context : mContextInfoMap.Values()) {
    auto state = context->GuessedPositionState();
    if (state) {
      LOG("Using guessed position state from BC {}", context->Id());
      return state;
    }
  }
  return Nothing();
}

MediaPlaybackStatus::ContextMediaInfo&
MediaPlaybackStatus::GetNotNullContextInfo(uint64_t aContextId) {
  MOZ_ASSERT(NS_IsMainThread());
  return *mContextInfoMap.GetOrInsertNew(aContextId, aContextId);
}

Maybe<uint64_t> MediaPlaybackStatus::GetActiveAudibleControllableContextId()
    const {
  return mActiveAudibleControllableContextId;
}

void MediaPlaybackStatus::ChooseNewActiveAudibleControllableContext() {
  // Walk every context, picking one with at least one CONTROLLABLE audible
  // source. Uncontrollable-only BCs do not qualify. If no candidate is
  // found, clear the active audible controllable context.
  for (const auto& info : mContextInfoMap.Values()) {
    if (info->HasAudibleSourceOfControlType(ControlType::eControllable)) {
      SetActiveAudibleControllableContextId(Some(info->Id()));
      return;
    }
  }
  SetActiveAudibleControllableContextId(Nothing());
}

void MediaPlaybackStatus::SetActiveAudibleControllableContextId(
    Maybe<uint64_t>&& aContextId) {
  if (mActiveAudibleControllableContextId == aContextId) {
    return;
  }
  mActiveAudibleControllableContextId = std::move(aContextId);
}

bool MediaPlaybackStatus::ShouldClaimActiveAudibleControllableContextForInfo(
    const ContextMediaInfo& aInfo, ControlType aControlType) const {
  // Only a controllable update can become the active audible controllable
  // context; uncontrollable sources contribute to per-tab audibility but
  // never qualify.
  return aControlType == ControlType::eControllable &&
         aInfo.HasAudibleSourceOfControlType(ControlType::eControllable) &&
         !IsActiveAudibleControllableContext(aInfo.Id());
}

bool MediaPlaybackStatus::ShouldHandOffActiveAudibleControllableContextForInfo(
    const ContextMediaInfo& aInfo, ControlType aControlType) const {
  // The current active audible controllable context has lost its last
  // controllable audible source, but another context still has one — hand
  // off to that context. If there is no other candidate the current value
  // stays sticky so a subsequent default-action handler still has a target.
  // Only triggered by controllable transitions; uncontrollable updates
  // never hand off.
  return aControlType == ControlType::eControllable &&
         !aInfo.HasAudibleSourceOfControlType(ControlType::eControllable) &&
         IsActiveAudibleControllableContext(aInfo.Id()) &&
         HasAnyControllableAudibleSource();
}

bool MediaPlaybackStatus::HasAnyControllableAudibleSource() const {
  return std::any_of(
      mContextInfoMap.Values().cbegin(), mContextInfoMap.Values().cend(),
      [](const auto& info) {
        return info->HasAudibleSourceOfControlType(ControlType::eControllable);
      });
}

bool MediaPlaybackStatus::IsActiveAudibleControllableContext(
    uint64_t aContextId) const {
  return mActiveAudibleControllableContextId
             ? *mActiveAudibleControllableContextId == aContextId
             : false;
}

Maybe<PositionState>
MediaPlaybackStatus::ContextMediaInfo::GuessedPositionState() const {
  if (mGuessedPositionStateMap.Count() != 1) {
    LOG("Count is {}", mGuessedPositionStateMap.Count());
    return Nothing();
  }
  return Some(mGuessedPositionStateMap.begin()->GetData());
}

void MediaPlaybackStatus::ContextMediaInfo::UpdateGuessedPositionState(
    const nsID& aElementId, const Maybe<PositionState>& aState) {
  if (aState) {
    mGuessedPositionStateMap.InsertOrUpdate(aElementId, *aState);
  } else {
    mGuessedPositionStateMap.Remove(aElementId);
  }
}

void MediaPlaybackStatus::ContextMediaInfo::AddAudibleSource(
    ControlType aControlType, AudioSessionType aSessionType) {
  mAudibleSources.AppendElement(AudibleSource{aControlType, aSessionType});
}

void MediaPlaybackStatus::ContextMediaInfo::RemoveAudibleSource(
    ControlType aControlType, AudioSessionType aSessionType) {
  for (size_t i = 0; i < mAudibleSources.Length(); ++i) {
    const AudibleSource& src = mAudibleSources[i];
    if (src.mControlType == aControlType && src.mSessionType == aSessionType) {
      mAudibleSources.RemoveElementAt(i);
      return;
    }
  }
}

bool MediaPlaybackStatus::ContextMediaInfo::HasAudibleSourceOfControlType(
    ControlType aControlType) const {
  for (const AudibleSource& src : mAudibleSources) {
    if (src.mControlType == aControlType) {
      return true;
    }
  }
  return false;
}

AudioSessionType
MediaPlaybackStatus::ContextMediaInfo::PriorityTypeFromAudibleSources() const {
  // Spec: https://w3c.github.io/audio-session/#compute-the-audio-session-type
  // Pick the highest-priority type that has an audible source. The
  // AudioSessionType enum is ordered so that the integer value is the
  // priority rank.
  Maybe<AudioSessionType> winner;
  for (const AudibleSource& src : mAudibleSources) {
    if (!winner || AudioSessionTypePriorityRank(src.mSessionType) >
                       AudioSessionTypePriorityRank(*winner)) {
      winner = Some(src.mSessionType);
    }
  }
  const AudioSessionType result = winner.valueOr(DefaultAudioSessionType());
  LOG("PriorityTypeFromAudibleSources for context {} -> {}", mContextId,
      GetEnumString(result).get());
  return result;
}

AudioSessionType MediaPlaybackStatus::EffectiveTypeForBc(uint64_t aBcId) const {
  MOZ_ASSERT(NS_IsMainThread());
  auto entry = mContextInfoMap.Lookup(aBcId);
  if (!entry) {
    LOG("[warning] EffectiveTypeForBc no entry for context {}", aBcId);
    return DefaultAudioSessionType();
  }
  return entry.Data()->PriorityTypeFromAudibleSources();
}

}  // namespace mozilla::dom
