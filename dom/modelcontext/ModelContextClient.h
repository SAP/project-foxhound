/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ModelContextClient_h
#define mozilla_dom_ModelContextClient_h

#include "mozilla/dom/ModelContextBinding.h"
#include "nsCOMPtr.h"
#include "nsWrapperCache.h"

class nsPIDOMWindowInner;

namespace mozilla::dom {

class Promise;
class UserInteractionCallback;

class ModelContextClient final : public nsISupports, public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS(ModelContextClient)

  explicit ModelContextClient(nsPIDOMWindowInner* aWindow);

  nsPIDOMWindowInner* GetParentObject() const { return mWindow; }

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  MOZ_CAN_RUN_SCRIPT
  already_AddRefed<Promise> RequestUserInteraction(
      UserInteractionCallback& aCallback, ErrorResult& aRv);

 private:
  ~ModelContextClient() = default;

  nsCOMPtr<nsPIDOMWindowInner> mWindow;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_ModelContextClient_h
