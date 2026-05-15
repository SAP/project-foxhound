/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_HTMLEditorController_h_
#define mozilla_HTMLEditorController_h_

#include "nscore.h"  // for nsresult

class nsControllerCommandTable;

namespace mozilla {

class HTMLEditorController final {
 public:
  static void RegisterEditorDocStateCommands(
      nsControllerCommandTable* aCommandTable);
  static void RegisterHTMLEditorCommands(
      nsControllerCommandTable* aCommandTable);
  static void Shutdown();
};

}  // namespace mozilla

#endif /* mozllla_HTMLEditorController_h__ */
