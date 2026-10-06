/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// ProfileAfterChangeGate.h
#ifndef mozilla_ProfileAfterChangeGate_h
#define mozilla_ProfileAfterChangeGate_h

#include "nsIObserver.h"

// Tiny observer that flips a file-scope flag at "profile-after-change".

class ProfileAfterChangeGate final : public nsIObserver {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER
 private:
  ~ProfileAfterChangeGate() = default;
};

// NS_OK if past "profile-after-change", else NS_ERROR_NOT_AVAILABLE.
nsresult EnsurePastProfileAfterChange();

#endif
