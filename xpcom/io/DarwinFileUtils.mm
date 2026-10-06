/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DarwinFileUtils.h"
#include <Foundation/Foundation.h>

namespace DarwinFileUtils {

void GetTemporaryDirectory(nsACString& aTempDir) {
  aTempDir.Assign([::NSTemporaryDirectory() UTF8String]);
}

}  // namespace DarwinFileUtils
