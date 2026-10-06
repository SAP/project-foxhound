/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_MEDIACONTROL_MEDIAPLAYBACKSTATUS_H_
#define DOM_MEDIA_MEDIACONTROL_MEDIAPLAYBACKSTATUS_H_

#include "mozilla/DefineEnum.h"
#include "mozilla/Maybe.h"
#include "mozilla/dom/AudioSessionBinding.h"
#include "mozilla/dom/MediaSession.h"
#include "nsID.h"
#include "nsISupportsImpl.h"
#include "nsTArray.h"
#include "nsTHashMap.h"

namespace mozilla::dom {

/**
 * This enum is used to update controlled media state to the media controller in
 * the chrome process.
 * `eStarted`: media has successfully registered to the content media controller
 * `ePlayed` : media has started playing
 * `ePaused` : media has paused playing, but still can be resumed by content
 *             media controller
 * `eStopped`: media has unregistered from the content media controller, we can
 *             not control it anymore
 */
MOZ_DEFINE_ENUM_CLASS_WITH_BASE_AND_TOSTRING(MediaPlaybackState, uint32_t,
                                             (eStarted, ePlayed, ePaused,
                                              eStopped));

/**
 * This enum is used to update controlled media audible audible state to the
 * media controller in the chrome process.
 */
MOZ_DEFINE_ENUM_CLASS_WITH_BASE_AND_TOSTRING(MediaAudibleState, bool,
                                             (eInaudible, eAudible));

/**
 * This enum distinguishes media sources that fully participate in the media
 * control lifecycle (controllable, e.g. HTMLMediaElement) from sources that
 * only contribute audibility and accept volume/mute (uncontrollable).
 */
MOZ_DEFINE_ENUM_CLASS_WITH_BASE_AND_TOSTRING(ControlType, bool,
                                             (eControllable, eUncontrollable));

/**
 * Records a single currently-audible source, capturing the control-type tag
 * that decides whether the source participates in the media-control
 * lifecycle and the audio session type it declared. One entry is appended
 * on every audible notification from the content process and removed on the
 * matching inaudible notification.
 */
struct AudibleSource {
  ControlType mControlType;
  AudioSessionType mSessionType;
};

/**
 * MediaPlaybackStatus is an internal module for the media controller, it
 * represents a tab's media related status, such like "does the tab contain any
 * controlled media? is the tab playing? is the tab audible?".
 *
 * The reason we need this class is that we would like to encapsulate the
 * details of determining the tab's media status. A tab can contains multiple
 * browsing contexts, and each browsing context can have different media status.
 * The final media status would be decided by checking all those context status.
 *
 * Use `UpdateMediaXXXState()` to update controlled media status, and use
 * `IsXXX()` methods to acquire the playback status of the tab.
 *
 * As we know each context's audible state, we can decide which context is the
 * active audible controllable context for the tab when multiple contexts are
 * all playing audible media at the same time. In that case, the latest
 * context that plays a controllable audible source qualifies. When that
 * context is destroyed, we look for another context with a controllable
 * audible source and hand off to it (or clear the value if none qualifies).
 */
class MediaPlaybackStatus final {
 public:
  void UpdateMediaPlaybackState(uint64_t aContextId, MediaPlaybackState aState);

  // Returns true if the audio-focus owner shifted as a side-effect.
  bool UpdateMediaAudibleState(uint64_t aContextId, MediaAudibleState aState,
                               ControlType aControlType,
                               AudioSessionType aSessionType);

  void UpdateGuessedPositionState(uint64_t aContextId, const nsID& aElementId,
                                  const Maybe<PositionState>& aState);

  bool IsPlaying() const;
  bool IsAudible() const;
  bool IsAnyMediaBeingControlled() const;
  Maybe<PositionState> GuessedMediaPositionState(
      Maybe<uint64_t> aPreferredContextId) const;

  Maybe<uint64_t> GetActiveAudibleControllableContextId() const;

  // Whether the given browsing context currently has at least one audible
  // source.
  bool IsBcAudible(uint64_t aBcId) const;

  // The resolved audio-session type for the given browsing context.
  // Returns the default audio-session type when no audible source applies.
  AudioSessionType EffectiveTypeForBc(uint64_t aBcId) const;

  // Test-only accessor. Used by gtests to inspect per-browsing-context
  // audible-source state that is not otherwise observable through the public
  // API.
  const nsTArray<AudibleSource>* GetAudibleSourcesForTesting(
      uint64_t aBcId) const;

 private:
  /**
   * This internal class stores per-browsing-context state used to decide the
   * tab-wide playback status: how many controlled and playing media items
   * the BC currently has, every currently-audible source (controllable and
   * uncontrollable) it owns, and the most recent guessed position state for
   * its media elements.
   */
  class ContextMediaInfo final {
   public:
    explicit ContextMediaInfo(uint64_t aContextId) : mContextId(aContextId) {}
    ~ContextMediaInfo() = default;

    void IncreaseControlledMediaNum() {
#ifndef FUZZING_SNAPSHOT
      MOZ_DIAGNOSTIC_ASSERT(mControlledMediaNum < UINT_MAX);
#endif
      mControlledMediaNum++;
    }
    void DecreaseControlledMediaNum() {
#ifndef FUZZING_SNAPSHOT
      MOZ_DIAGNOSTIC_ASSERT(mControlledMediaNum > 0);
#endif
      mControlledMediaNum--;
    }
    void IncreasePlayingMediaNum() {
#ifndef FUZZING_SNAPSHOT
      MOZ_DIAGNOSTIC_ASSERT(mPlayingMediaNum < mControlledMediaNum);
#endif
      mPlayingMediaNum++;
    }
    void DecreasePlayingMediaNum() {
#ifndef FUZZING_SNAPSHOT
      MOZ_DIAGNOSTIC_ASSERT(mPlayingMediaNum > 0);
#endif
      mPlayingMediaNum--;
    }

    void AddAudibleSource(ControlType aControlType,
                          AudioSessionType aSessionType);
    void RemoveAudibleSource(ControlType aControlType,
                             AudioSessionType aSessionType);
    bool IsAudible() const { return !mAudibleSources.IsEmpty(); }
    bool HasAudibleSourceOfControlType(ControlType aControlType) const;

    bool IsPlaying() const { return mPlayingMediaNum > 0; }
    bool IsAnyMediaBeingControlled() const { return mControlledMediaNum > 0; }
    uint32_t ControlledMediaNum() const { return mControlledMediaNum; }
    size_t AudibleSourceCount() const { return mAudibleSources.Length(); }
    uint64_t Id() const { return mContextId; }

    Maybe<PositionState> GuessedPositionState() const;
    void UpdateGuessedPositionState(const nsID& aElementId,
                                    const Maybe<PositionState>& aState);

    // Test-only: exposes the underlying audible-source records so gtests can
    // assert the precise per-source state that no public API surfaces.
    const nsTArray<AudibleSource>& AudibleSourcesForTesting() const {
      return mAudibleSources;
    }

    // The highest-priority audio-session type among this browsing context's
    // audible sources. Returns the default audio-session type when no
    // source applies.
    AudioSessionType PriorityTypeFromAudibleSources() const;

   private:
    /**
     * The possible value for these two numbers should follow this rule,
     * mControlledMediaNum >= mPlayingMediaNum.
     */
    uint32_t mControlledMediaNum = 0;
    uint32_t mPlayingMediaNum = 0;
    uint64_t mContextId = 0;

    /**
     * Per-source audibility metadata for every source currently producing
     * audible output on this browsing context. Each entry corresponds to one
     * outstanding `eAudible` notification (whether from a media-control
     * lifecycle participant such as an HTMLMediaElement or from a
     * non-participant such as an AudioContext) and is removed when the
     * matching `eInaudible` notification arrives. Empty when the browsing
     * context is silent.
     */
    nsTArray<AudibleSource> mAudibleSources;

    /**
     * Contains the guessed position state of all media elements in this
     * browsing context identified by their ID.
     */
    nsTHashMap<nsID, PositionState> mGuessedPositionStateMap;
  };

  ContextMediaInfo& GetNotNullContextInfo(uint64_t aContextId);
  void DestroyContextInfo(uint64_t aContextId);
  void MaybeDestroyContextInfo(uint64_t aContextId,
                               const ContextMediaInfo& aInfo);

  void ChooseNewActiveAudibleControllableContext();
  void SetActiveAudibleControllableContextId(Maybe<uint64_t>&& aContextId);
  bool IsActiveAudibleControllableContext(uint64_t aContextId) const;
  bool ShouldClaimActiveAudibleControllableContextForInfo(
      const ContextMediaInfo& aInfo, ControlType aControlType) const;
  bool ShouldHandOffActiveAudibleControllableContextForInfo(
      const ContextMediaInfo& aInfo, ControlType aControlType) const;
  bool HasAnyControllableAudibleSource() const;

  // This contains all the media status of browsing contexts within a tab.
  nsTHashMap<uint64_t, UniquePtr<ContextMediaInfo>> mContextInfoMap;
  Maybe<uint64_t> mActiveAudibleControllableContextId;
};

}  // namespace mozilla::dom

#endif  //  DOM_MEDIA_MEDIACONTROL_MEDIAPLAYBACKSTATUS_H_
