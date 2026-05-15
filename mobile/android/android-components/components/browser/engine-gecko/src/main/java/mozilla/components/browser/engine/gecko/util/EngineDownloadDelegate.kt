/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package mozilla.components.browser.engine.gecko.util

import android.content.Context
import mozilla.components.concept.engine.DownloadDelegate
import mozilla.components.support.utils.DefaultDownloadFileUtils

/**
 * This class acts as a bridge between the engine's download requests and the application's
 * file utility logic.
 */
class EngineDownloadDelegate(
    context: Context,
    downloadLocationGetter: () -> String,
) : DownloadDelegate {

    val downloadFileUtils = DefaultDownloadFileUtils(
        context = context,
        downloadLocation = downloadLocationGetter,
    )

    /**
     * Guess the name of the file that should be downloaded.
     */
    override fun guessFileName(
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ): String {
        return downloadFileUtils.guessFileName(contentDisposition, url, mimeType)
    }
}
