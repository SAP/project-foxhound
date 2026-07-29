/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioSession.h"

#include "mozilla/AsyncEventDispatcher.h"
#include "mozilla/dom/MediaControlUtils.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "nsGlobalWindowInner.h"

#undef LOG
#define LOG(msg, ...)                                                     \
  MOZ_LOG_FMT(gMediaControlLog, LogLevel::Debug, "AudioSession={}, " msg, \
              fmt::ptr(this), ##__VA_ARGS__)

namespace mozilla::dom {

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(AudioSession,
                                               DOMEventTargetHelper)
NS_IMPL_CYCLE_COLLECTION_INHERITED(AudioSession, DOMEventTargetHelper)

AudioSession::AudioSession(nsPIDOMWindowInner* aWindow)
    : DOMEventTargetHelper(aWindow) {}

JSObject* AudioSession::WrapObject(JSContext* aCx,
                                   JS::Handle<JSObject*> aGivenProto) {
  return AudioSession_Binding::Wrap(aCx, this, aGivenProto);
}

void AudioSession::SetType(AudioSessionType aType) {
  if (mType == aType) {
    return;
  }
  LOG("SetType {}", GetEnumString(aType).get());
  mType = aType;
  if (nsPIDOMWindowInner* window = GetOwnerWindow()) {
    if (WindowGlobalChild* wgc = window->GetWindowGlobalChild()) {
      wgc->SendNotifyAudioSessionTypeOverride(aType);
    }
  }
}

void AudioSession::SetState(AudioSessionState aState) {
  if (mState == aState) {
    return;
  }
  LOG("SetState {}", GetEnumString(aState).get());
  mState = aState;
  RefPtr<AsyncEventDispatcher> dispatcher =
      new AsyncEventDispatcher(this, u"statechange"_ns, CanBubble::eNo);
  dispatcher->PostDOMEvent();
}

}  // namespace mozilla::dom

#undef LOG
