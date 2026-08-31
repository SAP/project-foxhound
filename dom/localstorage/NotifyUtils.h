/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_LOCALSTORAGE_NOTIFYUTILS_H_
#define DOM_LOCALSTORAGE_NOTIFYUTILS_H_

namespace mozilla::dom::localstorage {

void NotifyDatabaseWorkStarted();

void NotifyRequestFinalizationStarted();

}  // namespace mozilla::dom::localstorage

#endif  // DOM_LOCALSTORAGE_NOTIFYUTILS_H_
