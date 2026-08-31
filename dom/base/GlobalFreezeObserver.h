/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_BASE_GLOBALFREEZEOBSERVER_H_
#define DOM_BASE_GLOBALFREEZEOBSERVER_H_

#include "mozilla/Attributes.h"
#include "nsIGlobalObject.h"
#include "nsISupports.h"

namespace mozilla {

class GlobalFreezeObserver : public nsISupports,
                             public LinkedListElement<GlobalFreezeObserver> {
 public:
  virtual void FrozenCallback(nsIGlobalObject* aGlobal) = 0;
  virtual void ThawedCallback(nsIGlobalObject* aGlobal) {};

  bool Observing() { return !!mGlobal; }

  /**
   * This method is non-virtual because it's expected that any object
   * subclassing GlobalFreezeObserver that wants to know when it is disconnected
   * from the global will also subclass GlobalTeardownObserver and take any
   * relevant action by overriding GlobalTeardownObserver::DisconnectFromOwner.
   */
  void DisconnectFreezeObserver() {
    if (mGlobal) {
      mGlobal->RemoveGlobalFreezeObserver(this);
      mGlobal = nullptr;
    }
  }

 protected:
  virtual ~GlobalFreezeObserver() { DisconnectFreezeObserver(); }

  void BindToGlobal(nsIGlobalObject* aGlobal) {
    MOZ_ASSERT(!mGlobal);

    if (aGlobal) {
      MOZ_ASSERT(
          NS_IsMainThread(),
          "GlobalFreezeObserver is currently only supported in window object");
      mGlobal = aGlobal;
      aGlobal->AddGlobalFreezeObserver(this);
    }
  }

 private:
  // The parent global object. The global will clear this when
  // it is destroyed by calling DisconnectFreezeObserver().
  nsIGlobalObject* MOZ_NON_OWNING_REF mGlobal = nullptr;
};

}  // namespace mozilla

#endif
