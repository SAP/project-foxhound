/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.cache

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class CacheDirectoryMigrationTest {

    @Before
    @After
    fun cleanUp() {
        CacheDirectoryMigration.resetMigrationState()
        File(testContext.cacheDir, PARENT_DIRECTORY_NAME).deleteRecursively()
        File(testContext.noBackupFilesDir, PARENT_DIRECTORY_NAME).deleteRecursively()
        File(testContext.noBackupFilesDir, MISSING_PARENT).deleteRecursively()
        File(testContext.noBackupFilesDir, NO_FOLDER_FILE).deleteRecursively()
        File(testContext.noBackupFilesDir, "$PARENT_DIRECTORY_NAME.migrating").deleteRecursively()
    }

    @Test
    fun `migrateIfNeeded is a no-op when legacy directory does not exist`() {
        createMigration().migrateIfNeeded(testContext)

        assertFalse(File(testContext.cacheDir, PARENT_DIRECTORY_NAME).exists())
        assertFalse(File(testContext.noBackupFilesDir, PARENT_DIRECTORY_NAME).exists())
    }

    @Test
    fun `migrateIfNeeded moves legacy entries to the new directory`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        val legacyDir = File(legacyParent, "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "marker").writeText("legacy")

        createMigration().migrateIfNeeded(testContext)

        val newDir = File(File(testContext.noBackupFilesDir, PARENT_DIRECTORY_NAME), "entries")
        assertTrue(File(newDir, "marker").exists())
        assertEquals("legacy", File(newDir, "marker").readText())
        assertFalse(legacyParent.exists())
    }

    @Test
    fun `migrateIfNeeded only migrates once per source and target pair`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        val legacyDir = File(legacyParent, "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "marker").writeText("legacy")

        val migration = createMigration()
        migration.migrateIfNeeded(testContext)

        val newDir = File(File(testContext.noBackupFilesDir, PARENT_DIRECTORY_NAME), "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "new-legacy-marker").writeText("new-legacy")

        migration.migrateIfNeeded(testContext)

        assertTrue(File(newDir, "marker").exists())
        assertFalse(File(newDir, "new-legacy-marker").exists())
        assertTrue(File(legacyDir, "new-legacy-marker").exists())
    }

    @Test
    fun `migrateIfNeeded copies legacy entries when rename fails`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        val legacyDir = File(legacyParent, "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "marker").writeText("legacy")

        createMigration(
            newDirectory = { File(it.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME") },
        ).migrateIfNeeded(testContext)

        val newDir = File(testContext.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME/entries")
        assertTrue(File(newDir, "marker").exists())
        assertEquals("legacy", File(newDir, "marker").readText())
        assertFalse(legacyParent.exists())
    }

    @Test
    fun `migrateIfNeeded replaces stale temporary data when retrying copy migration`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        val legacyDir = File(legacyParent, "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "marker").writeText("legacy")

        val staleTempDir = File(testContext.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME.migrating/entries")
        assertTrue(staleTempDir.mkdirs())
        File(staleTempDir, "stale-marker").writeText("stale")

        createMigration(
            newDirectory = { File(it.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME") },
        ).migrateIfNeeded(testContext)

        val newDir = File(testContext.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME/entries")
        assertTrue(File(newDir, "marker").exists())
        assertFalse(File(newDir, "stale-marker").exists())
        assertFalse(legacyParent.exists())
    }

    @Test
    fun `migrateIfNeeded removes temporary directory after successful copy migration`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        val legacyDir = File(legacyParent, "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "marker").writeText("legacy")

        createMigration(
            newDirectory = { File(it.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME") },
        ).migrateIfNeeded(testContext)

        assertFalse(File(testContext.noBackupFilesDir, "$MISSING_PARENT/$PARENT_DIRECTORY_NAME.migrating").exists())
        assertFalse(legacyParent.exists())
    }

    @Test
    fun `migrateIfNeeded retries after a failed migration`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        val legacyDir = File(legacyParent, "entries")
        assertTrue(legacyDir.mkdirs())
        File(legacyDir, "marker").writeText("legacy")

        // A file at the target root prevents the fallback copy migration from creating its destination.
        val blockedTargetRoot = File(testContext.noBackupFilesDir, NO_FOLDER_FILE).apply {
            writeText("blocking file")
        }
        val targetParent = File(testContext.noBackupFilesDir, "$NO_FOLDER_FILE/$PARENT_DIRECTORY_NAME")
        val migratedEntriesDir = File(targetParent, "entries")
        val migration = createMigration(
            newDirectory = { targetParent },
        )

        migration.migrateIfNeeded(testContext)

        assertTrue(legacyParent.exists())
        assertFalse(migratedEntriesDir.exists())

        // Remove the blocker and retry the same migration pair to verify the failed attempt was not cached as complete.
        assertTrue(blockedTargetRoot.delete())
        assertTrue(blockedTargetRoot.mkdirs())

        migration.migrateIfNeeded(testContext)

        assertTrue(File(migratedEntriesDir, "marker").exists())
        assertFalse(legacyParent.exists())
    }

    @Test
    fun `migrateIfNeeded deletes legacy entries when the new directory already exists`() {
        val legacyParent = File(testContext.cacheDir, PARENT_DIRECTORY_NAME)
        assertTrue(File(legacyParent, "entries").mkdirs())
        File(File(legacyParent, "entries"), "legacy-marker").writeText("legacy")

        val newParent = File(testContext.noBackupFilesDir, PARENT_DIRECTORY_NAME)
        assertTrue(File(newParent, "entries").mkdirs())
        File(File(newParent, "entries"), "new-marker").writeText("new")

        createMigration().migrateIfNeeded(testContext)

        assertFalse(legacyParent.exists())
        assertTrue(File(File(newParent, "entries"), "new-marker").exists())
        assertEquals("new", File(File(newParent, "entries"), "new-marker").readText())
    }

    private fun createMigration(
        legacyDirectory: (android.content.Context) -> File = { File(it.cacheDir, PARENT_DIRECTORY_NAME) },
        newDirectory: (android.content.Context) -> File = { File(it.noBackupFilesDir, PARENT_DIRECTORY_NAME) },
    ) = CacheDirectoryMigration(
        logger = Logger("CacheDirMigrationTest"),
        legacyDirectory = legacyDirectory,
        newDirectory = newDirectory,
    )

    companion object {
        private const val PARENT_DIRECTORY_NAME = "cache_dir_migration_test"

        // missing-parent will be used as a parent folder that doesn't exist, which will make `renameTo`
        // fail in the production code and activate the `migrateByCopy` code path.
        private const val MISSING_PARENT = "missing-parent"
        private const val NO_FOLDER_FILE = "retry-parent"
    }
}
