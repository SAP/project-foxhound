/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AudioListener.h"

#include "AudioContext.h"
#include "MediaTrackGraph.h"
#include "Tracing.h"
#include "mozilla/dom/AudioListenerBinding.h"

namespace mozilla::dom {

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(AudioListener, mContext)

AudioListenerEngine::AudioListenerEngine()
    : mFrontVector(0., 0., -1.), mRightVector(1., 0., 0.) {}

void AudioListenerEngine::RecvListenerEngineEvent(
    AudioListenerEngine::AudioListenerParameter aParameter,
    const ThreeDPoint& aValue) {
  switch (aParameter) {
    case AudioListenerParameter::POSITION:
      mPosition = aValue;
      break;
    case AudioListenerParameter::FRONT:
      mFrontVector = aValue;
      break;
    case AudioListenerParameter::RIGHT:
      mRightVector = aValue;
      break;
    default:
      MOZ_CRASH("Not handled");
  }
}

const ThreeDPoint& AudioListenerEngine::Position() const { return mPosition; }
const ThreeDPoint& AudioListenerEngine::FrontVector() const {
  return mFrontVector;
}
const ThreeDPoint& AudioListenerEngine::RightVector() const {
  return mRightVector;
}

AudioListener::AudioListener(AudioContext* aContext)
    : mContext(aContext),
      mEngine(new AudioListenerEngine()),

      mFrontVector(0., 0., -1.),
      mRightVector(1., 0., 0.) {
  MOZ_ASSERT(aContext);
}

JSObject* AudioListener::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return AudioListener_Binding::Wrap(aCx, this, aGivenProto);
}

void AudioListener::SetOrientation(float aX, float aY, float aZ, float aXUp,
                                   float aYUp, float aZUp) {
  ThreeDPoint front(aX, aY, aZ);
  // The panning effect and the azimuth and elevation calculation in the Web
  // Audio spec becomes undefined with linearly dependent vectors, so keep
  // existing state in these situations.
  if (front.IsZero()) {
    return;
  }
  // Normalize before using CrossProduct() to avoid overflow.
  front.Normalize();
  ThreeDPoint up(aXUp, aYUp, aZUp);
  if (up.IsZero()) {
    return;
  }
  up.Normalize();
  ThreeDPoint right = front.CrossProduct(up);
  if (right.IsZero()) {
    return;
  }
  right.Normalize();

  if (!mFrontVector.FuzzyEqual(front)) {
    mFrontVector = front;
    SendListenerEngineEvent(AudioListenerEngine::AudioListenerParameter::FRONT,
                            mFrontVector);
  }
  if (!mRightVector.FuzzyEqual(right)) {
    mRightVector = right;
    SendListenerEngineEvent(AudioListenerEngine::AudioListenerParameter::RIGHT,
                            mRightVector);
  }
}

void AudioListener::SetPosition(float aX, float aY, float aZ) {
  if (WebAudioUtils::FuzzyEqual(mPosition.x, static_cast<double>(aX)) &&
      WebAudioUtils::FuzzyEqual(mPosition.y, static_cast<double>(aY)) &&
      WebAudioUtils::FuzzyEqual(mPosition.z, static_cast<double>(aZ))) {
    return;
  }
  mPosition.x = aX;
  mPosition.y = aY;
  mPosition.z = aZ;
  SendListenerEngineEvent(AudioListenerEngine::AudioListenerParameter::POSITION,
                          mPosition);
}

void AudioListener::SendListenerEngineEvent(
    AudioListenerEngine::AudioListenerParameter aParameter,
    const ThreeDPoint& aValue) {
  mContext->DestinationTrack()->QueueControlMessageWithNoShutdown(
      [engine = RefPtr(Engine()), aParameter, aValue] {
        TRACE("AudioListener::RecvListenerEngineEvent");
        engine->RecvListenerEngineEvent(aParameter, aValue);
      });
}

size_t AudioListener::SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const {
  return aMallocSizeOf(this);
}

}  // namespace mozilla::dom
