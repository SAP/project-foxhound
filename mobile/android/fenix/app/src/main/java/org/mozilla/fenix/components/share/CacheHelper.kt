/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.share

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream

/**
 * Helper class for caching bitmaps in the app's cache directory and retrieving their content URIs.
 */
class CacheHelper {

    /**
     * Save the given bitmap to the app's cache directory and return its content URI.
     *
     * @param context The context used to access the cache directory.
     * @param bitmap The bitmap to save.
     * @param name The filename (without extension) to use for the cached file.
     * @return The content URI of the saved bitmap, or null if the bitmap is null.
     */
    fun saveBitmapToCache(context: Context, bitmap: Bitmap?, name: String): Uri? {
        if (bitmap == null) return null
        val file = File(context.cacheDir, "$name.png")
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, PNG_QUALITY, it) }
        return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    }

    companion object {
        private const val PNG_QUALITY = 100
    }
}
