/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ContentMediaController.h"
#include "gtest/gtest.h"
#include "mozilla/dom/MediaSessionBinding.h"

using namespace mozilla::dom;

// A test-only receiver that records every media key it has been given so
// tests can assert which keys reached it.
class FakeContentReceiver final : public ContentMediaControlKeyReceiver {
 public:
  NS_INLINE_DECL_REFCOUNTING(FakeContentReceiver, override)

  void HandleMediaKey(MediaControlKey aKey,
                      const MediaControlActionParams& aParams = {}) override {
    mReceivedKeys.AppendElement(aKey);
  }

  bool IsPlaying() const override { return mIsPlaying; }

  bool HasReceivedKey(MediaControlKey aKey) const {
    return mReceivedKeys.Contains(aKey);
  }

  void ClearKeys() { mReceivedKeys.Clear(); }

  bool mIsPlaying = false;

 private:
  ~FakeContentReceiver() = default;
  nsTArray<MediaControlKey> mReceivedKeys;
};

// ContentMediaController uses BrowsingContext internally for IPC, but in gtest
// there is no content process, so we use ID 0 and rely on the
// ContentChild::GetSingleton() null guard to skip IPC.
#define FAKE_BC_ID 0

// Keys that are routed to controllable receivers only — these manipulate
// playback state, which only fully-controllable sources (HTMLMediaElement)
// support.
static const MediaControlKey kControlOnlyKeys[] = {
    MediaControlKey::Play, MediaControlKey::Pause, MediaControlKey::Seekforward,
    MediaControlKey::Seekbackward};

// Keys that are routed to both controllable and uncontrollable receivers —
// these affect audibility (silencing or volume) and so apply to every audio
// source.
static const MediaControlKey kSharedKeys[] = {
    MediaControlKey::Stop, MediaControlKey::Setvolume, MediaControlKey::Mute,
    MediaControlKey::Unmute};

// All media keys that ContentMediaController dispatches via HandleMediaKey.
static const MediaControlKey kAllKeys[] = {
    MediaControlKey::Play,         MediaControlKey::Pause,
    MediaControlKey::Stop,         MediaControlKey::Seekforward,
    MediaControlKey::Seekbackward, MediaControlKey::Setvolume,
    MediaControlKey::Mute,         MediaControlKey::Unmute};

TEST(ContentMediaController, ControllableReceiverGetsAllKeys)
{
  RefPtr<ContentMediaController> controller =
      new ContentMediaController(FAKE_BC_ID);
  RefPtr<FakeContentReceiver> receiver = new FakeContentReceiver();
  controller->AddReceiver(receiver);

  for (MediaControlKey key : kAllKeys) {
    receiver->ClearKeys();
    controller->HandleMediaKey(key);
    EXPECT_TRUE(receiver->HasReceivedKey(key))
        << "Controllable receiver should get key";
  }

  controller->RemoveReceiver(receiver);
}

TEST(ContentMediaController, OnlyGetUncontrolKeys)
{
  RefPtr<ContentMediaController> controller =
      new ContentMediaController(FAKE_BC_ID);
  RefPtr<FakeContentReceiver> receiver = new FakeContentReceiver();
  controller->AddReceiver(receiver, ControlType::eUncontrollable);

  for (MediaControlKey key : kControlOnlyKeys) {
    receiver->ClearKeys();
    controller->HandleMediaKey(key);
    EXPECT_FALSE(receiver->HasReceivedKey(key))
        << "Uncontrollable receiver must not get control-only key";
  }

  for (MediaControlKey key : kSharedKeys) {
    receiver->ClearKeys();
    controller->HandleMediaKey(key);
    EXPECT_TRUE(receiver->HasReceivedKey(key))
        << "Uncontrollable receiver should get shared key";
  }

  controller->RemoveReceiver(receiver, ControlType::eUncontrollable);
}
