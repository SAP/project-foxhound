/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import java.io.File

/**
 * The default implementation of [AndroidFileUtils].
 *
 * @param context The application context, used for checking URI permissions.
 */
class DefaultAndroidFileUtils(
    private val context: Context,
) : AndroidFileUtils {
    override val externalStorageDirectory: File
        get() = Environment.getExternalStorageDirectory()

    override val externalStoragePublicDownloadsDirectory: File
        get() = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)

    override fun isTreeUri(uri: Uri): Boolean = DocumentsContract.isTreeUri(uri)

    override fun getTreeDocumentId(uri: Uri): String? = DocumentsContract.getTreeDocumentId(uri)

    override fun hasUriPermission(uri: Uri): Boolean {
        val persistedPermissions = context.contentResolver.persistedUriPermissions
        return persistedPermissions.any { it.uri == uri && it.isReadPermission && it.isWritePermission }
    }
}
