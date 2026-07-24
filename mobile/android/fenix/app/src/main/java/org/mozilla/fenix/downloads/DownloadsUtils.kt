/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads

import android.content.Context
import android.webkit.MimeTypeMap
import mozilla.components.feature.downloads.R as downloadsR

/**
 * Generates a user-facing error message indicating that a downloaded file cannot be opened
 * because no application is available to handle its file type.
 *
 * @param context The Context used to access string resources.
 * @param filePath The file path of the downloaded file.
 * @return A formatted string message. For example, "No app found to open .pdf files".
 */
fun getCannotOpenFileErrorMessage(context: Context, filePath: String): String {
    val fileExt = MimeTypeMap.getFileExtensionFromUrl(filePath)
    return context.getString(
        downloadsR.string.mozac_feature_downloads_open_not_supported1,
        fileExt,
    )
}
