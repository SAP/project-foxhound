/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/BrowsingContextGroup.h"

// session history
#include "nsSHistory.h"

namespace mozilla {

// The one time initialization for this module
nsresult InitDocShellModule() {
  mozilla::dom::BrowsingContext::Init();

  return NS_OK;
}

void UnloadDocShellModule() { nsSHistory::Shutdown(); }

}  // namespace mozilla
