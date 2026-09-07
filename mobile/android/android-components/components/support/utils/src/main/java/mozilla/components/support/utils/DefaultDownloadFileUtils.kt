/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import androidx.annotation.VisibleForTesting
import androidx.core.content.FileProvider
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
import java.io.FileNotFoundException

/**
 * The default implementation of [DownloadFileUtils].
 *
 * @param context The application context.
 * @param downloadLocation A lambda providing the current directory path for downloads.
 */
class DefaultDownloadFileUtils(
    private val context: Context,
    private val downloadLocation: () -> String = {
        Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS,
        ).path
    },
) : DownloadFileUtils {
    private val logger = Logger("DefaultDownloadFileUtils")

    /**
     * Keep aligned with desktop generic content types:
     * https://searchfox.org/firefox-main/source/browser/components/downloads/DownloadsCommon.jsm#208
     */
    private val genericContentTypes = arrayOf(
        "application/octet-stream",
        "binary/octet-stream",
        "application/unknown",
    )

    companion object {
        private const val SCHEME_CONTENT = "content://"
        private const val SCHEME_FILE = "file"
        private const val FILE_PROVIDER_EXTENSION = ".feature.downloads.fileprovider"
    }
    override val currentDownloadLocation: String
        get() = downloadLocation()

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

    override fun openFile(
        fileName: String?,
        directoryPath: String,
        contentType: String?,
    ): Boolean {
        val newIntent = createOpenFileIntent(
            fileName = fileName,
            directoryPath = directoryPath,
            downloadContentType = contentType,
        )

        return try {
            context.startActivity(newIntent)
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    override fun createOpenFileIntent(
        fileName: String?,
        directoryPath: String,
        downloadContentType: String?,
    ): Intent {
        val shareableUri = findShareableDownloadFileUri(fileName, directoryPath)

        return if (shareableUri != null) {
            Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(
                    shareableUri,
                    getSafeContentType(fileName, downloadContentType, shareableUri),
                )
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
        } else {
            // Fallback to opening the downloads manager if the file URI could not be determined.
            Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        }
    }

    override fun findDownloadFileUri(fileName: String?, directoryPath: String): Uri? {
        if (fileName == null) return null

        return try {
            if (directoryPath.isDefaultDownloadDirectory()) {
                findInDefaultDownloadDirectory(fileName, directoryPath)
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

    override fun findShareableDownloadFileUri(fileName: String?, directoryPath: String): Uri? {
        val initialUri = findDownloadFileUri(
            fileName = fileName,
            directoryPath = directoryPath,
        ) ?: return null

        return if (initialUri.scheme == SCHEME_FILE) {
            getFilePathUri(initialUri.path ?: "")
        } else {
            getShareableUriForTree(initialUri, fileName)
        }
    }

    @VisibleForTesting
    override fun getSafeContentType(
        fileName: String?,
        contentType: String?,
        uri: Uri?,
    ): String {
        // 1. If a URI is provided, try the most reliable method: ContentResolver.
        uri?.let {
            val resolverType = context.contentResolver.getType(uri)
            if (resolverType != null && resolverType != "application/octet-stream") {
                return sanitizeMimeType(resolverType)?.takeIf { it.isNotEmpty() } ?: "*/*"
            }
        }

        // 2. If the resolver fails or no URI was given, try to infer from the file extension.
        val mimeTypeFromExtension = fileName?.let {
            MimeTypeMap.getFileExtensionFromUrl(it)?.let { extension ->
                MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.lowercase())
            }
        }

        // 3. Use the inferred MIME type, or fall back to the originally provided content type.
        val resultContentType = mimeTypeFromExtension ?: contentType

        return resultContentType?.let { sanitizeMimeType(it) } ?: "*/*"
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

    override fun deleteMediaFile(
        contentResolver: ContentResolver,
        fileName: String?,
        directoryPath: String,
    ): Boolean {
        val fileUri = findDownloadFileUri(fileName, directoryPath) ?: return false

        return try {
            if (DocumentsContract.isDocumentUri(context, fileUri)) {
                deleteSafDocument(contentResolver, fileUri)
            } else if (directoryPath.isDefaultDownloadDirectory() && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                deleteLegacyFile(directoryPath, fileName)
            } else {
                deleteMediaStoreEntry(contentResolver, fileUri)
            }
        } catch (e: SecurityException) {
            logger.debug("SecurityException: ${e.message}")
            false
        } catch (e: FileNotFoundException) {
            logger.debug("File not found for deletion: ${e.message}")
            false
        } catch (e: IllegalArgumentException) {
            logger.debug("Invalid URI for deletion: ${e.message}")
            false
        }
    }

    @VisibleForTesting
    internal fun getFilePathUri(filePath: String): Uri =
        FileProvider.getUriForFile(
            context,
            context.packageName + FILE_PROVIDER_EXTENSION,
            File(filePath),
        )

    override fun renameFile(
        directoryPath: String,
        oldName: String?,
        newName: String,
    ): Boolean {
        if (oldName == null) return false
        return try {
            if (directoryPath.startsWith(SCHEME_CONTENT)) {
                renameSafFile(directoryPath, oldName, newName)
            } else {
                renameLegacyFile(directoryPath, oldName, newName)
            }
        } catch (e: SecurityException) {
            logger.error("Security error renaming file: ${e.message}")
            false
        } catch (e: IllegalArgumentException) {
            logger.error("Invalid arguments for renaming file: ${e.message}")
            false
        } catch (e: IllegalStateException) {
            logger.error("State error renaming file: ${e.message}")
            false
        }
    }

    private fun renameSafFile(directoryPath: String, oldName: String, newName: String): Boolean {
        val directoryUri = directoryPath.toUri()
        val directory = DocumentFile.fromTreeUri(context, directoryUri)

        return when {
            directory == null || !directory.canWrite() -> {
                logger.error("Cannot write to SAF directory: $directoryPath")
                false
            }
            else -> performSafRename(directory, oldName, newName)
        }
    }

    private fun performSafRename(directory: DocumentFile, oldName: String, newName: String): Boolean {
        val fileToRename = directory.findFile(oldName)

        return if (fileToRename == null) {
            handleMissingFile(directory, oldName, newName)
        } else {
            val success = fileToRename.renameTo(newName)
            verifyRenameOutcome(success, directory, oldName, newName)
        }
    }

    private fun handleMissingFile(directory: DocumentFile, oldName: String, newName: String): Boolean {
        val alreadyExists = directory.findFile(newName) != null
        if (alreadyExists) {
            logger.debug("Rename unnecessary: '$newName' already exists.")
        } else {
            logger.error("Could not find file '$oldName' in SAF directory")
        }
        return alreadyExists
    }

    private fun verifyRenameOutcome(
        success: Boolean,
        directory: DocumentFile,
        oldName: String,
        newName: String,
    ): Boolean {
        val verifiedSuccess = success || directory.findFile(newName) != null

        if (!verifiedSuccess) {
            logger.error("SAF renameTo failed for $oldName -> $newName")
        } else if (!success) {
            logger.debug("SAF renameTo reported failure, but verified success for '$newName'")
        }

        return verifiedSuccess
    }

    private fun renameLegacyFile(directoryPath: String, oldName: String, newName: String): Boolean {
        val from = File(directoryPath, oldName)
        val to = File(directoryPath, newName)

        val renamed = from.exists() && from.renameTo(to)
        if (renamed) {
            MediaScannerConnection.scanFile(
                context,
                arrayOf(from.absolutePath, to.absolutePath),
                null,
                null,
            )
        }
        return renamed
    }

    private fun deleteSafDocument(contentResolver: ContentResolver, uri: Uri): Boolean {
        logger.debug("Deleting using DocumentsContract (SAF): $uri")
        return DocumentsContract.deleteDocument(contentResolver, uri)
    }

    private fun deleteLegacyFile(directoryPath: String, fileName: String?): Boolean {
        if (fileName == null) return false
        val file = File(directoryPath, fileName)
        logger.debug("Deleting using File API (Legacy): ${file.absolutePath}")

        return if (file.exists() && file.delete()) {
            // The file is gone from disk, but the MediaStore still thinks it exists.
            // This line tells MediaStore to "re-scan" the path and realize it's gone.
            MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), null, null)
            true
        } else {
            false
        }
    }

    private fun deleteMediaStoreEntry(contentResolver: ContentResolver, uri: Uri): Boolean {
        logger.debug("Deleting using ContentResolver (MediaStore): $uri")
        return contentResolver.delete(uri, null, null) > 0
    }

    @VisibleForTesting
    internal fun findInDefaultDownloadDirectory(fileName: String, directoryPath: String): Uri? {
        val mediaStoreUri = context.contentResolver.findFileInMediaStore(
            collection = downloadsCollectionUri,
            fileName = fileName,
        )

        if (mediaStoreUri == null) {
            val file = File(directoryPath, fileName)
            if (file.exists()) {
                return Uri.fromFile(file)
            }
        }

        return mediaStoreUri
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
     * Converts a "tree" URI into a standard, shareable document URI if possible.
     *
     * An ACTION_VIEW Intent cannot directly open a tree URI. This function finds the specific
     * file within the tree and returns its direct document URI.
     *
     * @param treeUri The URI that might be a tree URI.
     * @param fileName The name of the file to find within the tree.
     * @return The direct document URI if found, otherwise the original URI.
     */
    private fun getShareableUriForTree(treeUri: Uri, fileName: String?): Uri {
        if (DocumentsContract.isTreeUri(treeUri)) {
            val directory = DocumentFile.fromTreeUri(context, treeUri)
            val fileInTree = directory?.findFile(fileName ?: "")
            return fileInTree?.uri ?: treeUri
        }
        return treeUri
    }

    /**
     * Finds a file within a directory tree selected via the Storage Access Framework (SAF).
     *
     * @param context The application context.
     * @param directoryPath The 'content://' URI string of the directory tree.
     * @param fileName The name of the file to find.
     * @return The content Uri of the found file, or `null` if not found or an error occurs.
     */
    @VisibleForTesting
    internal fun findFileInSafDirectory(
        directoryPath: String,
        fileName: String,
    ): Uri? {
        check(directoryPath.startsWith(SCHEME_CONTENT)) { "directoryPath must be a content URI" }

        return try {
            val directoryTreeUri = directoryPath.toUri()
            val directory = DocumentFile.fromTreeUri(context, directoryTreeUri)

            val file = directory?.listFiles()?.find { it.name?.equals(fileName, ignoreCase = true) == true }

            file?.uri
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
