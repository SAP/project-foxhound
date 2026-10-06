/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioSessionManager.h"

#include "MediaControlUtils.h"
#include "MediaController.h"
#include "mozilla/Uptime.h"

#undef LOG
#define LOG(msg, ...)                            \
  MOZ_LOG_FMT(gMediaControlLog, LogLevel::Debug, \
              "AudioSessionManager={}, " msg, fmt::ptr(this), ##__VA_ARGS__)

namespace mozilla::dom {

AudioSessionManager::AudioSessionManager(MediaController* aController)
    : mController(aController) {
  MOZ_ASSERT(mController);
}

void AudioSessionManager::SetTypeOverride(uint64_t aBrowsingContextId,
                                          AudioSessionType aType) {
  // https://w3c.github.io/audio-session/#audio-session-update-type-algorithm
  // §5.1 update-the-type. Firefox does not separately "queue a task" here:
  // this runs on the parent process, reached via the content→parent IPC
  // that delivers the `audioSession.type` setter, so the work is already
  // asynchronous relative to the content event loop. A content-side busy
  // loop after the setter cannot observe any parent-driven state mutation;
  // the content event loop has to yield before the parent's reply IPC and
  // the `statechange` event are delivered.
  //
  // "auto" maps to no override on the underlying record.
  mAudioSessions.LookupOrInsert(aBrowsingContextId)
      .SetTypeOverride(aBrowsingContextId, aType == AudioSessionType::Auto
                                               ? Nothing()
                                               : Some(aType));
  UpdateSelectedAudioSession();
  // §5.1.3.4 Update all AudioSession states of audioSession's top-level
  // browsing context with audioSession.
  UpdateAllAudioSessionStates(aBrowsingContextId);
  RemoveRecordIfEmpty(aBrowsingContextId);
  MaybeFireEffectiveTypeChanged();
}

void AudioSessionManager::NotifyAudibilityChanged(uint64_t aBrowsingContextId) {
  const bool bcIsAudibleNow = mController->IsBcAudible(aBrowsingContextId);
  auto existing = mAudioSessions.Lookup(aBrowsingContextId);
  const bool bcWasAudible =
      existing && existing.Data().GetAudibleAtMs().isSome();
  if (!bcWasAudible && bcIsAudibleNow) {
    // Lazy-create on the first audible transition. The audibility timestamp
    // must be set before the §5.2 mutator below transitions mState to Active,
    // to satisfy the "active requires audible" invariant on the record.
    Maybe<int64_t> uptime = mozilla::ProcessUptimeMs();
    MOZ_DIAGNOSTIC_ASSERT(uptime.isSome(),
                          "ProcessUptimeMs should always have a value "
                          "during audibility transitions");
    mAudioSessions.LookupOrInsert(aBrowsingContextId)
        .SetAudibleAtMs(aBrowsingContextId, Some(*uptime));
  } else if (bcWasAudible && !bcIsAudibleNow) {
    existing.Data().SetAudibleAtMs(aBrowsingContextId, Nothing());
  }
  // Derive mState from audibility. The §5.4 cross-session cascade triggered
  // from these state transitions lands in a follow-up patch; here the
  // mutators only set the field. InactivateAudioSession prunes the record
  // if it ends up empty.
  if (bcIsAudibleNow) {
    TryActivateAudioSession(aBrowsingContextId);
  } else {
    InactivateAudioSession(aBrowsingContextId);
  }
  UpdateSelectedAudioSession();
  MaybeFireEffectiveTypeChanged();
}

void AudioSessionManager::NotifyBcDiscarded(uint64_t aBrowsingContextId) {
  if (mAudioSessions.Remove(aBrowsingContextId)) {
    LOG("NotifyBcDiscarded bc={}", aBrowsingContextId);
    UpdateSelectedAudioSession();
    MaybeFireEffectiveTypeChanged();
  }
}

void AudioSessionManager::InactivateAudioSession(uint64_t aBrowsingContextId) {
  // https://w3c.github.io/audio-session/#inactivate
  auto entry = mAudioSessions.Lookup(aBrowsingContextId);
  if (!entry || entry.Data().GetState() == AudioSessionState::Inactive) {
    // §5.2 inactivate: if the record is absent or already Inactive, abort.
    LOG("Inactivate bc={} aborted: {}", aBrowsingContextId,
        !entry ? "no record" : "already inactive");
    return;
  }
  SetAudioSessionState(aBrowsingContextId, AudioSessionState::Inactive);
}

void AudioSessionManager::TryActivateAudioSession(uint64_t aBrowsingContextId) {
  // https://w3c.github.io/audio-session/#try-activating
  auto entry = mAudioSessions.Lookup(aBrowsingContextId);
  MOZ_ASSERT(entry, "TryActivate called without an existing record");
  if (!entry || entry.Data().GetState() == AudioSessionState::Active) {
    // §5.2 try activating: if the record is already Active, abort.
    LOG("TryActivate bc={} aborted: {}", aBrowsingContextId,
        !entry ? "no record" : "already active");
    return;
  }
  SetAudioSessionState(aBrowsingContextId, AudioSessionState::Active);
}

void AudioSessionManager::SetAudioSessionState(uint64_t aBrowsingContextId,
                                               AudioSessionState aNewState) {
  // https://w3c.github.io/audio-session/#notify-the-states-change
  auto entry = mAudioSessions.Lookup(aBrowsingContextId);
  MOZ_ASSERT(entry, "SetAudioSessionState called without an existing record");
  if (!entry || entry.Data().GetState() == aNewState) {
    LOG("SetAudioSessionState bc={} aborted: {}", aBrowsingContextId,
        !entry ? "no record" : "state unchanged");
    return;
  }
  entry.Data().SetState(aBrowsingContextId, aNewState);
  // Step 6. Update all AudioSession states of audioSession's top-level
  // browsing context with audioSession.
  UpdateAllAudioSessionStates(aBrowsingContextId);
  // Step 7. Fire an event named statechange at audioSession. Dispatched on
  // the content side.
  entry.Data().DispatchStateChange(aBrowsingContextId);
  // Inactive transition may leave the record empty; prune it.
  RemoveRecordIfEmpty(aBrowsingContextId);
}

void AudioSessionManager::RemoveRecordIfEmpty(uint64_t aBrowsingContextId) {
  auto entry = mAudioSessions.Lookup(aBrowsingContextId);
  if (!entry || !entry.Data().IsEmpty()) {
    LOG("RemoveRecordIfEmpty bc={} skipped: {}", aBrowsingContextId,
        !entry ? "no record" : "record still occupied");
    return;
  }
  LOG("Removing empty AudioSessionRecord bc={}", aBrowsingContextId);
  mAudioSessions.Remove(aBrowsingContextId);
}

void AudioSessionManager::UpdateAllAudioSessionStates(uint64_t aUpdatedBcId) {
  // §5.4 update-all-audiosession-states.
  // https://w3c.github.io/audio-session/#update-all-audiosession-states

  // Step 1: update the selected audio session of `context`.
  UpdateSelectedAudioSession();

  // Step 2: let updatedType be the result of computing the type of the
  // updated session.
  auto updatedEntry = mAudioSessions.Lookup(aUpdatedBcId);
  if (MOZ_UNLIKELY(!updatedEntry)) {
    LOG("[warning] UpdateAllAudioSessionStates: no record for bc={}",
        aUpdatedBcId);
    return;
  }
  const AudioSessionType updatedType = EffectiveTypeForBc(aUpdatedBcId);

  // Step 3: if updatedType is not an exclusive type, or the updated session
  // state is not "active", abort.
  if (!IsExclusiveAudioSessionType(updatedType) ||
      updatedEntry.Data().GetState() != AudioSessionState::Active) {
    return;
  }

  // Step 4 + 5: let audioSessions be the list of audio sessions tied to
  // context and its child browsing contexts; for each audio session, run
  // the per-session sub-steps. We iterate mAudioSessions and collect those
  // that step 5 leaves to inactivate, then perform the inactivation pass
  // separately so we do not mutate the map while iterating it.
  const bool updatedIsAuto = IsBcAutoTyped(aUpdatedBcId);
  AutoTArray<uint64_t, 4> toInactivate;
  for (const auto& entry : mAudioSessions) {
    const uint64_t bcId = entry.GetKey();
    // Step 5: except for updatedAudioSession.
    if (bcId == aUpdatedBcId) {
      continue;
    }
    const AudioSessionRecord& record = entry.GetData();
    // Step 5.1: if state is not active, abort.
    if (record.GetState() != AudioSessionState::Active) {
      continue;
    }
    // Step 5.2: let type be the result of computing the type of this audio
    // session.
    const AudioSessionType type = EffectiveTypeForBc(bcId);
    // Step 5.3: if not exclusive, abort.
    if (!IsExclusiveAudioSessionType(type)) {
      continue;
    }
    // Step 5.4: if both types are auto, abort. See XXX — the spec's `type`
    // / `updatedType` come from "computing the type" and never return
    // `auto`, so this predicate is unreachable; we read the page-set
    // [[type]] slot via IsBcAutoTyped to match the clear intent of the
    // carveout. A spec issue will be filed.
    if (updatedIsAuto && IsBcAutoTyped(bcId)) {
      continue;
    }
    toInactivate.AppendElement(bcId);
  }
  // Step 5.5: inactivate each remaining audio session.
  for (const uint64_t bcId : toInactivate) {
    InactivateAudioSession(bcId);
  }
}

bool AudioSessionManager::IsBcAutoTyped(uint64_t aBrowsingContextId) const {
  // No record == default == auto.
  auto entry = mAudioSessions.Lookup(aBrowsingContextId);
  if (!entry) {
    return true;
  }
  return entry.Data().GetTypeOverride().isNothing();
}

AudioSessionType AudioSessionManager::EffectiveTypeForBc(
    uint64_t aBrowsingContextId) const {
  if (auto entry = mAudioSessions.Lookup(aBrowsingContextId)) {
    if (Maybe<AudioSessionType> typeOverride = entry.Data().GetTypeOverride()) {
      MOZ_ASSERT(*typeOverride != AudioSessionType::Auto,
                 "auto must never be stored as a real override");
      return *typeOverride;
    }
  }
  return mController->EffectiveTypeForBc(aBrowsingContextId);
}

Maybe<AudioSessionType> AudioSessionManager::GetSelectedAudioSessionType()
    const {
  if (!mSelectedAudioSessionBcId) {
    return Nothing();
  }
  return Some(EffectiveTypeForBc(*mSelectedAudioSessionBcId));
}

void AudioSessionManager::UpdateSelectedAudioSession() {
  // https://w3c.github.io/audio-session/#audio-session-update-selected-audio-session-algorithm
  //
  // Step 1: let activeAudioSessions be the records whose state is `active`
  // and whose effective type is exclusive.
  AutoTArray<uint64_t, 4> activeBcIds;
  for (const auto& entry : mAudioSessions) {
    const AudioSessionRecord& record = entry.GetData();
    if (record.GetState() != AudioSessionState::Active) {
      continue;
    }
    const AudioSessionType type = EffectiveTypeForBc(entry.GetKey());
    if (!IsExclusiveAudioSessionType(type)) {
      continue;
    }
    activeBcIds.AppendElement(entry.GetKey());
  }

  // Step 2: if activeAudioSessions is empty, no audio session is selected.
  if (activeBcIds.IsEmpty()) {
    LOG("Selected audio session: <none>");
    mSelectedAudioSessionBcId = Nothing();
    return;
  }

  // Step 3: if there is only one audio session in activeAudioSessions, that
  // is the selected audio session.
  if (activeBcIds.Length() == 1) {
    LOG("Selected audio session: bc={}", activeBcIds[0]);
    mSelectedAudioSessionBcId = Some(activeBcIds[0]);
    return;
  }

  // Step 5: the user agent MAY apply specific heuristics to reorder
  // activeAudioSessions. We pick "most recently audible first" using the
  // timestamp stored on each record.
  uint64_t winnerBcId = activeBcIds[0];
  int64_t winnerAt = *mAudioSessions.Lookup(winnerBcId).Data().GetAudibleAtMs();
  for (size_t i = 1; i < activeBcIds.Length(); ++i) {
    const int64_t at =
        *mAudioSessions.Lookup(activeBcIds[i]).Data().GetAudibleAtMs();
    if (at > winnerAt) {
      winnerBcId = activeBcIds[i];
      winnerAt = at;
    }
  }

  // Step 6: the selected audio session is the first audio session in
  // activeAudioSessions (after the optional step 5 reorder).
  LOG("Selected audio session: bc={}", winnerBcId);
  mSelectedAudioSessionBcId = Some(winnerBcId);
}

AudioSessionType AudioSessionManager::GetEffectiveType() const {
  if (Maybe<AudioSessionType> selected = GetSelectedAudioSessionType()) {
    return *selected;
  }
  // Fall back to the highest-priority effective type among any audible
  // browsing context. This keeps the chrome surface informative when the
  // tab is playing audio that does not qualify as a selected audio session
  // per spec.
  Maybe<AudioSessionType> fallback;
  for (const auto& entry : mAudioSessions) {
    if (entry.GetData().GetAudibleAtMs().isNothing()) {
      continue;
    }
    const AudioSessionType type = EffectiveTypeForBc(entry.GetKey());
    if (!fallback || AudioSessionTypePriorityRank(type) >
                         AudioSessionTypePriorityRank(*fallback)) {
      fallback = Some(type);
    }
  }
  return fallback.valueOr(AudioSessionType::Auto);
}

void AudioSessionManager::MaybeFireEffectiveTypeChanged() {
  AudioSessionType newType = GetEffectiveType();
  if (newType == mLastDispatchedEffectiveType) {
    return;
  }
  LOG("EffectiveAudioSessionType change {} -> {}",
      GetEnumString(mLastDispatchedEffectiveType).get(),
      GetEnumString(newType).get());
  mLastDispatchedEffectiveType = newType;
  mController->DispatchAsyncEvent(u"effectiveaudiosessiontypechange"_ns);
}

const AudioSessionRecord* AudioSessionManager::GetRecordForTesting(
    uint64_t aBrowsingContextId) const {
  auto entry = mAudioSessions.Lookup(aBrowsingContextId);
  return entry ? &entry.Data() : nullptr;
}

}  // namespace mozilla::dom
