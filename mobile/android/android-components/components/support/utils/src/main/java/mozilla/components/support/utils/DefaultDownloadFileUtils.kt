/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.core.net.toUri
import androidx.documentfile.provider.DocumentFile
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.utils.DownloadUtils.changeExtension
import mozilla.components.support.utils.DownloadUtils.createExtension
import mozilla.components.support.utils.DownloadUtils.extractFileNameFromUrl
import mozilla.components.support.utils.DownloadUtils.findFileInMediaStore
import mozilla.components.support.utils.DownloadUtils.isDefaultDownloadDirectory
import mozilla.components.support.utils.DownloadUtils.sanitizeMimeType
import mozilla.components.support.utils.DownloadUtils.truncateFileName
import java.io.File

/**
 * The default implementation of [DownloadFileUtils].
 *
 * @param context The application context.
 * @param downloadLocation A lambda providing the current directory path for downloads.
 */
class DefaultDownloadFileUtils(
    private val context: Context,
    private val downloadLocation: () -> String,
) : DownloadFileUtils {
    private val logger = Logger("DefaultDownloadFileUtils")

    /**
     * Keep aligned with desktop generic content types:
     * https://searchfox.org/mozilla-central/source/browser/components/downloads/DownloadsCommon.jsm#208
     */
    private val genericContentTypes = arrayOf(
        "application/octet-stream",
        "binary/octet-stream",
        "application/unknown",
    )

    companion object {
        private const val SCHEME_CONTENT = "content://"
    }

    override fun guessFileName(
        contentDisposition: String?,
        url: String?,
        mimeType: String?,
    ): String {
        // Split fileName between base and extension
        // Add an extension if filename does not have one
        val extractedFileName = extractFileNameFromUrl(contentDisposition, url)
        val sanitizedMimeType = sanitizeMimeType(mimeType)

        val fileName = if (extractedFileName.contains('.')) {
            if (genericContentTypes.contains(sanitizedMimeType)) {
                extractedFileName
            } else {
                changeExtension(extractedFileName, sanitizedMimeType)
            }
        } else {
            extractedFileName + createExtension(sanitizedMimeType)
        }
        return uniqueFileName(
            directoryPath = downloadLocation(),
            fileName = fileName,
        )
    }

    override fun findDownloadFileUri(fileName: String?, directoryPath: String): Uri? {
        if (fileName == null) return null

        return try {
            if (directoryPath.isDefaultDownloadDirectory()) {
                context.contentResolver.findFileInMediaStore(
                    collection = downloadsCollectionUri,
                    fileName = fileName,
                )
            } else {
                findFileInSafDirectory(directoryPath, fileName)
            }
        } catch (e: SecurityException) {
            logger.error("Security error finding download file URI for '$fileName': ${e.message}")
            null
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid argument finding download file URI for '$fileName': ${e.message}")
            null
        } catch (e: IllegalStateException) {
            logger.error("State error finding download file URI for '$fileName': ${e.message}")
            null
        }
    }

    override fun fileExists(directoryPath: String, fileName: String?): Boolean {
        return findDownloadFileUri(fileName, directoryPath) != null
    }

    override fun uniqueFileName(
        directoryPath: String,
        fileName: String,
    ): String {
        val file = File(fileName)
        val (baseFileName, fileExtension) = truncateFileName(
            baseFileName = file.nameWithoutExtension,
            fileExtension = file.extension,
            path = directoryPath,
        )

        var currentFileName = createFileName(baseFileName, fileExtension)
        var copyVersionNumber = 1

        while (fileExists(directoryPath, currentFileName)) {
            currentFileName = createFileName(baseFileName, copyVersionNumber++, fileExtension)
        }

        return currentFileName
    }

    /**
     * The appropriate content URI for the downloads collection, based on the Android SDK version.
     */
    private val downloadsCollectionUri: Uri
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Files.getContentUri("external")
        }

    /**
     * Finds a file within a directory tree selected via the Storage Access Framework (SAF).
     *
     * @param context The application context.
     * @param directoryPath The 'content://' URI string of the directory tree.
     * @param fileName The name of the file to find.
     * @return The content Uri of the found file, or `null` if not found or an error occurs.
     */
    private fun findFileInSafDirectory(
        directoryPath: String,
        fileName: String,
    ): Uri? {
        check(directoryPath.startsWith(SCHEME_CONTENT)) { "directoryPath must be a content URI" }

        return try {
            val directoryTreeUri = directoryPath.toUri()
            val directory = DocumentFile.fromTreeUri(context, directoryTreeUri)

            directory?.findFile(fileName)?.uri
        } catch (e: SecurityException) {
            logger.error("Security error finding file in SAF directory: ${e.message}")
            null
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid URI for SAF directory: ${e.message}")
            null
        }
    }

    private fun createFileName(fileName: String, fileExtension: String): String {
        return if (fileExtension.isNotEmpty()) "$fileName.$fileExtension" else fileName
    }

    private fun createFileName(baseFileName: String, copyVersionNumber: Int, fileExtension: String): String {
        val newName = "$baseFileName($copyVersionNumber)"
        return if (fileExtension.isNotEmpty()) "$newName.$fileExtension" else newName
    }
}
