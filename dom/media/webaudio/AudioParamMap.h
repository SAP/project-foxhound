/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef AudioParamMap_h_
#define AudioParamMap_h_

#include "AudioWorkletNode.h"
#include "nsWrapperCache.h"

namespace mozilla::dom {

class AudioParamMap final : public nsWrapperCache {
 public:
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(AudioParamMap)
  NS_DECL_CYCLE_COLLECTION_NATIVE_WRAPPERCACHE_CLASS(AudioParamMap)

  explicit AudioParamMap(AudioWorkletNode* aParent);

  AudioWorkletNode* GetParentObject() const { return mParent; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

 private:
  ~AudioParamMap() = default;
  RefPtr<AudioWorkletNode> mParent;
};

}  // namespace mozilla::dom

#endif  // AudioParamMap_h_
