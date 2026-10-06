/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_StorageDBUpdater_h
#define mozilla_dom_StorageDBUpdater_h

namespace mozilla::dom::StorageDBUpdater {

// Must only be called on an empty database.
nsresult CreateCurrentSchema(mozIStorageConnection* aWorkerConnection);

// XXX Rename to MaybeUpdate or EnsureCurrentSchemaVersion.
nsresult Update(mozIStorageConnection* aWorkerConnection);

}  // namespace mozilla::dom::StorageDBUpdater

#endif  // mozilla_dom_StorageDBUpdater_h
