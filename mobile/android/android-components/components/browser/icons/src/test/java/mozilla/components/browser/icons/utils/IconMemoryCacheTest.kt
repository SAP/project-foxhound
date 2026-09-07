/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.utils

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.icons.Icon
import mozilla.components.browser.icons.IconRequest
import mozilla.components.browser.icons.loader.IconLoader
import mozilla.components.browser.icons.loader.MemoryIconLoader
import mozilla.components.browser.icons.preparer.MemoryIconPreparer
import mozilla.components.browser.icons.processor.MemoryIconProcessor
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.test.assertIs

@RunWith(AndroidJUnit4::class)
class IconMemoryCacheTest {

    @Test
    fun `Verify memory components interaction`() {
        val cache = IconMemoryCache()

        val preparer = MemoryIconPreparer(cache)
        val loader = MemoryIconLoader(cache)
        val processor = MemoryIconProcessor(cache)

        val icon = Icon(bitmap = mock(), source = Icon.Source.DOWNLOAD)
        val resource = IconRequest.Resource(
            url = "https://www.mozilla.org/favicon64.ico",
            type = IconRequest.Resource.Type.FAVICON,
        )
        val request = IconRequest("https://www.mozilla.org", resources = listOf(resource))

        assertEquals(IconLoader.Result.NoResult, loader.load(mock(), request, resource))

        // First, save something in the memory cache using the processor
        processor.process(mock(), request, resource, icon, mock())

        // Then load the same icon from the loader
        val result = loader.load(mock(), request, resource)
        assertIs<IconLoader.Result.BitmapResult>(result)
        assertSame(icon.bitmap, result.bitmap)
        assertEquals(Icon.Source.MEMORY, result.source)

        // Prepare a new request with the same URL
        val newRequest = IconRequest("https://www.mozilla.org")
        assertTrue(newRequest.resources.isEmpty())
        val preparedRequest = preparer.prepare(mock(), newRequest)
        assertEquals(1, preparedRequest.resources.size)

        // Load prepared request
        val preparedResult = loader.load(mock(), preparedRequest, preparedRequest.resources[0])
        assertIs<IconLoader.Result.BitmapResult>(preparedResult)
        assertSame(icon.bitmap, preparedResult.bitmap)
        assertEquals(Icon.Source.MEMORY, preparedResult.source)
    }
}
