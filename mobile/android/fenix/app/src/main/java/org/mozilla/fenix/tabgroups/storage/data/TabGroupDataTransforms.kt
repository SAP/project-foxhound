/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.data

import org.mozilla.fenix.tabgroups.storage.database.StoredTabGroup

/**
 * Converts the public [TabGroup] model so it can be saved to disk.
 */
internal fun TabGroup.toStoredTabGroup(): StoredTabGroup = StoredTabGroup(
    id = id,
    title = title,
    theme = theme,
    closed = closed,
    lastModified = lastModified,
)

/**
 * Converts a [StoredTabGroup] so it can be emitted from the storage layer.
 */
internal fun StoredTabGroup.toTabGroup(): TabGroup = TabGroup(
    id = id,
    title = title,
    theme = theme,
    closed = closed,
    lastModified = lastModified,
)
