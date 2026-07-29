/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_Crypto_h
#define mozilla_dom_Crypto_h

#include "mozilla/dom/SubtleCrypto.h"
#include "mozilla/dom/TypedArray.h"
#include "nsIGlobalObject.h"
#include "nsString.h"
#include "nsWrapperCache.h"

namespace mozilla {

class ErrorResult;

namespace dom {

class Crypto final : public nsISupports, public nsWrapperCache {
 protected:
  ~Crypto();

 public:
  explicit Crypto(nsIGlobalObject* aParent);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS_FINAL
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(Crypto)

  void GetRandomValues(JSContext* aCx, const ArrayBufferView& aArray,
                       JS::MutableHandle<JSObject*> aRetval, ErrorResult& aRv);

  void RandomUUID(nsACString& aRetVal);

  SubtleCrypto* Subtle();

  nsIGlobalObject* GetParentObject() const { return mParent; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

 private:
  nsCOMPtr<nsIGlobalObject> mParent;
  RefPtr<SubtleCrypto> mSubtle;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_Crypto_h
