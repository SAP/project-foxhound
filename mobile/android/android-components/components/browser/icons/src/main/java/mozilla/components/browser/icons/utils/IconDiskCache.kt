/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.utils

import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import androidx.annotation.VisibleForTesting
import mozilla.components.browser.icons.Icon
import mozilla.components.browser.icons.IconRequest
import mozilla.components.browser.icons.extension.toIconResources
import mozilla.components.browser.icons.extension.toJSON
import mozilla.components.browser.icons.loader.DiskIconLoader
import mozilla.components.browser.icons.preparer.DiskIconPreparer
import mozilla.components.browser.icons.processor.DiskIconProcessor
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.ktx.kotlin.sha1
import mozilla.components.support.utils.cache.CacheDirectoryMigration
import mozilla.components.support.utils.cache.DiskLruCacheStore
import org.json.JSONArray
import org.json.JSONException
import java.io.File

private const val RESOURCES_DISK_CACHE_VERSION = 1
private const val ICON_DATA_DISK_CACHE_VERSION = 1

private const val MAXIMUM_CACHE_RESOURCES_BYTES: Long = 1024L * 1024L * 10L // 10 MB
private const val MAXIMUM_CACHE_ICON_DATA_BYTES: Long = 1024L * 1024L * 100L // 100 MB

private const val WEBP_QUALITY = 90

private const val BROWSER_ICONS_DIR_NAME = "mozac_browser_icons"
private const val ICONS_DIR_NAME = "icons"
private const val RESOURCES_DIR_NAME = "resources"

/**
 * Caching bitmaps and resource URLs on disk.
 */
class IconDiskCache :
    DiskIconLoader.LoaderDiskCache,
    DiskIconPreparer.PreparerDiskCache,
    DiskIconProcessor.ProcessorDiskCache {
    private val logger = Logger("IconDiskCache")
    private val migration = CacheDirectoryMigration(
        logger = logger,
        legacyDirectory = { getParentCacheDirectory(it.cacheDir) },
        newDirectory = { getParentCacheDirectory(it.noBackupFilesDir) },
    )

    @VisibleForTesting
    internal val iconResourcesStore = DiskLruCacheStore(
        logger = logger,
        version = RESOURCES_DISK_CACHE_VERSION,
        maxSizeBytes = MAXIMUM_CACHE_RESOURCES_BYTES,
        directoryProvider = { context -> getCacheDirectory(context, RESOURCES_DIR_NAME) },
        migration = migration,
    )

    @VisibleForTesting
    internal val iconDataStore = DiskLruCacheStore(
        logger = logger,
        version = ICON_DATA_DISK_CACHE_VERSION,
        maxSizeBytes = MAXIMUM_CACHE_ICON_DATA_BYTES,
        directoryProvider = { context -> getCacheDirectory(context, ICONS_DIR_NAME) },
        migration,
    )

    override fun getResources(context: Context, request: IconRequest): List<IconRequest.Resource> {
        val key = createKey(request.url)
        val data = iconResourcesStore.readString(context, key) ?: return emptyList()

        try {
            return JSONArray(data).toIconResources()
        } catch (e: JSONException) {
            logger.warn("Failed to parse resources from disk", e)
        }

        return emptyList()
    }

    override fun putResources(context: Context, request: IconRequest) {
        try {
            iconResourcesStore.writeString(
                context = context,
                key = createKey(request.url),
                value = request.resources.toJSON().toString(),
            )
        } catch (_: JSONException) {
            logger.warn("Failed to serialize resources")
        }
    }

    override fun putIcon(context: Context, resource: IconRequest.Resource, icon: Icon) {
        putIconBitmap(context, resource, icon.bitmap)
    }

    override fun getIconData(context: Context, resource: IconRequest.Resource): ByteArray? {
        return iconDataStore.readBytes(context, createKey(resource.url))
    }

    internal fun putIconBitmap(context: Context, resource: IconRequest.Resource, bitmap: Bitmap) {
        val compressFormat = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Bitmap.CompressFormat.WEBP_LOSSY
        } else {
            @Suppress("DEPRECATION")
            Bitmap.CompressFormat.WEBP
        }
        iconDataStore.write(context, createKey(resource.url)) { stream ->
            bitmap.compress(compressFormat, WEBP_QUALITY, stream)
        }
    }

    internal fun clear(context: Context) {
        iconResourcesStore.clear(context)
        iconDataStore.clear(context)
    }

    private fun getCacheDirectory(context: Context, subdirectoryName: String): File =
        File(getParentCacheDirectory(context.noBackupFilesDir), subdirectoryName)

    private fun getParentCacheDirectory(parent: File) =
        File(parent, BROWSER_ICONS_DIR_NAME)
}

private fun createKey(rawKey: String): String = rawKey.sha1()
