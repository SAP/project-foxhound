/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLKIT_COMPONENTS_BUILD_NSTOOLKITCOMPSMODULE_H_
#define TOOLKIT_COMPONENTS_BUILD_NSTOOLKITCOMPSMODULE_H_

#include "nscore.h"
#include "nsID.h"

class nsISupports;

nsresult nsUrlClassifierDBServiceConstructor(const nsIID& aIID, void** aResult);

#endif  // TOOLKIT_COMPONENTS_BUILD_NSTOOLKITCOMPSMODULE_H_
