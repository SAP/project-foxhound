/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.utils

import android.graphics.Bitmap
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.icons.IconRequest
import mozilla.components.concept.engine.manifest.Size
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.cache.CacheDirectoryMigration
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.Mockito.`when`
import org.robolectric.annotation.Config
import java.io.File
import java.io.OutputStream
import kotlin.test.assertNotNull

@RunWith(AndroidJUnit4::class)
class IconDiskCacheTest {
    @Before
    @After
    fun cleanUp() {
        CacheDirectoryMigration.resetMigrationState()
        File(testContext.cacheDir, CACHE_PARENT).deleteRecursively()
        File(testContext.noBackupFilesDir, CACHE_PARENT).deleteRecursively()
    }

    @Test
    fun `Resource cache files are stored under noBackupFilesDir, not cacheDir`() {
        val cache = IconDiskCache()
        val resource = IconRequest.Resource(
            url = "https://www.mozilla.org/icon64.png",
            sizes = listOf(Size(64, 64)),
            mimeType = "image/png",
            type = IconRequest.Resource.Type.FAVICON,
        )
        cache.putResources(testContext, IconRequest("https://www.mozilla.org", resources = listOf(resource)))

        val newParent = File(testContext.noBackupFilesDir, CACHE_PARENT)
        val legacyParent = File(testContext.cacheDir, CACHE_PARENT)

        assertTrue("Resource cache should live under noBackupFilesDir", File(newParent, RESOURCES_DIR).exists())
        assertFalse("Resource cache must not be created under cacheDir", legacyParent.exists())
    }

    @Test
    fun `Icon cache files are stored under noBackupFilesDir, not cacheDir`() {
        val cache = IconDiskCache()
        val resource = IconRequest.Resource(
            url = "https://www.mozilla.org/icon64.png",
            type = IconRequest.Resource.Type.FAVICON,
        )
        val bitmap: Bitmap = mock()

        cache.putIconBitmap(testContext, resource, bitmap)

        val newParent = File(testContext.noBackupFilesDir, CACHE_PARENT)
        val legacyParent = File(testContext.cacheDir, CACHE_PARENT)

        assertTrue("Icon cache should live under noBackupFilesDir", File(newParent, ICONS_DIR).exists())
        assertFalse("Icon cache must not be created under cacheDir", legacyParent.exists())
    }

    @Test
    fun `Legacy cacheDir entries are migrated to noBackupFilesDir on first access`() {
        val legacyParent = File(testContext.cacheDir, "mozac_browser_icons")
        val legacyResources = File(legacyParent, "resources")
        val legacyIcons = File(legacyParent, "icons")
        assertTrue(legacyResources.mkdirs())
        assertTrue(legacyIcons.mkdirs())
        File(legacyResources, "marker").writeText("res")
        File(legacyIcons, "marker").writeText("ico")

        val cache = IconDiskCache()
        cache.getResources(
            testContext,
            IconRequest("https://www.mozilla.org"),
        )

        val newParent = File(testContext.noBackupFilesDir, "mozac_browser_icons")
        val newResources = File(newParent, "resources")
        val newIcons = File(newParent, "icons")
        assertTrue(File(newResources, "marker").exists())
        assertTrue(File(newIcons, "marker").exists())
        assertEquals("res", File(newResources, "marker").readText())
        assertEquals("ico", File(newIcons, "marker").readText())
        assertFalse("Legacy cacheDir parent should be gone", legacyParent.exists())
    }

    @Test
    fun `When both legacy and new directories exist, legacy is deleted and new content is preserved`() {
        val legacyParent = File(testContext.cacheDir, "mozac_browser_icons")
        val legacyResources = File(legacyParent, "resources")
        assertTrue(legacyResources.mkdirs())
        File(legacyResources, "legacy-marker").writeText("legacy")

        val newParent = File(testContext.noBackupFilesDir, "mozac_browser_icons")
        assertTrue(File(newParent, "resources").mkdirs())
        File(File(newParent, "resources"), "new-marker").writeText("new")

        val cache = IconDiskCache()
        cache.getResources(testContext, IconRequest("https://www.mozilla.org"))

        assertFalse("Legacy cacheDir parent should be deleted", legacyParent.exists())
        assertTrue(File(File(newParent, "resources"), "new-marker").exists())
        assertEquals("new", File(File(newParent, "resources"), "new-marker").readText())
    }

    @Test
    fun `Writing and reading resources`() {
        val cache = IconDiskCache()

        val resources = listOf(
            IconRequest.Resource(
                url = "https://www.mozilla.org/icon64.png",
                sizes = listOf(Size(64, 64)),
                mimeType = "image/png",
                type = IconRequest.Resource.Type.FAVICON,
            ),
            IconRequest.Resource(
                url = "https://www.mozilla.org/icon128.png",
                sizes = listOf(Size(128, 128)),
                mimeType = "image/png",
                type = IconRequest.Resource.Type.FAVICON,
            ),
            IconRequest.Resource(
                url = "https://www.mozilla.org/icon128.png",
                sizes = listOf(Size(180, 180)),
                type = IconRequest.Resource.Type.APPLE_TOUCH_ICON,
            ),
        )

        val request = IconRequest("https://www.mozilla.org", resources = resources)
        cache.putResources(testContext, request)

        val restoredResources = cache.getResources(testContext, request)
        assertEquals(3, restoredResources.size)
        assertEquals(resources, restoredResources)
    }

    @Test
    @Config(sdk = [28])
    fun `Writing and reading bitmap bytes on SDK 28`() {
        val cache = IconDiskCache()

        val resource = IconRequest.Resource(
            url = "https://www.mozilla.org/icon64.png",
            sizes = listOf(Size(64, 64)),
            mimeType = "image/png",
            type = IconRequest.Resource.Type.FAVICON,
        )

        val bitmap: Bitmap = mock()
        `when`(bitmap.compress(any(), anyInt(), any())).thenAnswer {
            @Suppress("DEPRECATION")
            assertEquals(Bitmap.CompressFormat.WEBP, it.arguments[0] as Bitmap.CompressFormat)
            assertEquals(90, it.arguments[1] as Int) // Quality

            val stream = it.arguments[2] as OutputStream
            stream.write("Hello World".toByteArray())
            true
        }

        cache.putIconBitmap(testContext, resource, bitmap)

        val data = cache.getIconData(testContext, resource)
        assertNotNull(data)
        assertEquals("Hello World", String(data))
    }

    @Test
    fun `Writing and reading bitmap bytes`() {
        val cache = IconDiskCache()

        val resource = IconRequest.Resource(
            url = "https://www.mozilla.org/icon64.png",
            sizes = listOf(Size(64, 64)),
            mimeType = "image/png",
            type = IconRequest.Resource.Type.FAVICON,
        )

        val bitmap: Bitmap = mock()
        `when`(bitmap.compress(any(), anyInt(), any())).thenAnswer {
            assertEquals(Bitmap.CompressFormat.WEBP_LOSSY, it.arguments[0] as Bitmap.CompressFormat)
            assertEquals(90, it.arguments[1] as Int) // Quality

            val stream = it.arguments[2] as OutputStream
            stream.write("Hello World".toByteArray())
            true
        }

        cache.putIconBitmap(testContext, resource, bitmap)

        val data = cache.getIconData(testContext, resource)
        assertNotNull(data)
        assertEquals("Hello World", String(data))
    }

    private val cacheParent
        get() = File(testContext.cacheDir, CACHE_PARENT)

    companion object {
        private const val CACHE_PARENT = "mozac_browser_icons"
        private const val ICONS_DIR = "icons"
        private const val RESOURCES_DIR = "resources"
    }
}
