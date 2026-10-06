/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.pocket.ext

import mozilla.components.service.pocket.PocketStory.SponsoredContent
import mozilla.components.service.pocket.PocketStory.SponsoredContentFrequencyCaps
import mozilla.components.service.pocket.helpers.PocketTestResources
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mockito.Mockito.doReturn

class PocketStoryKtTest {
    private val nowInSeconds = System.currentTimeMillis() / 1000
    private val flightPeriod = 100
    private val flightImpression1 = nowInSeconds - flightPeriod / 2
    private val flightImpression2 = nowInSeconds - flightPeriod / 3
    private val currentImpressions = listOf(
        nowInSeconds - flightPeriod * 2, // older impression that doesn't fit the flight period
        flightImpression1,
        flightImpression2,
    )

    @Test
    fun `GIVEN sponsored content impressions are recorded WHEN asking for the current flight impressions THEN return all impressions in the flight period`() {
        val frequencyCaps = SponsoredContentFrequencyCaps(
            currentImpressions = currentImpressions,
            flightCount = 5,
            flightPeriod = flightPeriod,
        )
        val sponsoredContent: SponsoredContent = mock()

        doReturn(frequencyCaps).`when`(sponsoredContent).caps

        assertEquals(
            listOf(flightImpression1, flightImpression2),
            sponsoredContent.getCurrentFlightImpressions(),
        )
    }

    @Test
    fun `GIVEN 3 recorded sponsored content impressions and 5 flight count WHEN asking if flight impressions limit has been reached THEN return false`() {
        val frequencyCaps = SponsoredContentFrequencyCaps(
            currentImpressions = currentImpressions,
            flightCount = 5,
            flightPeriod = flightPeriod,
        )
        val sponsoredContent: SponsoredContent = mock()

        doReturn(frequencyCaps).`when`(sponsoredContent).caps

        assertFalse(sponsoredContent.hasFlightImpressionsLimitReached())
    }

    @Test
    fun `GIVEN 3 recorded sponsored content impressions and 2 flight count WHEN asking if flight impressions limit has been reached THEN return true`() {
        val frequencyCaps = SponsoredContentFrequencyCaps(
            currentImpressions = currentImpressions,
            flightCount = 2,
            flightPeriod = flightPeriod,
        )
        val sponsoredContent: SponsoredContent = mock()

        doReturn(frequencyCaps).`when`(sponsoredContent).caps

        assertTrue(sponsoredContent.hasFlightImpressionsLimitReached())
    }

    @Test
    fun `WHEN recording a new impression for a sponsored content THEN add a new impression entry to the current impressions`() {
        val sponsoredContent = PocketTestResources.sponsoredContentEntity.toSponsoredContent(currentImpressions)

        assertEquals(3, sponsoredContent.caps.currentImpressions.size)

        val result = sponsoredContent.recordNewImpression()

        assertSame(sponsoredContent.url, result.url)
        assertSame(sponsoredContent.title, result.title)
        assertSame(sponsoredContent.callbacks, result.callbacks)
        assertSame(sponsoredContent.imageUrl, result.imageUrl)
        assertSame(sponsoredContent.domain, result.domain)
        assertSame(sponsoredContent.excerpt, result.excerpt)
        assertSame(sponsoredContent.sponsor, result.sponsor)
        assertSame(sponsoredContent.blockKey, result.blockKey)
        assertEquals(sponsoredContent.priority, result.priority)
        assertEquals(sponsoredContent.caps.flightCount, result.caps.flightCount)
        assertEquals(sponsoredContent.caps.flightPeriod, result.caps.flightPeriod)

        assertEquals(4, result.caps.currentImpressions.size)
        assertEquals(currentImpressions, result.caps.currentImpressions.take(3))
        // Check if a new impression has been added around the current time.
        assertTrue(
            LongRange(nowInSeconds - 5, nowInSeconds + 5)
                .contains(result.caps.currentImpressions[3]),
        )
    }
}
