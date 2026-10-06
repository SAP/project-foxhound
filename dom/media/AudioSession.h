/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_AUDIO_SESSION_H
#define DOM_MEDIA_AUDIO_SESSION_H

#include "js/TypeDecls.h"
#include "mozilla/DOMEventTargetHelper.h"
#include "mozilla/dom/AudioSessionBinding.h"

class nsPIDOMWindowInner;

namespace mozilla::dom {

// Skeleton implementation of the W3C Audio Session API:
// https://w3c.github.io/audio-session/#audiosession-interface
// More implementation will follow up.
class AudioSession final : public DOMEventTargetHelper {
 public:
  explicit AudioSession(nsPIDOMWindowInner* aWindow);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(AudioSession, DOMEventTargetHelper)

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  AudioSessionType Type() const { return mType; }
  void SetType(AudioSessionType aType);

  AudioSessionState State() const { return mState; }
  void SetState(AudioSessionState aState);

  IMPL_EVENT_HANDLER(statechange)

 private:
  ~AudioSession() = default;

  AudioSessionType mType = AudioSessionType::Auto;
  AudioSessionState mState = AudioSessionState::Inactive;
};

}  // namespace mozilla::dom

#endif  // DOM_MEDIA_AUDIO_SESSION_H
