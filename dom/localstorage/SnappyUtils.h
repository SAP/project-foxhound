/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_localstorage_SnappyUtils_h
#define mozilla_dom_localstorage_SnappyUtils_h

#include "nsStringFwd.h"

namespace mozilla::dom {

bool SnappyCompress(const nsACString& aSource, nsACString& aDest);

bool SnappyUncompress(const nsACString& aSource, nsACString& aDest);

}  // namespace mozilla::dom

#endif  // mozilla_dom_localstorage_SnappyUtils_h
