/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads.filewriter

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract
import android.provider.MediaStore
import androidx.annotation.VisibleForTesting
import androidx.core.net.toUri
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.utils.DownloadFileUtils
import mozilla.components.support.utils.DownloadUtils
import mozilla.components.support.utils.DownloadUtils.findFileInMediaStore
import mozilla.components.support.utils.DownloadUtils.isDefaultDownloadDirectory
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.IOException
import java.io.OutputStream

/**
 * A [DownloadFileWriter] implementation that handles writing download data to a file.
 *
 * @param context The application context, used to access the [ContentResolver] and file system.
 * @param downloadFileUtils A utility class for file-related operations, like creating unique filenames.
 */
class DefaultDownloadFileWriter(
    private val context: Context,
    private val downloadFileUtils: DownloadFileUtils,
) : DownloadFileWriter {
    private val logger = Logger("DownloadFileWriter")

    override fun useFileStream(
        download: DownloadState,
        append: Boolean,
        shouldUseScopedStorage: Boolean,
        onUpdateState: (DownloadState) -> Unit,
        block: (OutputStream) -> Unit,
    ) {
        val downloadWithUniqueFileName = makeUniqueFileNameIfNecessary(download, append)

        onUpdateState.invoke(downloadWithUniqueFileName)

        val isUri = downloadWithUniqueFileName.directoryPath.startsWith(DownloadUtils.SCHEME_CONTENT)

        if (shouldUseScopedStorage || isUri) {
            useFileStreamScopedStorage(downloadWithUniqueFileName, append, block, onUpdateState)
        } else {
            useFileStreamLegacy(downloadWithUniqueFileName, append, block)
        }
    }

    /**
     * Returns an updated [DownloadState] with a unique fileName if the file is not being appended.
     */
    @VisibleForTesting
    internal fun makeUniqueFileNameIfNecessary(
        download: DownloadState,
        append: Boolean,
    ): DownloadState {
        val fileName = download.fileName
        if (append || fileName == null) {
            return download
        }

        val directoryPath = download.directoryPath

        val uniqueFileName = downloadFileUtils.uniqueFileName(
            directoryPath = directoryPath,
            fileName = fileName,
        )

        return if (uniqueFileName != fileName) {
            download.copy(fileName = uniqueFileName)
        } else {
            download
        }
    }

    @VisibleForTesting
    internal fun useFileStreamScopedStorage(
        download: DownloadState,
        append: Boolean,
        block: (OutputStream) -> Unit,
        onUpdateState: (DownloadState) -> Unit,
    ) {
        val resolver = context.contentResolver
        val isDefault = download.directoryPath.isDefaultDownloadDirectory()
        val fileUri = if (isDefault) {
            // Case 1: Saving to the default "Downloads" public directory.
            // We find an existing file or create a new one using MediaStore.
            handleDownloadToDefaultDirectory(resolver, download, append)
        } else {
            // Case 2: Saving to a custom directory chosen by the user via SAF.
            // The directoryPath is expected to be a 'content://' URI string.
            handleDownloadToCustomDirectory(resolver, download, append, onUpdateState)
        } ?: throw IOException(
            "Failed to create or find a document for the download: ${download.fileName}",
        )

        writeToFileUri(resolver, fileUri, append, block)
    }

    @VisibleForTesting
    internal fun handleDownloadToDefaultDirectory(
        resolver: ContentResolver,
        download: DownloadState,
        append: Boolean,
    ): Uri? {
        val fileName = download.fileName ?: return null
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
        } else {
            MediaStore.Files.getContentUri("external")
        }

        if (append) {
            val existingUri =
                resolver.findFileInMediaStore(collection = collection, fileName = fileName)
            if (existingUri != null) {
                return existingUri
            }
        }

        val newFileDetails = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, fileName)
            put(MediaStore.Downloads.IS_PENDING, 1)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(
                    MediaStore.MediaColumns.MIME_TYPE,
                    downloadFileUtils.getSafeContentType(fileName, download.contentType),
                )
            }
        }
        return resolver.insert(collection, newFileDetails)
    }

    /**
     * Handles file creation in a custom directory using the Storage Access Framework (SAF).
     */
    @VisibleForTesting
    internal fun handleDownloadToCustomDirectory(
        resolver: ContentResolver,
        download: DownloadState,
        append: Boolean,
        onUpdateState: (DownloadState) -> Unit,
    ): Uri? {
        val directoryTreeUri = try {
            download.directoryPath.toUri()
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException(
                "Invalid directory path URI: ${download.directoryPath}",
                e,
            )
        }

        verifySafPermission(resolver, directoryTreeUri)

        val existingFileUri = downloadFileUtils.findDownloadFileUri(
            fileName = download.fileName,
            directoryPath = download.directoryPath,
        )

        return existingFileUri ?: createNewDocument(
            resolver,
            directoryTreeUri,
            download,
            append,
            onUpdateState,
        )
    }

    /**
     * Verifies that the app has retained write permissions for the given SAF directory URI.
     */
    @VisibleForTesting
    internal fun verifySafPermission(resolver: ContentResolver, directoryUri: Uri) {
        val persistedPermissions = resolver.persistedUriPermissions
        val hasPermission = persistedPermissions.any {
            it.uri == directoryUri && it.isReadPermission && it.isWritePermission
        }
        if (!hasPermission) {
            throw IOException("Permission to access download directory was lost: $directoryUri")
        }
    }

    /**
     * Creates a new document in the specified SAF directory.
     * If the directory is inaccessible, it falls back to the default downloads directory.
     */
    @VisibleForTesting
    internal fun createNewDocument(
        resolver: ContentResolver,
        directoryTreeUri: Uri,
        download: DownloadState,
        append: Boolean,
        onUpdateState: (DownloadState) -> Unit,
    ): Uri? {
        val fileName = download.fileName ?: return null

        val parentDocumentUri = DocumentsContract.buildDocumentUriUsingTree(
            directoryTreeUri,
            DocumentsContract.getTreeDocumentId(directoryTreeUri),
        )

        val safeContentType = downloadFileUtils.getSafeContentType(
            fileName = fileName,
            contentType = download.contentType,
        )

        return try {
            DocumentsContract.createDocument(
                resolver,
                parentDocumentUri,
                safeContentType,
                fileName,
            )
        } catch (e: FileNotFoundException) {
            logger.error("Parent directory no longer exists or is inaccessible: ${e.message}. Falling back to default.")
            handleFallbackToDefaultDirectory(resolver, download, append, onUpdateState)
        } catch (e: IllegalStateException) {
            logger.error("Document provider in invalid state: ${e.message}. Falling back to default.")
            handleFallbackToDefaultDirectory(resolver, download, append, onUpdateState)
        } catch (e: SecurityException) {
            logger.error("Permission revoked for SAF directory: ${e.message}. Falling back to default.")
            handleFallbackToDefaultDirectory(resolver, download, append, onUpdateState)
        }
    }

    /**
     * Updates the download state to use the default downloads directory and attempts the download again.
     */
    private fun handleFallbackToDefaultDirectory(
        resolver: ContentResolver,
        download: DownloadState,
        append: Boolean,
        onUpdateState: (DownloadState) -> Unit,
    ): Uri? {
        val defaultPath = Environment.getExternalStoragePublicDirectory(
            Environment.DIRECTORY_DOWNLOADS,
        ).path

        val fallbackDownload = download.copy(directoryPath = defaultPath)

        onUpdateState.invoke(fallbackDownload)

        return handleDownloadToDefaultDirectory(resolver, fallbackDownload, append)
    }

    /**
     * Opens a file descriptor for the given URI and writes data using the provided block.
     */
    @VisibleForTesting
    internal fun writeToFileUri(
        resolver: ContentResolver,
        uri: Uri,
        append: Boolean,
        block: (OutputStream) -> Unit,
    ) {
        val writingMode = if (append) "wa" else "w"
        val pfd = resolver.openFileDescriptor(uri, writingMode)
            ?: throw IOException("Failed to open file descriptor for URI: $uri")

        pfd.use { descriptor ->
            ParcelFileDescriptor.AutoCloseOutputStream(descriptor).use(block)
        }
        if (uri.authority == MediaStore.AUTHORITY) {
            markMediaStoreDownloadAsComplete(resolver, uri)
        }
    }

    /**
     * Updates a MediaStore entry to mark a download as complete by setting IS_PENDING to 0.
     */
    private fun markMediaStoreDownloadAsComplete(resolver: ContentResolver, uri: Uri) {
        val updateDetails = ContentValues().apply {
            put(MediaStore.Downloads.IS_PENDING, 0)
        }
        resolver.update(uri, updateDetails, null, null)
    }

    @VisibleForTesting
    internal fun useFileStreamLegacy(
        download: DownloadState,
        append: Boolean,
        block: (OutputStream) -> Unit,
    ) {
        val file = File(download.filePath)
        createDirectoryIfNeeded(file.parentFile)
        FileOutputStream(file, append).use(block)
        MediaScannerConnection.scanFile(
            context,
            arrayOf(file.absolutePath),
            arrayOf(download.contentType),
            null,
        )
    }

    @VisibleForTesting
    internal fun createDirectoryIfNeeded(directory: File?) {
        if (directory?.exists() == false && !directory.mkdirs()) {
            logger.error("Failed to create directory: ${directory.absolutePath}")
        }
    }
}
