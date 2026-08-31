/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.extension

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.icons.IconRequest
import mozilla.components.concept.engine.manifest.Size
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class IconMessageKtTest {

    @Test
    fun `Serializing and deserializing icon resources`() {
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

        val json = resources.toJSON()
        assertEquals(3, json.length())

        val restoredResources = json.toIconResources()
        assertEquals(resources, restoredResources)
    }

    @Test
    fun `GIVEN resource types are from tippy top and merino manifest WHEN resources are serialized THEN tippy top and merino manifest resource types are not serialized`() {
        val resources = listOf(
            IconRequest.Resource(
                url = "https://www.mozilla.org/icon64.png",
                type = IconRequest.Resource.Type.FAVICON,
            ),
            IconRequest.Resource(
                url = "https://tippytop.example/icon.png",
                type = IconRequest.Resource.Type.TIPPY_TOP,
            ),
            IconRequest.Resource(
                url = "https://merino.example/icon.png",
                type = IconRequest.Resource.Type.MERINO_MANIFEST,
            ),
        )

        val json = resources.toJSON()
        assertEquals(1, json.length())

        val restoredResources = json.toIconResources()
        assertEquals(resources.take(1), restoredResources)
    }

    @Test
    fun `Url must be sanitized`() {
        val resources = listOf(
            IconRequest.Resource(
                url = "\nhttps://www.mozilla.org/icon64.png\n",
                sizes = listOf(Size(64, 64)),
                mimeType = "image/png",
                type = IconRequest.Resource.Type.FAVICON,
            ),
        )

        val json = resources.toJSON()

        val restoredResource = json.toIconResources().first()
        assertEquals("https://www.mozilla.org/icon64.png", restoredResource.url)
    }
}
