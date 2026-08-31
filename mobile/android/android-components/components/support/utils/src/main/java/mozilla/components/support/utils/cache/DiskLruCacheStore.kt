/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.cache

import android.content.Context
import androidx.annotation.VisibleForTesting
import com.jakewharton.disklrucache.DiskLruCache
import mozilla.components.support.base.log.logger.Logger
import java.io.File
import java.io.IOException
import java.io.OutputStream

/**
 * Shared disk cache utility for Android Components features backed by [DiskLruCache].
 *
 * The store creates the cache lazily in the provided [directoryProvider] and offers
 * helpers to read, write, remove, and clear cached entries.
 *
 * @param logger logger used for cache warnings and recoverable I/O failures.
 * @param version cache version passed to [DiskLruCache.open].
 * @param maxSizeBytes maximum size of the cache in bytes.
 * @param directoryProvider resolves the cache directory for the given [Context].
 * @param migration handles cache directories migration if necessary
 */
class DiskLruCacheStore(
    private val logger: Logger,
    private val version: Int,
    private val maxSizeBytes: Long,
    private val directoryProvider: (Context) -> File,
    private val migration: CacheDirectoryMigration? = null,
) {
    @Volatile
    @VisibleForTesting
    internal var cache: DiskLruCache? = null

    private val cacheLock = Any()

    /**
     * Clears the cache.
     *
     * @param context application [Context] used to resolve the cache directory.
     */
    fun clear(context: Context) {
        synchronized(cacheLock) {
            try {
                getCache(context)?.delete()
            } catch (_: IOException) {
                logger.warn("Cache could not be cleared. Perhaps there are none?")
            }

            cache = null
        }
    }

    /**
     * Reads binary data from the cache for the given key.
     *
     * @param context application [Context] used to resolve the cache directory.
     * @param key cache entry key.
     * @return the cached bytes, or null if the entry is missing or unreadable.
     */
    fun readBytes(context: Context, key: String): ByteArray? {
        val snapshot = getCache(context)?.get(key) ?: return null

        return try {
            snapshot.getInputStream(0).use {
                it.buffered().readBytes()
            }
        } catch (e: IOException) {
            logger.info("Failed to read data from disk", e)
            null
        }
    }

    /**
     * Reads text from the cache for the given key.
     *
     * @param context application [Context] used to resolve the cache directory.
     * @param key cache entry key.
     * @return the cached string, or null if the entry is missing or unreadable.
     */
    fun readString(context: Context, key: String): String? {
        val snapshot = getCache(context)?.get(key) ?: return null

        return try {
            snapshot.getInputStream(0).use {
                it.buffered().reader().readText()
            }
        } catch (e: IOException) {
            logger.info("Failed to load resources from disk", e)
            null
        }
    }

    /**
     * Writes binary data into the cache for the given key.
     *
     * @param context application [Context] used to resolve the cache directory.
     * @param key cache entry key.
     * @param writer writes the entry contents to the provided stream.
     * @return true if the value was committed successfully, false otherwise.
     */
    fun write(context: Context, key: String, writer: (OutputStream) -> Unit): Boolean {
        return try {
            synchronized(cacheLock) {
                val editor = getCache(context)?.edit(key) ?: return false

                editor.newOutputStream(0).use(writer)
                editor.commit()
                true
            }
        } catch (e: IOException) {
            logger.info("Failed to save data to disk", e)
            false
        }
    }

    /**
     * Writes text data into the cache for the given key.
     *
     * @param context application [Context] used to resolve the cache directory.
     * @param key cache entry key.
     * @param value the string to write into the cache.
     * @return true if the value was committed successfully, false otherwise.
     */
    fun writeString(context: Context, key: String, value: String): Boolean {
        return try {
            synchronized(cacheLock) {
                val editor = getCache(context)?.edit(key) ?: return false

                editor.set(0, value)
                editor.commit()
                true
            }
        } catch (e: IOException) {
            logger.info("Failed to save resources to disk", e)
            false
        }
    }

    /**
     * Removes the value from the cache for the given key.
     *
     * @param context application [Context] used to resolve the cache directory.
     * @param key cache entry key.
     * @return true if the entry was removed successfully, false otherwise.
     */
    fun remove(context: Context, key: String): Boolean {
        return try {
            synchronized(cacheLock) {
                getCache(context)?.remove(key) ?: false
            }
        } catch (e: IOException) {
            logger.info("Failed to remove data from disk", e)
            false
        }
    }

    private fun getCache(context: Context): DiskLruCache? =
        synchronized(cacheLock) {
            cache?.let { return it }

            migration?.migrateIfNeeded(context)

            return try {
                DiskLruCache.open(
                    directoryProvider(context),
                    version,
                    1,
                    maxSizeBytes,
                ).also { cache = it }
            } catch (e: IOException) {
                logger.warn("Cache could not be created.", e)
                null
            }
        }
}
