/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioSessionManager.h"
#include "AudioSessionRecord.h"
#include "MediaController.h"
#include "gtest/gtest.h"
#include "mozilla/dom/AudioSessionBinding.h"

using namespace mozilla::dom;

#define CONTROLLER_ID 0

TEST(AudioSessionManager, Override_StoresValueAndIsKeyedByBc)
{
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  constexpr uint64_t kFrameA = 1;
  constexpr uint64_t kFrameB = 2;

  controller->SetAudioSessionTypeOverride(kFrameA,
                                          AudioSessionType::Transient_solo);
  const AudioSessionRecord* a =
      controller->GetAudioSessionRecordForTesting(kFrameA);
  ASSERT_NE(a, nullptr);
  ASSERT_TRUE(a->GetTypeOverride());
  EXPECT_EQ(*a->GetTypeOverride(), AudioSessionType::Transient_solo);

  // Setting a different override on another BC must not disturb the first.
  controller->SetAudioSessionTypeOverride(kFrameB, AudioSessionType::Playback);

  a = controller->GetAudioSessionRecordForTesting(kFrameA);
  const AudioSessionRecord* b =
      controller->GetAudioSessionRecordForTesting(kFrameB);
  ASSERT_NE(a, nullptr);
  ASSERT_NE(b, nullptr);
  EXPECT_EQ(*a->GetTypeOverride(), AudioSessionType::Transient_solo);
  EXPECT_EQ(*b->GetTypeOverride(), AudioSessionType::Playback);
}

TEST(AudioSessionManager, Override_AutoClearAndAudibilityLifecycle)
{
  // Setting a non-Auto type creates the record. Clearing it via the "auto"
  // sentinel normalises the override to Nothing; the manager keeps the
  // record only while something else still occupies it (audibility, a
  // non-Inactive state) and drops it once it is fully empty. An audibility
  // cycle drives mState Active and back to Inactive while the override
  // remains the lone reason to keep the record alive.
  constexpr AudioSessionType kOverrides[] = {
      AudioSessionType::Ambient,         AudioSessionType::Transient,
      AudioSessionType::Transient_solo,  AudioSessionType::Playback,
      AudioSessionType::Play_and_record,
  };
  for (auto override : kOverrides) {
    RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
    constexpr uint64_t kFrame = 42;

    controller->SetAudioSessionTypeOverride(kFrame, override);
    ASSERT_NE(controller->GetAudioSessionRecordForTesting(kFrame), nullptr);

    // Auto on a record whose only field was the override drops the record.
    controller->SetAudioSessionTypeOverride(kFrame, AudioSessionType::Auto);
    EXPECT_EQ(controller->GetAudioSessionRecordForTesting(kFrame), nullptr);

    // Re-create the override and cycle audibility on the same browsing
    // context. The override keeps the record alive across the audibility
    // transitions; mState reflects the audibility.
    controller->SetAudioSessionTypeOverride(kFrame, override);
    controller->NotifyMediaAudibleChanged(kFrame, MediaAudibleState::eAudible,
                                          ControlType::eControllable,
                                          AudioSessionType::Playback);
    const AudioSessionRecord* rec =
        controller->GetAudioSessionRecordForTesting(kFrame);
    ASSERT_NE(rec, nullptr);
    EXPECT_EQ(rec->GetState(), AudioSessionState::Active);

    controller->NotifyMediaAudibleChanged(kFrame, MediaAudibleState::eInaudible,
                                          ControlType::eControllable,
                                          AudioSessionType::Playback);
    rec = controller->GetAudioSessionRecordForTesting(kFrame);
    ASSERT_NE(rec, nullptr);
    EXPECT_EQ(rec->GetState(), AudioSessionState::Inactive);
    EXPECT_TRUE(rec->GetAudibleAtMs().isNothing());

    // The record is now down to the override alone; clearing it drops the
    // record again.
    controller->SetAudioSessionTypeOverride(kFrame, AudioSessionType::Auto);
    EXPECT_EQ(controller->GetAudioSessionRecordForTesting(kFrame), nullptr);
  }
}

TEST(AudioSessionManager, Override_ClearAudioSessionForDropsEntry)
{
  constexpr AudioSessionType kOverrides[] = {
      AudioSessionType::Ambient,         AudioSessionType::Transient,
      AudioSessionType::Transient_solo,  AudioSessionType::Playback,
      AudioSessionType::Play_and_record,
  };
  for (auto override : kOverrides) {
    RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
    constexpr uint64_t kFrame = 7;

    controller->SetAudioSessionTypeOverride(kFrame, override);
    ASSERT_NE(controller->GetAudioSessionRecordForTesting(kFrame), nullptr);

    controller->ClearAudioSessionFor(kFrame);
    EXPECT_EQ(controller->GetAudioSessionRecordForTesting(kFrame), nullptr);

    // Clearing a BC that never had an override is a no-op.
    controller->ClearAudioSessionFor(kFrame + 1);
    EXPECT_EQ(controller->GetAudioSessionRecordForTesting(kFrame + 1), nullptr);
  }
}

TEST(AudioSessionManager, EffectiveTypeForBc_UnknownBcReturnsDefault)
{
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  EXPECT_EQ(
      controller->GetAudioSessionManagerForTesting()->EffectiveTypeForBc(42),
      DefaultAudioSessionType());
}

TEST(AudioSessionManager, EffectiveTypeForBc_OverrideWinsOverSource)
{
  // Every user-settable override (i.e. every type except Auto, which
  // normalises to "no override") must take precedence over the source-
  // derived type, and clearing the override must fall back to the source.
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  constexpr uint64_t kBc = 5;
  controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eAudible,
                                        ControlType::eControllable,
                                        AudioSessionType::Playback);
  const AudioSessionManager* mgr =
      controller->GetAudioSessionManagerForTesting();
  EXPECT_EQ(mgr->EffectiveTypeForBc(kBc), AudioSessionType::Playback);

  constexpr AudioSessionType kOverrides[] = {
      AudioSessionType::Ambient,         AudioSessionType::Transient,
      AudioSessionType::Transient_solo,  AudioSessionType::Playback,
      AudioSessionType::Play_and_record,
  };
  for (auto override : kOverrides) {
    controller->SetAudioSessionTypeOverride(kBc, override);
    EXPECT_EQ(mgr->EffectiveTypeForBc(kBc), override);

    // Clearing the override falls back to the source-derived type.
    controller->SetAudioSessionTypeOverride(kBc, AudioSessionType::Auto);
    EXPECT_EQ(mgr->EffectiveTypeForBc(kBc), AudioSessionType::Playback);
  }

  controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eInaudible,
                                        ControlType::eControllable,
                                        AudioSessionType::Playback);
}

// Every non-Auto AudioSessionType, used by the iterating tests below.
constexpr AudioSessionType kAllAudioSessionTypesExceptAuto[] = {
    AudioSessionType::Ambient,         AudioSessionType::Transient,
    AudioSessionType::Transient_solo,  AudioSessionType::Playback,
    AudioSessionType::Play_and_record,
};

TEST(AudioSessionManager, GetEffectiveAudioSessionType_NoAudibleBcReturnsAuto)
{
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  EXPECT_EQ(controller->GetEffectiveAudioSessionType(), AudioSessionType::Auto);
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_SingleAudibleBcReportsSourceType)
{
  // Every audio-session source type, when carried by the only audible BC,
  // resolves to that same type.
  for (auto src : kAllAudioSessionTypesExceptAuto) {
    RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
    constexpr uint64_t kBc = 1;
    controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eAudible,
                                          ControlType::eControllable, src);
    EXPECT_EQ(controller->GetEffectiveAudioSessionType(), src)
        << "src=" << static_cast<int>(src);
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_OverrideWinsAndAutoResetFallsBack)
{
  // For every (source, override) pair, the override drives the surface and
  // a subsequent Auto-reset falls back to the source-derived type.
  for (auto src : kAllAudioSessionTypesExceptAuto) {
    for (auto ovr : kAllAudioSessionTypesExceptAuto) {
      RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
      constexpr uint64_t kBc = 1;
      controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eAudible,
                                            ControlType::eControllable, src);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), src);

      controller->SetAudioSessionTypeOverride(kBc, ovr);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), ovr);

      controller->SetAudioSessionTypeOverride(kBc, AudioSessionType::Auto);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), src);
    }
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_TwoExclusiveBcsPickMostRecent)
{
  // Two audible BCs, both exclusive types: the most recently audible wins
  // regardless of the type ordering on each side.
  for (auto first : kExclusiveAudioSessionTypes) {
    for (auto second : kExclusiveAudioSessionTypes) {
      RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
      constexpr uint64_t kBcA = 1;
      constexpr uint64_t kBcB = 2;
      controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                            ControlType::eControllable, first);
      controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                            ControlType::eControllable, second);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), second);
    }
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_TwoNonExclusiveBcsPickHighestPriority)
{
  // Two audible BCs, only non-exclusive types: no audio session is selected
  // per spec, so the chrome surface falls back to the highest-priority
  // effective type.
  for (auto first : kNonExclusiveAudioSessionTypes) {
    for (auto second : kNonExclusiveAudioSessionTypes) {
      RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
      constexpr uint64_t kBcA = 1;
      constexpr uint64_t kBcB = 2;
      controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                            ControlType::eControllable, first);
      controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                            ControlType::eControllable, second);
      const AudioSessionType expected =
          AudioSessionTypePriorityRank(first) >=
                  AudioSessionTypePriorityRank(second)
              ? first
              : second;
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), expected);
    }
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_ExclusiveBeatsNonExclusive)
{
  // For every (exclusive, non-exclusive) pair: the non-exclusive BC becomes
  // audible LAST (so it is the most recent), yet spec selection ignores it
  // and the exclusive type wins.
  for (auto exclusive : kExclusiveAudioSessionTypes) {
    for (auto nonExclusive : kNonExclusiveAudioSessionTypes) {
      RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
      constexpr uint64_t kBcA = 1;
      constexpr uint64_t kBcB = 2;
      controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                            ControlType::eControllable,
                                            exclusive);
      controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                            ControlType::eControllable,
                                            nonExclusive);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), exclusive);
    }
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_HandoffWhenSelectedBcGoesSilent)
{
  // For every (first, second) pair of exclusive types: BcA audible with
  // `first` then BcB audible with `second`. BcB is selected (most recent).
  // When BcB goes silent, selection falls back to BcA. When BcA also goes
  // silent the surface returns Auto.
  for (auto first : kExclusiveAudioSessionTypes) {
    for (auto second : kExclusiveAudioSessionTypes) {
      RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
      constexpr uint64_t kBcA = 1;
      constexpr uint64_t kBcB = 2;

      controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                            ControlType::eControllable, first);
      controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                            ControlType::eControllable, second);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), second);

      controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eInaudible,
                                            ControlType::eControllable, second);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), first);

      controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eInaudible,
                                            ControlType::eControllable, first);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(),
                AudioSessionType::Auto);
    }
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_OverrideSetBeforePlayApplies)
{
  // For every (override, source) pair: the override is set before any
  // audibility transition; once the BC becomes audible with `source`, the
  // surface reports the stored override.
  for (auto override : kAllAudioSessionTypesExceptAuto) {
    for (auto source : kAllAudioSessionTypesExceptAuto) {
      RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
      constexpr uint64_t kBc = 1;

      controller->SetAudioSessionTypeOverride(kBc, override);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(),
                AudioSessionType::Auto);

      controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eAudible,
                                            ControlType::eControllable, source);
      EXPECT_EQ(controller->GetEffectiveAudioSessionType(), override);
    }
  }
}

TEST(AudioSessionManager,
     GetEffectiveAudioSessionType_UncontrollableOnlyBcParticipates)
{
  // An uncontrollable-only audible BC drives the chrome surface for every
  // source type.
  for (auto src : kAllAudioSessionTypesExceptAuto) {
    RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
    constexpr uint64_t kBc = 1;

    controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eAudible,
                                          ControlType::eUncontrollable, src);
    EXPECT_EQ(controller->GetEffectiveAudioSessionType(), src);
  }
}

TEST(AudioSessionManager, State_DefaultIsInactive)
{
  // A newly-created record starts with mState == Inactive. The field is
  // the single source of truth for spec state.
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  constexpr uint64_t kBc = 11;
  controller->SetAudioSessionTypeOverride(kBc, AudioSessionType::Playback);
  const AudioSessionRecord* rec =
      controller->GetAudioSessionRecordForTesting(kBc);
  ASSERT_NE(rec, nullptr);
  EXPECT_EQ(rec->GetState(), AudioSessionState::Inactive);
}

TEST(AudioSessionManager, State_AudibilityDrivesActiveAndCleansUp)
{
  // Audibility drives the per-BC state through the §5.2 mutators: becoming
  // audible transitions the state to Active and becoming inaudible returns
  // it to Inactive. Once the record has no override and no audibility
  // timestamp, going Inactive empties the record and the manager removes
  // it from the map.
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  constexpr uint64_t kBc = 21;

  controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eAudible,
                                        ControlType::eControllable,
                                        AudioSessionType::Playback);
  const AudioSessionRecord* rec =
      controller->GetAudioSessionRecordForTesting(kBc);
  ASSERT_NE(rec, nullptr);
  EXPECT_EQ(rec->GetState(), AudioSessionState::Active);

  controller->NotifyMediaAudibleChanged(kBc, MediaAudibleState::eInaudible,
                                        ControlType::eControllable,
                                        AudioSessionType::Playback);
  EXPECT_EQ(controller->GetAudioSessionRecordForTesting(kBc), nullptr);
}

// Helper: returns the spec state for a BC by reading the record, or
// Inactive when no record exists (matching the spec default for a fresh
// audio session).
static AudioSessionState StateOf(MediaController* aController, uint64_t aBcId) {
  const AudioSessionRecord* rec =
      aController->GetAudioSessionRecordForTesting(aBcId);
  return rec ? rec->GetState() : AudioSessionState::Inactive;
}

TEST(AudioSessionManager, State_ExclusiveCascadeFromTypeOverride)
{
  // Setting an explicit exclusive type on an audible BC inactivates other
  // auto-typed exclusive sessions in the same tab. Each user-settable
  // exclusive type triggers the cascade.
  for (AudioSessionType exclusive : kExclusiveAudioSessionTypes) {
    RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
    constexpr uint64_t kBcA = 71;
    constexpr uint64_t kBcB = 72;

    controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                          ControlType::eControllable,
                                          AudioSessionType::Playback);
    controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                          ControlType::eControllable,
                                          AudioSessionType::Playback);
    ASSERT_EQ(StateOf(controller, kBcA), AudioSessionState::Active);
    ASSERT_EQ(StateOf(controller, kBcB), AudioSessionState::Active);

    controller->SetAudioSessionTypeOverride(kBcB, exclusive);
    EXPECT_EQ(StateOf(controller, kBcA), AudioSessionState::Inactive)
        << "exclusive override " << static_cast<int>(exclusive)
        << " should evict the auto-typed exclusive session";
    EXPECT_EQ(StateOf(controller, kBcB), AudioSessionState::Active);
  }
}

TEST(AudioSessionManager, State_NonExclusiveSessionStaysActive)
{
  // A non-exclusive session is never inactivated by the cascade, even when
  // the just-updated session is exclusive. Verified for every non-exclusive
  // type in the spec.
  for (AudioSessionType nonExclusive : kNonExclusiveAudioSessionTypes) {
    RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
    constexpr uint64_t kBcA = 91;
    constexpr uint64_t kBcB = 92;

    controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                          ControlType::eControllable,
                                          nonExclusive);
    controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                          ControlType::eControllable,
                                          AudioSessionType::Ambient);
    controller->SetAudioSessionTypeOverride(kBcB, AudioSessionType::Playback);

    EXPECT_EQ(StateOf(controller, kBcA), AudioSessionState::Active)
        << "non-exclusive type " << static_cast<int>(nonExclusive)
        << " should survive the cascade";
    EXPECT_EQ(StateOf(controller, kBcB), AudioSessionState::Active);
  }
}

TEST(AudioSessionManager, State_TwoAutoTypedExclusiveSessionsCoexist)
{
  // Two auto-typed exclusive sessions coexist: neither evicts the other
  // because both pages left the user-set type as auto.
  RefPtr<MediaController> controller = new MediaController(CONTROLLER_ID);
  constexpr uint64_t kBcA = 81;
  constexpr uint64_t kBcB = 82;

  controller->NotifyMediaAudibleChanged(kBcA, MediaAudibleState::eAudible,
                                        ControlType::eControllable,
                                        AudioSessionType::Playback);
  controller->NotifyMediaAudibleChanged(kBcB, MediaAudibleState::eAudible,
                                        ControlType::eControllable,
                                        AudioSessionType::Playback);

  EXPECT_EQ(StateOf(controller, kBcA), AudioSessionState::Active);
  EXPECT_EQ(StateOf(controller, kBcB), AudioSessionState::Active);
}
