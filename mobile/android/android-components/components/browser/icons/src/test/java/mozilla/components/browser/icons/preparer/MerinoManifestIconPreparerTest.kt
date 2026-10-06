/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.preparer

import android.content.res.AssetManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.icons.IconRequest
import mozilla.components.service.merino.manifest.MerinoManifestProvider
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn

@RunWith(AndroidJUnit4::class)
class MerinoManifestIconPreparerTest {
    @Test
    fun `WHEN url is not in manifest THEN no resource is added`() {
        val manifestProvider: MerinoManifestProvider = mock()
        val preparer = MerinoManifestIconPreparer(manifestProvider)

        val request = IconRequest("https://thispageisnotinthemanifest.org")
        assertEquals(0, request.resources.size)

        val preparedRequest = preparer.prepare(testContext, request)
        assertEquals(0, preparedRequest.resources.size)
    }

    @Test
    fun `WHEN url is not http(s) THEN no resource is added`() {
        val manifestProvider: MerinoManifestProvider = mock()
        val preparer = MerinoManifestIconPreparer(manifestProvider)

        val request = IconRequest("about://www.github.com")
        assertEquals(0, request.resources.size)

        val preparedRequest = preparer.prepare(testContext, request)
        assertEquals(0, preparedRequest.resources.size)
    }

    @Test
    fun `WHEN manifest could not be read THEN no resource is added`() {
        val assetManager: AssetManager = mock()
        doReturn("{".toByteArray().inputStream()).`when`(assetManager).open(any())

        val preparer = MerinoManifestIconPreparer(MerinoManifestProvider(assetManager))

        val request = IconRequest("https://www.github.com")
        assertEquals(0, request.resources.size)

        val preparedRequest = preparer.prepare(testContext, request)
        assertEquals(0, preparedRequest.resources.size)
    }

    @Test
    fun `WHEN url is Wikipedia THEN prefix is ignored`() {
        val wikipediaIconUrl = "https://example.com/wikipedia.png"
        val manifestProvider: MerinoManifestProvider = mock()
        doReturn(wikipediaIconUrl).`when`(manifestProvider).getIconUrl("wikipedia.org")
        val preparer = MerinoManifestIconPreparer(manifestProvider)

        var request = IconRequest("https://www.wikipedia.org")
        assertEquals(0, request.resources.size)

        var preparedRequest = preparer.prepare(testContext, request)
        assertEquals(1, preparedRequest.resources.size)
        assertEquals(wikipediaIconUrl, preparedRequest.resources[0].url)
        assertEquals(IconRequest.Resource.Type.MERINO_MANIFEST, preparedRequest.resources[0].type)

        request = IconRequest("https://en.wikipedia.org")
        preparedRequest = preparer.prepare(testContext, request)
        assertEquals(1, preparedRequest.resources.size)
        assertEquals(wikipediaIconUrl, preparedRequest.resources[0].url)

        request = IconRequest("https://de.wikipedia.org")
        preparedRequest = preparer.prepare(testContext, request)
        assertEquals(1, preparedRequest.resources.size)
        assertEquals(wikipediaIconUrl, preparedRequest.resources[0].url)

        request = IconRequest("https://de.m.wikipedia.org")
        preparedRequest = preparer.prepare(testContext, request)
        assertEquals(1, preparedRequest.resources.size)
        assertEquals(wikipediaIconUrl, preparedRequest.resources[0].url)

        request = IconRequest("https://abc.wikipedia.org.com")
        preparedRequest = preparer.prepare(testContext, request)
        assertEquals(0, preparedRequest.resources.size)
    }
}
