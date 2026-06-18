/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Database
import androidx.room.RoomDatabase

/**
 * Internal database for storing data for the Tab Group feature.
 **/
@Database(
    entities = [StoredTabGroup::class, TabGroupAssignment::class],
    version = 1,
)
internal abstract class TabGroupDatabase : RoomDatabase() {

    abstract val tabGroupOperationsDao: TabGroupOperationsDao
}
