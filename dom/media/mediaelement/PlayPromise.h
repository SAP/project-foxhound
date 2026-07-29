/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef PlayPromise_h_
#define PlayPromise_h_

#include "mozilla/dom/Promise.h"

namespace mozilla::dom {

class PlayPromise : public Promise {
 public:
  static already_AddRefed<PlayPromise> Create(nsIGlobalObject* aGlobal,
                                              ErrorResult& aRv);

  using PlayPromiseArr = nsTArray<RefPtr<PlayPromise>>;
  static void ResolvePromisesWithUndefined(const PlayPromiseArr& aPromises);
  static void RejectPromises(const PlayPromiseArr& aPromises, nsresult aError);

  ~PlayPromise();
  void MaybeResolveWithUndefined();
  void MaybeReject(nsresult aReason);

 private:
  explicit PlayPromise(nsIGlobalObject* aGlobal);
  bool mFulfilled = false;
};

}  // namespace mozilla::dom

#endif  // PlayPromise_h_
