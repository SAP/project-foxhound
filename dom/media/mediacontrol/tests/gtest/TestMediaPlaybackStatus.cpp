/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioSessionRecord.h"
#include "MediaPlaybackStatus.h"
#include "gtest/gtest.h"
#include "mozilla/Maybe.h"
#include "mozilla/dom/AudioSessionBinding.h"

using namespace mozilla;
using namespace mozilla::dom;

namespace {
constexpr uint64_t kBcA = 1;
constexpr uint64_t kBcB = 2;

constexpr ControlType kControlTypes[] = {
    ControlType::eControllable,
    ControlType::eUncontrollable,
};

constexpr AudioSessionType kSessionTypes[] = {
    AudioSessionType::Auto,      AudioSessionType::Playback,
    AudioSessionType::Transient, AudioSessionType::Transient_solo,
    AudioSessionType::Ambient,   AudioSessionType::Play_and_record,
};
}  // namespace

TEST(MediaPlaybackStatus, AddAudibleSource_AppendsEntry)
{
  MediaPlaybackStatus status;
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);

  const nsTArray<AudibleSource>* sources =
      status.GetAudibleSourcesForTesting(kBcA);
  ASSERT_NE(sources, nullptr);
  ASSERT_EQ(sources->Length(), 1u);
  EXPECT_EQ((*sources)[0].mControlType, ControlType::eControllable);
  EXPECT_EQ((*sources)[0].mSessionType, AudioSessionType::Playback);
}

TEST(MediaPlaybackStatus, RemoveAudibleSource_RemovesOneMatchingEntry)
{
  MediaPlaybackStatus status;
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  const nsTArray<AudibleSource>* sources =
      status.GetAudibleSourcesForTesting(kBcA);
  ASSERT_NE(sources, nullptr);
  ASSERT_EQ(sources->Length(), 1u);
  EXPECT_EQ((*sources)[0].mControlType, ControlType::eUncontrollable);
  EXPECT_EQ((*sources)[0].mSessionType, AudioSessionType::Ambient);
}

TEST(MediaPlaybackStatus, IdenticalSourcesRemovedOneAtATime)
{
  MediaPlaybackStatus status;
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);

  ASSERT_EQ(status.GetAudibleSourcesForTesting(kBcA)->Length(), 3u);

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);
  ASSERT_EQ(status.GetAudibleSourcesForTesting(kBcA)->Length(), 2u);

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);
  ASSERT_EQ(status.GetAudibleSourcesForTesting(kBcA)->Length(), 1u);

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eUncontrollable,
                                 AudioSessionType::Ambient);
  EXPECT_EQ(status.GetAudibleSourcesForTesting(kBcA), nullptr);
}

TEST(MediaPlaybackStatus, IsBcAudible_ReflectsAudibleSources)
{
  for (auto controlType : kControlTypes) {
    for (auto sessionType : kSessionTypes) {
      MediaPlaybackStatus status;
      EXPECT_FALSE(status.IsBcAudible(kBcA));

      status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                     controlType, sessionType);
      EXPECT_TRUE(status.IsBcAudible(kBcA));
      EXPECT_FALSE(status.IsBcAudible(kBcB));

      status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                     controlType, sessionType);
      EXPECT_FALSE(status.IsBcAudible(kBcA));
    }
  }
}

TEST(MediaPlaybackStatus, OwnerDerivation_IgnoresUncontrollableOnlyBc)
{
  for (auto sessionType : kSessionTypes) {
    MediaPlaybackStatus status;
    status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                   ControlType::eUncontrollable, sessionType);
    EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Nothing());
    EXPECT_TRUE(status.IsAudible());
  }
}

TEST(MediaPlaybackStatus, OwnerDerivation_ControllableClaimsFocus)
{
  MediaPlaybackStatus status;
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Some(kBcA));

  status.UpdateMediaAudibleState(kBcB, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Some(kBcB));

  status.UpdateMediaAudibleState(kBcB, MediaAudibleState::eInaudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Some(kBcA));
}

TEST(MediaPlaybackStatus, OwnerStickyAfterSoleControllableBecomesInaudible)
{
  MediaPlaybackStatus status;
  // Keep the BC alive past the audibility transition so the entry isn't
  // collapsed by the cleanup path — this exercises pure owner derivation.
  status.UpdateMediaPlaybackState(kBcA, MediaPlaybackState::eStarted);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Some(kBcA));

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Some(kBcA));
}

TEST(MediaPlaybackStatus, ControllableLifecycle_OwnerAndEntryClearedAtStop)
{
  // The eInaudible for a controllable source must not destroy the BC while
  // its controlled-media counter is still non-zero. The matching eStopped
  // is what tears the entry down and clears the active context. If
  // eInaudible destroyed the entry early, the eStopped below would
  // re-create a fresh entry and DecreaseControlledMediaNum would hit
  // MOZ_DIAGNOSTIC_ASSERT.
  MediaPlaybackStatus status;
  status.UpdateMediaPlaybackState(kBcA, MediaPlaybackState::eStarted);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Some(kBcA));

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  // The entry survives the audibility round-trip because the BC still has
  // controlled media.
  EXPECT_NE(status.GetAudibleSourcesForTesting(kBcA), nullptr);

  status.UpdateMediaPlaybackState(kBcA, MediaPlaybackState::eStopped);
  EXPECT_EQ(status.GetAudibleSourcesForTesting(kBcA), nullptr);
  EXPECT_EQ(status.GetActiveAudibleControllableContextId(), Nothing());
}

TEST(MediaPlaybackStatus, UpdateMediaAudibleState_ReturnsOwnerChange)
{
  MediaPlaybackStatus status;
  EXPECT_TRUE(status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                             ControlType::eControllable,
                                             AudioSessionType::Playback));
  EXPECT_FALSE(status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                              ControlType::eControllable,
                                              AudioSessionType::Playback));
  EXPECT_TRUE(status.UpdateMediaAudibleState(kBcB, MediaAudibleState::eAudible,
                                             ControlType::eControllable,
                                             AudioSessionType::Playback));
  EXPECT_FALSE(status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                              ControlType::eUncontrollable,
                                              AudioSessionType::Playback));
}

TEST(MediaPlaybackStatus, EffectiveTypeForBc_UnknownOrSilentBcReturnsDefault)
{
  // A browsing context with no entry, or one that has an entry but no
  // audible source (e.g. it has only controlled media), resolves to the
  // spec default.
  MediaPlaybackStatus status;
  EXPECT_EQ(status.EffectiveTypeForBc(kBcA), DefaultAudioSessionType());
  status.UpdateMediaPlaybackState(kBcA, MediaPlaybackState::eStarted);
  EXPECT_EQ(status.EffectiveTypeForBc(kBcA), DefaultAudioSessionType());
}

TEST(MediaPlaybackStatus, EffectiveTypeForBc_SingleSourceReturnsItsType)
{
  constexpr AudioSessionType kTypes[] = {
      AudioSessionType::Ambient,         AudioSessionType::Transient,
      AudioSessionType::Transient_solo,  AudioSessionType::Playback,
      AudioSessionType::Play_and_record,
  };
  for (auto sessionType : kTypes) {
    for (auto controlType : kControlTypes) {
      MediaPlaybackStatus status;
      status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                     controlType, sessionType);
      EXPECT_EQ(status.EffectiveTypeForBc(kBcA), sessionType);
      status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                     controlType, sessionType);
    }
  }
}

TEST(MediaPlaybackStatus, EffectiveTypeForBc_HigherPriorityBeatsLower)
{
  // Verify every pair across the priority lattice
  // (Play_and_record > Playback > Transient_solo > Transient > Ambient).
  // Sources are added in lower-then-higher order to ensure ordering does
  // not affect the outcome; both control types contribute equally.
  struct Pair {
    AudioSessionType higher;
    AudioSessionType lower;
  };
  constexpr Pair kPairs[] = {
      {AudioSessionType::Play_and_record, AudioSessionType::Playback},
      {AudioSessionType::Play_and_record, AudioSessionType::Transient_solo},
      {AudioSessionType::Play_and_record, AudioSessionType::Transient},
      {AudioSessionType::Play_and_record, AudioSessionType::Ambient},
      {AudioSessionType::Playback, AudioSessionType::Transient_solo},
      {AudioSessionType::Playback, AudioSessionType::Transient},
      {AudioSessionType::Playback, AudioSessionType::Ambient},
      {AudioSessionType::Transient_solo, AudioSessionType::Transient},
      {AudioSessionType::Transient_solo, AudioSessionType::Ambient},
      {AudioSessionType::Transient, AudioSessionType::Ambient},
  };
  for (const auto& pair : kPairs) {
    MediaPlaybackStatus status;
    status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                   ControlType::eUncontrollable, pair.lower);
    status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                   ControlType::eControllable, pair.higher);
    EXPECT_EQ(status.EffectiveTypeForBc(kBcA), pair.higher);

    // When the higher-priority source goes inaudible, the lower one is left
    // as the effective type.
    status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                   ControlType::eControllable, pair.higher);
    EXPECT_EQ(status.EffectiveTypeForBc(kBcA), pair.lower);

    status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                   ControlType::eUncontrollable, pair.lower);
  }
}

TEST(MediaPlaybackStatus, EffectiveTypeForBc_RemovingWinnerFallsBackToNextRank)
{
  // With three sources at different priorities, removing the winner falls
  // back to the next-highest, and so on until only the lowest remains.
  MediaPlaybackStatus status;
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Ambient);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Transient);
  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eAudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.EffectiveTypeForBc(kBcA), AudioSessionType::Playback);

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Playback);
  EXPECT_EQ(status.EffectiveTypeForBc(kBcA), AudioSessionType::Transient);

  status.UpdateMediaAudibleState(kBcA, MediaAudibleState::eInaudible,
                                 ControlType::eControllable,
                                 AudioSessionType::Transient);
  EXPECT_EQ(status.EffectiveTypeForBc(kBcA), AudioSessionType::Ambient);
}
