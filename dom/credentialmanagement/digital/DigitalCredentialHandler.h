/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_DigitalCredentialHandler_h
#define mozilla_dom_DigitalCredentialHandler_h

#include "mozilla/MozPromise.h"
#include "mozilla/dom/AbortSignal.h"
#include "mozilla/dom/DigitalCredentialChild.h"
#include "mozilla/dom/Promise.h"

namespace mozilla::dom {

class DigitalCredentialHandler final : public AbortFollower {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS(DigitalCredentialHandler)

  explicit DigitalCredentialHandler(nsPIDOMWindowInner* aWindow)
      : mWindow(aWindow), mPending(false) {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(aWindow);
  }

  void GetDigitalCredential(JSContext* aCx,
                            const DigitalCredentialRequestOptions& aOptions,
                            const Optional<OwningNonNull<AbortSignal>>& aSignal,
                            const RefPtr<Promise>& aPromise);

  void CreateDigitalCredential(
      JSContext* aCx, const DigitalCredentialCreationOptions& aOptions,
      const Optional<OwningNonNull<AbortSignal>>& aSignal,
      const RefPtr<Promise>& aPromise);

  void CancelOperationInParent();

  void ActorDestroyed();

  // AbortFollower
  void RunAbortAlgorithm() override;

 private:
  virtual ~DigitalCredentialHandler();

  bool MaybeCreateActor();
  void RejectPromiseWithAbortError(const RefPtr<Promise>& aPromise);

  nsCOMPtr<nsPIDOMWindowInner> mWindow;
  RefPtr<DigitalCredentialChild> mActor;
  bool mPending;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_DigitalCredentialHandler_h
