/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.net.Uri
import java.io.File

/**
 * An interface for interacting with Android's file and document static helpers.
 */
interface AndroidFileUtils {
    /**
     * Returns the primary shared/external storage directory.
     */
    val externalStorageDirectory: File

    /**
     * Returns the standard public directory for storing downloaded files.
     */
    val externalStoragePublicDownloadsDirectory: File

    /**
     * Checks if the given URI represents a directory tree.
     */
    fun isTreeUri(uri: Uri): Boolean

    /**
     * Extracts the document ID from a tree URI, which represents the path of the directory.
     */
    fun getTreeDocumentId(uri: Uri): String?

    /**
     * Extracts the user-friendly display name of the directory represented by the given tree URI.
     *
     * @param uri The tree URI to query for a display name.
     * @return The display name of the directory, or null if the name cannot be resolved.
     */
    fun getTreeUriName(uri: Uri): String?

    /**
     * Checks if the application holds persisted read and write permissions for a given content URI.
     *
     * @param uri The URI to check for permissions.
     */
    fun hasUriPermission(uri: Uri): Boolean

    /**
     * Resolves a user-visible volume label for an external storage volume ID.
     */
    fun getExternalStorageVolumeName(volumeId: String): String?
}
