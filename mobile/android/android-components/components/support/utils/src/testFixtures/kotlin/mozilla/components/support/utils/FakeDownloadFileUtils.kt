/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.net.Uri
import android.os.Environment
import androidx.core.net.toUri
import java.io.File

/**
 * A fake implementation of [DownloadFileUtils] for testing purposes.
 *
 * This class allows faking the behavior of file-related operations during downloads
 * by providing lambdas for its primary functions.
 */
class FakeDownloadFileUtils(
    private val guessFileName: (
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ) -> String = { _, _, _ -> "fileName" },
    private val findDownloadFileUri: (
        fileName: String?,
        directoryPath: String,
    ) -> Uri = { _, _ ->
        Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS,
        ).path.toUri()
    },
    private val fileExists: (
        directoryPath: String,
        fileName: String?,
    ) -> Boolean = { directoryPath, fileName ->
        File(directoryPath, fileName ?: "").exists()
    },
    private val uniqueFileName: (
        directoryPath: String,
        fileName: String,
    ) -> String = { directoryPath, fileName ->
        "$directoryPath/$fileName"
    },
) : DownloadFileUtils {

    override fun guessFileName(
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ): String {
        return guessFileName.invoke(contentDisposition, url, mimeType)
    }

    override fun findDownloadFileUri(
        fileName: String?,
        directoryPath: String,
    ): Uri {
        return findDownloadFileUri.invoke(fileName, directoryPath)
    }

    override fun fileExists(
        directoryPath: String,
        fileName: String?,
    ): Boolean {
        return fileExists.invoke(directoryPath, fileName)
    }

    override fun uniqueFileName(
        directoryPath: String,
        fileName: String,
    ): String {
        return uniqueFileName.invoke(directoryPath, fileName)
    }
}
