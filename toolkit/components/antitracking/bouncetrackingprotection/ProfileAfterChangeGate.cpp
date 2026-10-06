/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// ProfileAfterChangeGate.cpp
#include "ProfileAfterChangeGate.h"
#include "nsError.h"
#include <string.h>
#include "MainThreadUtils.h"

static bool sPastPAC = false;  // main-thread only

NS_IMPL_ISUPPORTS(ProfileAfterChangeGate, nsIObserver)

NS_IMETHODIMP
ProfileAfterChangeGate::Observe(nsISupports*, const char* aTopic,
                                const char16_t*) {
  MOZ_ASSERT(NS_IsMainThread());
  if (strcmp(aTopic, "profile-after-change") == 0) {
    sPastPAC = true;
  }
  return NS_OK;
}

nsresult EnsurePastProfileAfterChange() {
  MOZ_ASSERT(NS_IsMainThread());
  return sPastPAC ? NS_OK : NS_ERROR_NOT_AVAILABLE;
}
