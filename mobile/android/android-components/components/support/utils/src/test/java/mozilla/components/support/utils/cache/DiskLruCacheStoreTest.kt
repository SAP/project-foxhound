/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.cache

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.jakewharton.disklrucache.DiskLruCache
import com.jakewharton.disklrucache.DiskLruCache.Editor
import com.jakewharton.disklrucache.DiskLruCache.Snapshot
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doThrow
import org.mockito.Mockito.`when`
import java.io.File
import java.io.IOException
import java.io.InputStream

@RunWith(AndroidJUnit4::class)
class DiskLruCacheStoreTest {

    @Before
    @After
    fun cleanUp() {
        CacheDirectoryMigration.resetMigrationState()
        File(testContext.noBackupFilesDir, BLOCKING_FILE_NAME).deleteRecursively()
        File(testContext.noBackupFilesDir, STORE_PARENT).deleteRecursively()
    }

    @Test
    fun `writeString and readString round-trip data`() {
        val store = createStore()

        assertTrue(store.writeString(testContext, "key", "value"))

        assertEquals("value", store.readString(testContext, "key"))
    }

    @Test
    fun `write and readBytes round-trip data`() {
        val store = createStore()

        assertTrue(
            store.write(testContext, "key") { stream ->
                stream.write("bytes".toByteArray())
            },
        )

        assertEquals("bytes", String(store.readBytes(testContext, "key")!!))
    }

    @Test
    fun `read returns null for a missing key`() {
        val store = createStore()

        assertNull(store.readString(testContext, "missing"))
        assertNull(store.readBytes(testContext, "missing"))
    }

    @Test
    fun `readString returns null on IOException`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        val snapshot: Snapshot = mock()
        store.cache = lruCache

        `when`(lruCache.get("key")).thenReturn(snapshot)
        `when`(snapshot.getInputStream(0)).thenReturn(throwingInputStream())

        assertNull(store.readString(testContext, "key"))
    }

    @Test
    fun `readBytes returns null on IOException`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        val snapshot: Snapshot = mock()
        store.cache = lruCache

        `when`(lruCache.get("key")).thenReturn(snapshot)
        `when`(snapshot.getInputStream(0)).thenReturn(throwingInputStream())

        assertNull(store.readBytes(testContext, "key"))
    }

    @Test
    fun `remove returns true for an existing key`() {
        val store = createStore()

        assertTrue(store.writeString(testContext, "key", "value"))

        assertTrue(store.remove(testContext, "key"))
        assertNull(store.readString(testContext, "key"))
    }

    @Test
    fun `remove returns false for a missing key`() {
        val store = createStore()

        assertFalse(store.remove(testContext, "missing"))
    }

    @Test
    fun `remove returns false on IOException`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        store.cache = lruCache

        `when`(lruCache.remove("key")).thenThrow(IOException("test"))

        assertFalse(store.remove(testContext, "key"))
    }

    @Test
    fun `write returns false when cache cannot be opened`() {
        val nonDirectoryFile = File(testContext.cacheDir, BLOCKING_FILE_NAME).apply {
            writeText("not a directory")
        }
        val store = createStore {
            File(nonDirectoryFile, STORE_PARENT)
        }

        assertFalse(store.writeString(testContext, "key", "value"))
    }

    @Test
    fun `write returns false when edit returns null`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        store.cache = lruCache

        `when`(lruCache.edit("key")).thenReturn(null)

        assertFalse(store.write(testContext, "key") {})
    }

    @Test
    fun `write returns false on IOException from editor`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        val editor: Editor = mock()
        store.cache = lruCache

        `when`(lruCache.edit("key")).thenReturn(editor)
        `when`(editor.newOutputStream(0)).thenThrow(IOException("test"))

        assertFalse(store.write(testContext, "key") {})
    }

    @Test
    fun `writeString returns false on IOException from editor`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        val editor: Editor = mock()
        store.cache = lruCache

        `when`(lruCache.edit("key")).thenReturn(editor)
        doThrow(IOException("test")).`when`(editor).set(0, "value")

        assertFalse(store.writeString(testContext, "key", "value"))
    }

    @Test
    fun `clear catches IOException and clears cached instance`() {
        val store = createStore()
        val lruCache: DiskLruCache = mock()
        store.cache = lruCache

        `when`(lruCache.delete()).thenThrow(IOException("test"))

        store.clear(testContext)

        assertNull(store.cache)
    }

    private fun createStore(
        directoryProvider: (Context) -> File = { File(it.noBackupFilesDir, STORE_PARENT) },
    ) = DiskLruCacheStore(
        logger = Logger("DiskLruCacheStoreTest"),
        version = 1,
        maxSizeBytes = 1024L * 1024L,
        directoryProvider = directoryProvider,
    )

    private fun throwingInputStream() = object : InputStream() {
        override fun read(): Int {
            throw IOException("test")
        }
    }

    companion object {
        private const val BLOCKING_FILE_NAME = "disk_lru_cache_file"
        private const val STORE_PARENT = "disk_lru_cache_store_test"
    }
}
