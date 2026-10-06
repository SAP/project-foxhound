/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CookieStoreChild.h"

#include "CookieStore.h"
#include "mozilla/ipc/PBackgroundChild.h"

namespace mozilla {

using namespace ipc;

namespace dom {

CookieStoreChild::CookieStoreChild() = default;

CookieStoreChild::~CookieStoreChild() = default;

void CookieStoreChild::Close() {
  if (CanSend()) {
    SendClose();
  }
}

}  // namespace dom
}  // namespace mozilla
