/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioSessionRecord.h"

#include "MediaControlUtils.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/CanonicalBrowsingContext.h"
#include "mozilla/dom/WindowGlobalParent.h"

namespace mozilla::dom {

void AudioSessionRecord::LogState(uint64_t aBcId) const {
  MOZ_LOG_FMT(
      gMediaControlLog, LogLevel::Debug,
      "AudioSessionRecord bc={}, typeOverride={}, audibleAtMs={}, state={}",
      aBcId, mTypeOverride ? GetEnumString(*mTypeOverride).get() : "<none>",
      mAudibleAtMs.valueOr(-1), GetEnumString(mState).get());
}

void AudioSessionRecord::SetTypeOverride(
    uint64_t aBcId, Maybe<AudioSessionType> aTypeOverride) {
  mTypeOverride = aTypeOverride;
  LogState(aBcId);
}

void AudioSessionRecord::SetAudibleAtMs(uint64_t aBcId,
                                        Maybe<int64_t> aAudibleAtMs) {
  mAudibleAtMs = aAudibleAtMs;
  LogState(aBcId);
}

void AudioSessionRecord::SetState(uint64_t aBcId, AudioSessionState aState) {
  // Spec invariant: a session can only be Active while its browsing context
  // is audible. The reverse direction (Inactive implies inaudible) is NOT
  // asserted because the §5.4 cross-session cascade can transition a
  // still-audible session to Inactive when another exclusive session takes
  // over the speaker.
  MOZ_ASSERT_IF(aState == AudioSessionState::Active, mAudibleAtMs.isSome());
  mState = aState;
  LogState(aBcId);
}

void AudioSessionRecord::DispatchStateChange(uint64_t aBcId) const {
  if (!StaticPrefs::dom_audio_session_state_enabled()) {
    return;
  }
  RefPtr<CanonicalBrowsingContext> bc = CanonicalBrowsingContext::Get(aBcId);
  if (!bc) {
    return;
  }
  RefPtr<WindowGlobalParent> wgp = bc->GetCurrentWindowGlobal();
  if (!wgp) {
    return;
  }
  MOZ_LOG(gMediaControlLog, LogLevel::Debug,
          ("AudioSessionRecord bc=%" PRIu64 ", DispatchStateChange state=%s",
           aBcId, GetEnumString(mState).get()));
  (void)wgp->SendNotifyAudioSessionStateChanged(mState);
}

}  // namespace mozilla::dom
