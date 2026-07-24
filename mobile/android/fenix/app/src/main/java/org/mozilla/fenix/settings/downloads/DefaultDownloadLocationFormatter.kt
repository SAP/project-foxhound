/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.content.ContentResolver
import android.net.Uri
import androidx.core.net.toUri
import mozilla.components.support.base.log.logger.Logger
import java.io.File
import java.net.URLDecoder

private const val EXTERNAL_STORAGE_PROVIDER_AUTHORITY = "com.android.externalstorage.documents"

/**
 * The default implementation of [DownloadLocationFormatter].
 *
 * It handles various formats, including:
 * - Standard file paths (`/storage/emulated/0/...`)
 * - File URIs (`file://...`)
 * - Storage Access Framework (SAF) content URIs (`content://...`)
 *
 * @param fileUtils A utility wrapper for interacting with Android's file system APIs.
 */
class DefaultDownloadLocationFormatter(
    private val fileUtils: AndroidFileUtils,
) : DownloadLocationFormatter {
    private val logger = Logger("DefaultDownloadLocationFormatter")

    override fun getFriendlyPath(uriString: String): String {
        val uri = uriString.toUri()

        return when (uri.scheme) {
            null, ContentResolver.SCHEME_FILE -> formatFilePath(uri)
            ContentResolver.SCHEME_CONTENT -> formatContentUri(uri)
            else -> uriString
        }
    }

    @Suppress("TooGenericExceptionCaught")
    private fun formatContentUri(uri: Uri): String {
        if (!fileUtils.hasUriPermission(uri)) {
            throw MissingUriPermission("Missing permissions for URI: $uri")
        }

        return try {
            if (fileUtils.isTreeUri(uri) && uri.authority == EXTERNAL_STORAGE_PROVIDER_AUTHORITY) {
                formatExternalStorageTreeUri(uri)
            } else {
                uri.lastPathSegment?.let { lastSegment -> "~/$lastSegment" } ?: uri.toString()
            }
        } catch (e: Exception) {
            logger.warn("Failed to format content URI, falling back to raw string.", e)
            uri.toString()
        }
    }

    private fun formatFilePath(uri: Uri): String {
        val basePath = fileUtils.externalStorageDirectory.path
        val filePath = uri.path ?: return uri.toString()

        return if (filePath.startsWith(basePath)) {
            "~${filePath.substring(basePath.length)}"
        } else {
            "~/${File(filePath).name}"
        }
    }

    private fun formatExternalStorageTreeUri(uri: Uri): String {
        val documentId = fileUtils.getTreeDocumentId(uri) ?: return uri.toString()
        val decodedId = URLDecoder.decode(documentId, "UTF-8")
        val path = decodedId.substringAfter("primary:", decodedId)
        val finalPath = path.removePrefix("Download/")
        return "~/$finalPath"
    }
}
