/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.bookmarks.file

import android.net.Uri

/**
 * An interface for importing bookmarks from a file.
 */
fun interface BookmarksFileImporter {
    /**
     * The result of a bookmarks file import.
     *
     * @property guid The guid of the root of the imported bookmark tree.
     * @property count The number of bookmarks imported.
     */
    data class ImportResult(val guid: String, val count: Int)

    /**
     * Imports bookmarks from the file at the given [uri].
     *
     * @param uri The URI of the file to import bookmarks from.
     * @return A [Result] containing [ImportResult] on success or an exception on failure.
     */
    suspend fun importBookmarksFromUri(uri: Uri): Result<ImportResult>

    companion object {
        /**
         * Creates a [BookmarksFileImporter] that always returns a successful [Result].
         *
         * @param result The [ImportResult] to return on every import.
         */
        fun alwaysSuccess(
            result: ImportResult = ImportResult(guid = "", count = 0),
        ): BookmarksFileImporter = BookmarksFileImporter { Result.success(result) }

        /**
         * Creates a [BookmarksFileImporter] that always returns a failed [Result].
         *
         * @param exception The [Exception] to return on every import.
         */
        fun alwaysFailure(
            exception: Exception = IllegalStateException("Import failed"),
        ): BookmarksFileImporter = BookmarksFileImporter { Result.failure(exception) }
    }
}
