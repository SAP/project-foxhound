/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Internal database for storing data for the Tab Group feature.
 **/
@Database(
    entities = [StoredTabGroup::class, TabGroupAssignment::class],
    version = 2,
)
internal abstract class TabGroupDatabase : RoomDatabase() {

    abstract val tabGroupOperationsDao: TabGroupOperationsDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "UPDATE $TAB_GROUP_TABLE_NAME SET theme = 'Purple' WHERE theme = 'Violet'",
                )
            }
        }
    }
}
