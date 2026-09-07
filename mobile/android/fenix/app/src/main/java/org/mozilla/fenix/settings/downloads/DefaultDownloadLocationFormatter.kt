/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.content.ContentResolver
import android.net.Uri
import androidx.core.net.toUri
import java.io.File
import java.net.URLDecoder

private const val EXTERNAL_STORAGE_PROVIDER_AUTHORITY = "com.android.externalstorage.documents"
private const val PRIMARY_VOLUME_ID = "primary"
private const val DELIMITER = ":"

/**
 * The default implementation of [DownloadLocationFormatter].
 *
 * This class transforms technical file identifiers into user-friendly strings for the UI.
 * It handles several storage scenarios:
 *
 * 1. **Standard File Paths**: Formats local paths (e.g., `/storage/emulated/0/Download`)
 *    using the `~` shorthand (e.g., `~/Download`).
 *
 * 2. **External Storage (SAF)**: Resolves Storage Access Framework URIs for local
 *    storage and SD cards into clean, readable paths.
 *
 * 3. **Cloud Providers (Nextcloud, Drive, etc.)**:
 *    - Attempts to extract the specific folder name selected by the user.
 *    - Detects cases where providers return generic identifiers like "/" or "1".
 *    - Falls back to a branded provider name (e.g., `~/Nextcloud`) when a specific
 *      folder name is unavailable or non-descriptive.
 *
 * @param fileUtils A utility wrapper for interacting with Android's file system and
 * content provider APIs.
 */
class DefaultDownloadLocationFormatter(
    private val fileUtils: AndroidFileUtils,
) : DownloadLocationFormatter {
    override fun getFriendlyPath(uriString: String): String {
        val uri = uriString.toUri()

        return when (uri.scheme) {
            null, ContentResolver.SCHEME_FILE -> formatFilePath(uri)
            ContentResolver.SCHEME_CONTENT -> formatContentUri(uri)
            else -> uriString
        }
    }

    private fun formatContentUri(uri: Uri): String {
        if (!fileUtils.hasUriPermission(uri)) {
            throw MissingUriPermission("Missing permissions for URI: $uri")
        }

        if (uri.authority == EXTERNAL_STORAGE_PROVIDER_AUTHORITY && fileUtils.isTreeUri(uri)) {
            return formatExternalStorageTreeUri(uri)
        }

        val displayName = fileUtils.getTreeUriName(uri)

        val descriptiveName = displayName?.takeIf {
            it.isNotBlank() && it != "/" && !it.all { char -> char.isDigit() }
        }

        val providerName = getProviderName(uri)

        val finalName = if (providerName.isNullOrBlank()) {
            descriptiveName ?: ""
        } else {
            descriptiveName?.let { "$providerName/$it" } ?: providerName
        }

        return if (finalName.isBlank()) "/" else "/$finalName"
    }

    private fun getProviderName(uri: Uri): String? {
        return when (uri.authority) {
            "org.nextcloud.documents" -> "Nextcloud"
            "com.google.android.apps.docs.storage" -> "Google Drive"
            "com.microsoft.skydrive.content.external" -> "OneDrive"
            "com.dropbox.android.dataprovider" -> "Dropbox"
            else -> uri.authority
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
        val volumeId = decodedId.substringBefore(DELIMITER, "")
        val path = decodedId.substringAfter(DELIMITER, decodedId)

        val volumeName = fileUtils.getExternalStorageVolumeName(volumeId)
        return if (volumeName.isNullOrBlank() && path.isBlank()) {
            "~/"
        } else if (volumeName.isNullOrBlank() || volumeId.equals(PRIMARY_VOLUME_ID, ignoreCase = true)) {
            "~/$path"
        } else {
            "/$volumeName/$path"
        }
    }
}
