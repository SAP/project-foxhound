/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.content.ContentResolver
import android.content.Intent
import android.net.Uri
import androidx.core.net.toUri
import java.io.File

/**
 * A fake implementation of [DownloadFileUtils] for testing purposes.
 *
 * This class allows faking the behavior of file-related operations during downloads
 * by providing lambdas for its primary functions.
 */
class FakeDownloadFileUtils(
    private val downloadLocation: String = "/storage/emulated/0/Download",
    private val guessFileName: (
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ) -> String = { _, _, _ -> "fileName" },
    private val findDownloadFileUri: (
        fileName: String?,
        directoryPath: String,
    ) -> Uri? = { fileName, _ ->
        fileName?.toUri()
    },
    private val findShareableDownloadFileUri: (
        fileName: String?,
        directoryPath: String,
    ) -> Uri? = { fileName, _ ->
        fileName?.toUri()
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
    ) -> String = { _, fileName ->
        fileName
    },
    private val openFile: (
        fileName: String?,
        directoryPath: String,
        contentType: String?,
    ) -> Boolean = { _, _, _ -> true },
    private val createOpenFileIntent: (
        fileName: String?,
        directoryPath: String,
        downloadContentType: String?,
    ) -> Intent? = { _, _, _ -> null },
    private val deleteMediaFile: (
        contentResolver: ContentResolver,
        fileName: String?,
        directoryPath: String,
    ) -> Boolean = { _, _, _ -> true },
    private val getSafeContentType: (
        fileName: String?,
        contentType: String?,
        uri: Uri?,
    ) -> String = { _, _, _ ->
        "safeContentType"
    },
    private val renameFile: (
        directoryPath: String,
        oldName: String?,
        newName: String,
    ) -> Boolean = { _, _, _ -> true },
) : DownloadFileUtils {
    override val currentDownloadLocation: String
        get() = downloadLocation

    override fun guessFileName(
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ): String {
        return guessFileName.invoke(contentDisposition, url, mimeType)
    }

    override fun openFile(
        fileName: String?,
        directoryPath: String,
        contentType: String?,
    ): Boolean {
        return openFile.invoke(fileName, directoryPath, contentType)
    }

    override fun createOpenFileIntent(
        fileName: String?,
        directoryPath: String,
        downloadContentType: String?,
    ): Intent? {
        return createOpenFileIntent.invoke(fileName, directoryPath, downloadContentType)
    }

    override fun findDownloadFileUri(
        fileName: String?,
        directoryPath: String,
    ): Uri? {
        return findDownloadFileUri.invoke(fileName, directoryPath)
    }

    override fun findShareableDownloadFileUri(
        fileName: String?,
        directoryPath: String,
    ): Uri? {
       return findShareableDownloadFileUri.invoke(fileName, directoryPath)
    }

    override fun getSafeContentType(
        fileName: String?,
        contentType: String?,
        uri: Uri?,
    ): String {
        return getSafeContentType.invoke(fileName, contentType, uri)
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

    override fun deleteMediaFile(
        contentResolver: ContentResolver,
        fileName: String?,
        directoryPath: String,
    ): Boolean {
        return deleteMediaFile.invoke(contentResolver, fileName, directoryPath)
    }

    override fun renameFile(
        directoryPath: String,
        oldName: String?,
        newName: String,
    ): Boolean {
        return renameFile.invoke(directoryPath, oldName, newName)
    }
}
