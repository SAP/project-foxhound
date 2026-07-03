/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.content.ContentResolver
import android.content.Intent
import android.net.Uri

/**
 * An interface for handling downloaded files, such as opening files,
 * creating intents, and resolving content types and URIs.
 */
interface DownloadFileUtils {

    /**
     * The current directory path where downloads are saved.
     */
    val currentDownloadLocation: String

    /**
     * Guess the name of the file that should be downloaded.
     *
     * This method is largely identical to [android.webkit.URLUtil.guessFileName]
     * which unfortunately does not implement RFC 5987.
     */
    fun guessFileName(
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ): String

    /**
     * Launches an intent to open the given downloaded file.
     *
     * @param fileName The name of the file to open (e.g., "document.pdf").
     * @param directoryPath The path or content URI of the directory where the file is located.
     * @param contentType The MIME type of the file (e.g., "application/pdf").
     * @return true if the file was opened successfully, false otherwise.
     */
    fun openFile(
        fileName: String?,
        directoryPath: String,
        contentType: String?,
    ): Boolean

    /**
     * Creates an Intent that can be used to open the specified file.
     *
     * @param fileName The name of the file to open (e.g., "document.pdf").
     * @param directoryPath The file path or content URI string for the directory where the file is stored.
     * @param downloadContentType The MIME type of the file, as reported by the server or system.
     * @return A fully configured [android.content.Intent] to view the file, or `null` if the file could not be found.
     */
    fun createOpenFileIntent(
        fileName: String?,
        directoryPath: String,
        downloadContentType: String?,
    ): Intent?

    /**
     * Finds the content URI for a downloaded file.
     *
     * @param fileName The name of the file to find.
     * @param directoryPath The directory where the file is located.
     * @return The content [Uri] of the file, or `null` if it cannot be found.
     */
    fun findDownloadFileUri(fileName: String?, directoryPath: String): Uri?

    /**
     * Finds a shareable content URI for a downloaded file.
     *
     * This method ensures the returned URI can be shared with other applications,
     * converting file URIs to content URIs via FileProvider
     * and Storage Access Framework URIs to document URIs if necessary.
     *
     * @param fileName The name of the file to find.
     * @param directoryPath The directory where the file is located.
     * @return A shareable [Uri] of the file, or `null` if it cannot be found.
     */
    fun findShareableDownloadFileUri(fileName: String?, directoryPath: String): Uri?

    /**
     * Determines a safe and reliable MIME type for a file.
     *
     * @param fileName The name of the file, used to infer the MIME type from its extension.
     * @param contentType The original MIME type provided for the file.
     * @param uri An optional [Uri] for the file, used for a more accurate MIME type lookup.
     * @return A sanitized MIME type string.
     */
    fun getSafeContentType(
        fileName: String?,
        contentType: String?,
        uri: Uri? = null,
    ): String

    /**
     * Checks if a file exists in the specified directory.
     *
     * @param directoryPath The path or content URI of the directory.
     * @param fileName The name of the file to check.
     */
    fun fileExists(directoryPath: String, fileName: String?): Boolean

    /**
     * Generates a unique file name for a given directory to avoid overwriting existing files.
     * This function handles both standard file paths and Storage Access Framework (SAF) URIs.
     *
     * @param directoryPath The path or content URI of the target directory.
     * @param fileName The desired initial file name (e.g., "document.pdf").
     * @return A unique file name (e.g., "document (1).pdf").
     */
    fun uniqueFileName(
        directoryPath: String,
        fileName: String,
    ): String

    /**
     * Deletes a file from the device storage.
     *
     * @param contentResolver The [ContentResolver] used to perform the deletion.
     * @param fileName The name of the file to be deleted.
     * @param directoryPath The path or content URI string of the directory containing the file.
     * @return `true` if the file was successfully deleted, `false` otherwise (e.g., file not
     * found, permission denied, or an error occurred during deletion).
     */
    fun deleteMediaFile(
        contentResolver: ContentResolver,
        fileName: String?,
        directoryPath: String,
    ): Boolean

    /**
     * Renames a file within a directory.
     * This method handles both standard file paths and Storage Access Framework (SAF) URIs.
     *
     * @param directoryPath The path of the directory containing the file.
     * @param oldName The current name of the file to be renamed.
     * @param newName The new name to be assigned to the file.
     */
    fun renameFile(
        directoryPath: String,
        oldName: String?,
        newName: String,
    ): Boolean
}
