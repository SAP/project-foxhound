/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.net.Uri
import android.os.Environment
import java.io.File

internal class FakeAndroidFileUtils(
    private val isTreeUri: (Uri) -> Boolean = { true },
    private val getTreeDocumentId: (Uri) -> String = { "getTreeDocumentId" },
    private val hasUriPermission: (Uri) -> Boolean = { true },
) : AndroidFileUtils {
    override val externalStorageDirectory: File
        get() = Environment.getExternalStorageDirectory()

    override val externalStoragePublicDownloadsDirectory: File
        get() = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)

    override fun isTreeUri(uri: Uri): Boolean {
        return isTreeUri.invoke(uri)
    }

    override fun getTreeDocumentId(uri: Uri): String {
        return getTreeDocumentId.invoke(uri)
    }

    override fun hasUriPermission(uri: Uri): Boolean {
        return hasUriPermission.invoke(uri)
    }
}
