/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

/**
 * Defines a contract for converting file paths and URIs into human-readable,
 * friendly strings for display in the UI.
 */
interface DownloadLocationFormatter {
    /**
     * Converts a Storage Access Framework URI string or a file path into a more human-readable format.
     * Examples:
     * "content://.../tree/primary%3ADownload%2FT" becomes "~/T"
     * "/storage/emulated/0/Download" becomes "~/Download"
     *
     * @param uriString The URI string or file path to format.
     * @return A user-friendly, shortened path string.
     */
    fun getFriendlyPath(uriString: String): String
}
