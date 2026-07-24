/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine

/**
 * Interface defining a delegate for handling download-related operations within the engine.
 */
interface DownloadDelegate {

    /**
     * @param contentDisposition The 'Content-Disposition' HTTP header value, if available.
     * @param url The full URL of the resource being downloaded.
     * @param mimeType The 'Content-Type' (MIME type) of the resource, if available.
     * @return A string representing the suggested filename for the downloaded file.
     */
    fun guessFileName(
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ): String
}
