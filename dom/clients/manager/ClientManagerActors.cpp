/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ClientManagerChild.h"
#include "ClientManagerParent.h"

namespace mozilla::dom {

already_AddRefed<PClientManagerParent> AllocClientManagerParent() {
  return MakeAndAddRef<ClientManagerParent>();
}

void InitClientManagerParent(PClientManagerParent* aActor) {
  auto actor = static_cast<ClientManagerParent*>(aActor);
  actor->Init();
}

}  // namespace mozilla::dom
