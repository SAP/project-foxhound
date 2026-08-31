/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import mozilla.appservices.adsclient.MozAdsCallbacks
import mozilla.appservices.adsclient.MozAdsClient
import mozilla.appservices.adsclient.MozAdsClientApiException
import mozilla.appservices.adsclient.MozAdsPlacementRequest
import mozilla.appservices.adsclient.MozAdsTile
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.feature.top.sites.TopSite
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class MacTopSitesProviderTest {

    private lateinit var client: MozAdsClient
    private lateinit var crashReporter: CrashReporting

    @Before
    fun setup() {
        client = mock()
        crashReporter = mock()

        val clientField = MozAdsClientProvider::class.java.getDeclaredField("client")
        clientField.isAccessible = true
        clientField.set(MozAdsClientProvider, client)
    }

    @After
    fun tearDown() {
        MozAdsClientProvider.reset()
    }

    @Test
    fun `GIVEN a list of Ad placement to request WHEN tile ads are requested THEN sponsored top sites are returned in the correct placement order`() = runTest {
        val placements = listOf("placement2", "placement1", "placement3")
        val provider = MacTopSitesProvider(
            adsClientProvider = lazy { MozAdsClientProvider },
            requestConfig = getRequestConfig(placements = placements),
        )
        val tiles = createTiles(count = 3)

        whenever(client.requestTileAds(mozAdRequests = any(), options = any())).thenReturn(tiles)

        val topSites = provider.getTopSites()

        verify(client).requestTileAds(mozAdRequests = any(), options = any())

        assertEquals(3, topSites.size)
        placements.forEachIndexed { i, placement ->
            val tile = tiles[placement]
            if (tile != null) {
                assertTopSiteEqualsTile(tile, topSites[i])
            }
        }
    }

    @Test
    fun `GIVEN placement IDs for the request config WHEN tile ads are requested THEN ensure the placement IDs used in the Ad placement requests are correct`() = runTest {
        val placements = listOf("placement1", "placement2")
        val provider = MacTopSitesProvider(
            adsClientProvider = lazy { MozAdsClientProvider },
            requestConfig = getRequestConfig(placements),
        )
        val captor = argumentCaptor<List<MozAdsPlacementRequest>>()

        whenever(client.requestTileAds(mozAdRequests = any(), options = any())).thenReturn(createTiles())

        provider.getTopSites()

        verify(client).requestTileAds(mozAdRequests = captor.capture(), options = any())

        val capturedRequests = captor.value
        assertEquals(placements.size, capturedRequests.size)
        assertEquals(capturedRequests.map { it.placementId }, placements)
    }

    @Test
    fun `GIVEN Ads client API exception WHEN tile ads are requested THEN log error and return empty list`() = runTest {
        val provider = MacTopSitesProvider(
            adsClientProvider = lazy { MozAdsClientProvider },
            requestConfig = getRequestConfig(),
            crashReporter = crashReporter,
        )
        val exception = MozAdsClientApiException.Other("test error")

        whenever(client.requestTileAds(mozAdRequests = any(), options = any())).thenThrow(exception)

        val topSites = provider.getTopSites()

        verify(client).requestTileAds(mozAdRequests = any(), options = any())

        assertEquals(0, topSites.size)
        verify(crashReporter).recordCrashBreadcrumb(breadcrumb = any())
        verify(crashReporter).submitCaughtException(exception)
    }

    private fun getRequestConfig(
        placements: List<String> = listOf(),
    ) = MacTopSitesRequestConfig(
        placements = placements,
    )

    private fun createTiles(count: Int = 1): Map<String, MozAdsTile> {
        return (1..count).associate {
            "placement$it" to MozAdsTile(
                blockKey = "$it",
                callbacks = MozAdsCallbacks(
                    click = "https://mozilla.com/$it/click",
                    impression = "https://mozilla.com/$it/impression",
                    report = null,
                ),
                format = "",
                imageUrl = "https://test.com/image$it.jpg",
                name = "Mozilla$it",
                url = "https://mozilla.com/$it/",
            )
        }
    }

    private fun assertTopSiteEqualsTile(tile: MozAdsTile, topSite: TopSite.Provided) {
        assertNull(topSite.id)
        assertEquals(tile.name, topSite.title)
        assertEquals(tile.url, topSite.url)
        assertEquals(tile.callbacks.click, topSite.clickUrl)
        assertEquals(tile.imageUrl, topSite.imageUrl)
        assertEquals(tile.callbacks.impression, topSite.impressionUrl)
        assertNull(topSite.createdAt)
    }
}
