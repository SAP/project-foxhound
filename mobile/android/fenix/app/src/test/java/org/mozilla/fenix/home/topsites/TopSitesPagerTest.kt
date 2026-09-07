/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites

import mozilla.components.feature.top.sites.TopSite
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.home.fake.FakeHomepagePreview

class TopSitesPagerTest {

    private fun pagerPages(topSites: List<TopSite>): List<List<TopSite>> =
        topSites.take(TOP_SITES_TO_SHOW)
            .sortedByDescending { it is TopSite.Provided }
            .chunked(TOP_SITES_PER_ROW)

    @Test
    fun `GIVEN a mix of provided and non-provided sites WHEN sorted for pager THEN provided sites appear first`() {
        val topSites = FakeHomepagePreview.topSites(providedCount = 2, pinnedCount = 0, defaultCount = 2)

        val pages = pagerPages(topSites)
        val allSorted = pages.flatten()

        val firstNonProvided = allSorted.indexOfFirst { it !is TopSite.Provided }
        val lastProvided = allSorted.indexOfLast { it is TopSite.Provided }
        assertTrue(
            "All provided sites should appear before any frecent sites",
            lastProvided < firstNonProvided || firstNonProvided == -1,
        )
    }

    @Test
    fun `GIVEN 8 top sites WHEN chunked for pager THEN there are 2 pages of 4`() {
        val topSites = FakeHomepagePreview.topSites(providedCount = 0, pinnedCount = 0, defaultCount = 8)
        val pages = pagerPages(topSites)

        assertEquals(2, pages.size)
        assertEquals(4, pages[0].size)
        assertEquals(4, pages[1].size)
    }

    @Test
    fun `GIVEN 5 top sites WHEN chunked for pager THEN last page has fewer than TOP_SITES_PER_ROW items`() {
        val topSites = FakeHomepagePreview.topSites(providedCount = 0, pinnedCount = 0, defaultCount = 5)

        val pages = pagerPages(topSites)

        assertEquals(2, pages.size)
        assertEquals(4, pages[0].size)
        assertEquals(1, pages[1].size)
    }

    @Test
    fun `GIVEN more than TOP_SITES_TO_SHOW sites WHEN building pager pages THEN only first 8 are shown`() {
        val topSites = FakeHomepagePreview.topSites(providedCount = 0, pinnedCount = 0, defaultCount = 12)

        val pages = pagerPages(topSites)

        assertEquals(TOP_SITES_TO_SHOW, pages.flatten().size)
    }

    @Test
    fun `GIVEN fewer than TOP_SITES_PER_ROW sites WHEN building pager pages THEN there is 1 page`() {
        val topSites = FakeHomepagePreview.topSites(providedCount = 0, pinnedCount = 0, defaultCount = 3)

        val pages = pagerPages(topSites)

        assertEquals(1, pages.size)
        assertEquals(3, pages[0].size)
    }

    @Test
    fun `GIVEN an empty list WHEN building pager pages THEN there are no pages`() {
        val pages = pagerPages(emptyList())

        assertTrue(pages.isEmpty())
    }
}
