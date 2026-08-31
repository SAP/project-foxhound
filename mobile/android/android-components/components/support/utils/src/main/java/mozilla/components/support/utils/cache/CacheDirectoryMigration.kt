/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.cache

import android.content.Context
import androidx.annotation.VisibleForTesting
import mozilla.components.support.base.log.logger.Logger
import java.io.File

private const val TEMP_DIRECTORY_SUFFIX = ".migrating"

/**
 * Moves a legacy cache directory into a persistent app-owned directory once per source/target pair.
 * The migration will be applied only if the target directory doesn't exist, meaning that it is
 * intended to run only once, when user updates from a version using the legacy cache directory to
 * a version using the new directory.
 * Clearing cache won't trigger a new migration, as the migration is only necessary if we have files
 * in the legacy cache, which need to be migrated to the new cache directory.
 * @param logger logger used for IO warnings and failures.
 * @param legacyDirectory provides the legacy [File] directory from where the files should be migrated.
 * @param newDirectory provides the new [File] directory to where the files should be migrated.
 */
class CacheDirectoryMigration(
    private val logger: Logger,
    private val legacyDirectory: (Context) -> File,
    private val newDirectory: (Context) -> File,
) {

    /**
     * Migrates the files from legacyDirectory to newDirectory if they haven't been migrated yet.
     * @param context: The application [Context] used to access the storage directories.
     */
    fun migrateIfNeeded(context: Context) {
        val legacyDirectory = legacyDirectory(context)
        val newDirectory = newDirectory(context)
        val migrationKey = "${legacyDirectory.absolutePath}->${newDirectory.absolutePath}"

        synchronized(migratedDirs) {
            if (migrationKey in migratedDirs) {
                return
            }

            if (migrate(legacyDirectory, newDirectory)) {
                migratedDirs += migrationKey
            }
        }
    }

    private fun migrate(legacyDirectory: File, newDirectory: File): Boolean {
        if (!legacyDirectory.exists()) {
            return true
        }

        return try {
            when {
                newDirectory.exists() -> deleteLegacyDir(legacyDirectory)
                legacyDirectory.renameTo(newDirectory) -> true
                else -> migrateByCopy(legacyDirectory, newDirectory, getTemporaryDirectory(newDirectory))
            }
        } catch (e: SecurityException) {
            logger.warn("Failed to migrate legacy cache directory.", e)
            false
        }
    }

    private fun migrateByCopy(
        legacyDirectory: File,
        newDirectory: File,
        temporaryDirectory: File,
    ): Boolean {
        if (temporaryDirectory.exists() && !temporaryDirectory.deleteRecursively()) {
            logger.warn("Failed to clear incomplete cache migration state.")
            return false
        }

        val wasCopySuccessful = runCatching {
            legacyDirectory.copyRecursively(target = temporaryDirectory)
        }.isSuccess

        if (!wasCopySuccessful) {
            temporaryDirectory.deleteRecursively()
            logger.warn("Failed to migrate cache to noBackupFilesDir; keeping legacy entries.")
            return false
        }

        if (!temporaryDirectory.renameTo(newDirectory)) {
            temporaryDirectory.deleteRecursively()
            logger.warn("Failed to finalize cache migration; keeping legacy entries.")
            return false
        }

        return deleteLegacyDir(legacyDirectory)
    }

    private fun getTemporaryDirectory(newDirectory: File): File =
        File(newDirectory.parentFile, "${newDirectory.name}$TEMP_DIRECTORY_SUFFIX")

    private fun deleteLegacyDir(directory: File): Boolean {
        if (!directory.deleteRecursively()) {
            logger.warn("Failed to delete legacy cache directory after migration.")
            return false
        }
        return true
    }

    companion object {
        private val migratedDirs = mutableSetOf<String>()

        /**
         * Resets the migration state for tests purpose.
         */
        @VisibleForTesting
        fun resetMigrationState() {
            synchronized(migratedDirs) {
                migratedDirs.clear()
            }
        }
    }
}
