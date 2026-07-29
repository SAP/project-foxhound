/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.thumbnails.utils

import android.content.Context
import android.graphics.Bitmap
import androidx.annotation.VisibleForTesting
import mozilla.components.concept.base.images.ImageLoadRequest
import mozilla.components.concept.base.images.ImageSaveRequest
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.utils.cache.CacheDirectoryMigration
import mozilla.components.support.utils.cache.DiskLruCacheStore
import java.io.File

private const val MAXIMUM_CACHE_THUMBNAIL_DATA_BYTES: Long = 1024L * 1024L * 100L // 100 MB
private const val THUMBNAIL_DISK_CACHE_VERSION = 1
private const val ENCODING_QUALITY = 90
private const val BASE_DIR_NAME = "thumbnails"
private const val THUMBNAILS_DIR_NAME = "mozac_browser_thumbnails"

/**
 * Caching thumbnail bitmaps on disk.
 *
 * @property isPrivate whether this cache is intended for private browsing thumbnails
 */
class ThumbnailDiskCache(private val isPrivate: Boolean = false) {
    private val logger = Logger("ThumbnailDiskCache")

    @VisibleForTesting
    internal val thumbnailStore = DiskLruCacheStore(
        logger = logger,
        version = THUMBNAIL_DISK_CACHE_VERSION,
        maxSizeBytes = MAXIMUM_CACHE_THUMBNAIL_DATA_BYTES,
        directoryProvider = ::getThumbnailCacheDirectory,
        migration = CacheDirectoryMigration(
            logger = logger,
            legacyDirectory = { File(it.cacheDir, THUMBNAILS_DIR_NAME) },
            newDirectory = { File(it.noBackupFilesDir, THUMBNAILS_DIR_NAME) },
        ),
    )

    internal fun clear(context: Context) = thumbnailStore.clear(context)

    /**
     * Retrieves the thumbnail data from the disk cache for the given session ID or URL.
     *
     * @param context the application [Context].
     * @param request [ImageLoadRequest] providing the session ID or URL of the thumbnail to retrieve.
     * @return the [ByteArray] of the thumbnail or null if the snapshot of the entry does not exist.
     */
    internal fun getThumbnailData(context: Context, request: ImageLoadRequest): ByteArray? {
        return thumbnailStore.readBytes(context, request.id)
    }

    /**
     * Stores the given session ID or URL's thumbnail [Bitmap] into the disk cache.
     *
     * @param context the application [Context].
     * @param request [ImageSaveRequest] providing the session ID or URL of the thumbnail to retrieve.
     * @param bitmap the thumbnail [Bitmap] to store.
     */
    internal fun putThumbnailBitmap(context: Context, request: ImageSaveRequest, bitmap: Bitmap) {
        thumbnailStore.write(context, request.id) { stream ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, ENCODING_QUALITY, stream)
        }
    }

    /**
     * Removes the given session ID or URL's thumbnail [Bitmap] from the disk cache.
     *
     * @param context the application [Context].
     * @param sessionIdOrUrl the session ID or URL.
     */
    internal fun removeThumbnailData(context: Context, sessionIdOrUrl: String) {
        thumbnailStore.remove(context, sessionIdOrUrl)
    }

    private fun getThumbnailCacheDirectory(context: Context): File {
        val dirName = if (isPrivate) "private_$BASE_DIR_NAME" else BASE_DIR_NAME
        val cacheDirectory = File(context.noBackupFilesDir, THUMBNAILS_DIR_NAME)
        return File(cacheDirectory, dirName)
    }
}
