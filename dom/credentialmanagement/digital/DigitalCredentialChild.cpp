/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/DigitalCredentialChild.h"

#include "mozilla/dom/DigitalCredentialHandler.h"

namespace mozilla::dom {

void DigitalCredentialChild::SetHandler(DigitalCredentialHandler* aHandler) {
  mHandler = aHandler;
}

void DigitalCredentialChild::ActorDestroy(ActorDestroyReason why) {
  if (mHandler) {
    mHandler->ActorDestroyed();
    mHandler = nullptr;
  }
}

}  // namespace mozilla::dom
