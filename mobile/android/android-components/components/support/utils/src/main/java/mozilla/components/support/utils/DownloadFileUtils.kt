/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.net.Uri

/**
 * An interface for handling downloaded files, such as opening files,
 * creating intents, and resolving content types and URIs.
 */
interface DownloadFileUtils {

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
     * Finds the content URI for a downloaded file.
     *
     * @param fileName The name of the file to find.
     * @param directoryPath The directory where the file is located.
     * @return The content [Uri] of the file, or `null` if it cannot be found.
     */
    fun findDownloadFileUri(fileName: String?, directoryPath: String): Uri?

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
}
