/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "NotifyUtils.h"

#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/quota/NotifyUtilsCommon.h"

namespace mozilla::dom::indexedDB {

void NotifyDatabaseWorkStarted() {
  if (!StaticPrefs::dom_indexedDB_testing()) {
    return;
  }

  quota::NotifyObserversOnMainThread("IndexedDB::DatabaseWorkStarted");
}

}  // namespace mozilla::dom::indexedDB
