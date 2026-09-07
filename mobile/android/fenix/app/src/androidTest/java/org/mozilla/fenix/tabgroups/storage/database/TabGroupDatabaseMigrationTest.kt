/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups.storage.database

import androidx.room.testing.MigrationTestHelper
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import java.io.IOException

class TabGroupDatabaseMigrationTest {
    private val testDbName = "migration-test"

    @get:Rule
    val helper: MigrationTestHelper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        TabGroupDatabase::class.java,
    )

    @Test
    @Throws(IOException::class)
    fun migrate1To2() {
        helper.createDatabase(testDbName, 1).apply {
            execSQL(
                "INSERT INTO $TAB_GROUP_TABLE_NAME (id, title, theme, closed, lastModified) " +
                    "VALUES ('group-1', 'My Group', 'Violet', 0, 123456789)",
            )
            execSQL(
                "INSERT INTO $TAB_GROUP_TABLE_NAME (id, title, theme, closed, lastModified) " +
                    "VALUES ('group-2', 'Other Group', 'Blue', 0, 123456789)",
            )
            close()
        }

        helper.runMigrationsAndValidate(testDbName, 2, true, TabGroupDatabase.MIGRATION_1_2).apply {
            val cursor = query("SELECT id, theme FROM $TAB_GROUP_TABLE_NAME ORDER BY id ASC")

            assertEquals(2, cursor.count)

            cursor.moveToFirst()
            assertEquals("group-1", cursor.getString(0))
            assertEquals("Purple", cursor.getString(1))

            cursor.moveToNext()
            assertEquals("group-2", cursor.getString(0))
            assertEquals("Blue", cursor.getString(1))

            close()
        }
    }
}
