/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef STORAGE_STORAGEPATHUTIL_H_
#define STORAGE_STORAGEPATHUTIL_H_

#include "nsStringFwd.h"

namespace mozilla::storage {

// Normalize and percent-encode |aPath| in place so it can be embedded in a
// SQLite file: URI. On Windows also strips \\?\ long-path prefix and
// rewrites drive-letter paths to /C:/... form.
void PreparePathForURI(nsACString& aPath);

}  // namespace mozilla::storage

#endif  // STORAGE_STORAGEPATHUTIL_H_
