/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "AudioWorkletProcessor.h"

#include "mozilla/dom/AudioWorkletNodeBinding.h"
#include "mozilla/dom/AudioWorkletProcessorBinding.h"
#include "mozilla/dom/MessagePort.h"
#include "mozilla/dom/WorkletGlobalScope.h"
#include "nsIGlobalObject.h"
#include "nsQueryObject.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(AudioWorkletProcessor, mParent, mPort)

AudioWorkletProcessor::AudioWorkletProcessor(
    RefPtr<AudioWorkletGlobalScope>&& aParent, RefPtr<MessagePort>&& aPort)
    : mParent(std::move(aParent)), mPort(std::move(aPort)) {}

AudioWorkletProcessor::~AudioWorkletProcessor() = default;

/* static */
already_AddRefed<AudioWorkletProcessor> AudioWorkletProcessor::Constructor(
    const GlobalObject& aGlobal, ErrorResult& aRv) {
  RefPtr<AudioWorkletGlobalScope> global =
      do_QueryObject(aGlobal.GetAsSupports());
  if (!global) {
    aRv.ThrowTypeError<MSG_ILLEGAL_CONSTRUCTOR>();
    return nullptr;
  }
  RefPtr<MessagePort> port = global->TakePortForProcessorCtor();
  if (!port) {
    aRv.ThrowTypeError<MSG_ILLEGAL_CONSTRUCTOR>();
    return nullptr;
  }
  RefPtr<AudioWorkletProcessor> audioWorkletProcessor =
      new AudioWorkletProcessor(std::move(global), std::move(port));
  return audioWorkletProcessor.forget();
}

JSObject* AudioWorkletProcessor::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return AudioWorkletProcessor_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
