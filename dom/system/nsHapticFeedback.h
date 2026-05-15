/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_SYSTEM_NSHAPTICFEEDBACK_H_
#define DOM_SYSTEM_NSHAPTICFEEDBACK_H_

#include "nsIHapticFeedback.h"

class nsHapticFeedback final : public nsIHapticFeedback {
 private:
  ~nsHapticFeedback() {}

 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIHAPTICFEEDBACK
};

#endif  // DOM_SYSTEM_NSHAPTICFEEDBACK_H_
