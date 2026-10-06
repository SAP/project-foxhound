/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef AudioWorkletProcessor_h_
#define AudioWorkletProcessor_h_

#include "mozilla/dom/AudioWorkletGlobalScope.h"
#include "nsCOMPtr.h"
#include "nsWrapperCache.h"

namespace mozilla {

class ErrorResult;

namespace dom {

struct AudioWorkletNodeOptions;
class GlobalObject;
class MessagePort;

class AudioWorkletProcessor final : public nsWrapperCache {
 public:
  NS_INLINE_DECL_CYCLE_COLLECTING_NATIVE_REFCOUNTING(AudioWorkletProcessor)
  NS_DECL_CYCLE_COLLECTION_NATIVE_WRAPPERCACHE_CLASS(AudioWorkletProcessor)

  static already_AddRefed<AudioWorkletProcessor> Constructor(
      const GlobalObject& aGlobal, ErrorResult& aRv);

  nsIGlobalObject* GetParentObject() const { return mParent; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  MessagePort* Port() const { return mPort; };

 private:
  explicit AudioWorkletProcessor(RefPtr<AudioWorkletGlobalScope>&& aParent,
                                 RefPtr<MessagePort>&& aPort);
  ~AudioWorkletProcessor();
  RefPtr<AudioWorkletGlobalScope> mParent;
  RefPtr<MessagePort> mPort;
};

}  // namespace dom
}  // namespace mozilla

#endif  // AudioWorkletProcessor_h_
