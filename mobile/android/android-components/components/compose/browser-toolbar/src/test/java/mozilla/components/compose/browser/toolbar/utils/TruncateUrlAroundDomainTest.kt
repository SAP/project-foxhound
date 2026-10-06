/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TruncateUrlAroundDomainTest {
    @Test
    fun `GIVEN a long URL WHEN truncating it THEN keep the number of characters requested AND adjust the domain indexes`() {
        val testUrl = "www.example.com/test"
        val registrableDomainRange = 4 to 15 // example.com

        val (truncatedUrl, adjustedDomainIndexRange) = truncateUrlAroundDomain(
            url = testUrl,
            registrableDomainIndexRange = registrableDomainRange,
            maxCharCountAroundDomain = 1,
        )

        assertEquals(".example.com/", truncatedUrl)
        assertEquals(1 to 12, adjustedDomainIndexRange)
    }

    @Test
    fun `GIVEN an URL with unknown domain indexes WHEN truncating it THEN keep double of the characters requested`() {
        val testUrl = "www.example.com/test"

        val (truncatedUrl, adjustedDomainIndexRange) = truncateUrlAroundDomain(
            url = testUrl,
            registrableDomainIndexRange = null,
            maxCharCountAroundDomain = 6,
        )

        assertEquals("www.example.", truncatedUrl)
        assertNull(adjustedDomainIndexRange)
    }

    @Test
    fun `GIVEN an URL with no subdomain WHEN truncating it THEN truncate only at the end AND don't adjust the domain indexes`() {
        val testUrl = "example.com/test"
        val registrableDomainRange = 0 to 11 // example.com

        val (truncatedUrl, adjustedDomainIndexRange) = truncateUrlAroundDomain(
            url = testUrl,
            registrableDomainIndexRange = registrableDomainRange,
            maxCharCountAroundDomain = 3,
        )

        assertEquals("example.com/te", truncatedUrl)
        assertEquals(0 to 11, adjustedDomainIndexRange)
    }

    @Test
    fun `GIVEN an URL with a subdomain and no subpages WHEN truncating it THEN truncate only at the start AND adjust the domain indexes`() {
        val testUrl = "www.example.com"
        val registrableDomainRange = 4 to 15 // example.com

        val (truncatedUrl, adjustedDomainIndexRange) = truncateUrlAroundDomain(
            url = testUrl,
            registrableDomainIndexRange = registrableDomainRange,
            maxCharCountAroundDomain = 2,
        )

        assertEquals("w.example.com", truncatedUrl)
        assertEquals(2 to 13, adjustedDomainIndexRange)
    }

    @Test
    fun `GIVEN a short URL with both subdomain and subpages WHEN truncating it to a larger character count THEN don't truncate AND don't adjust the domain indexes`() {
        val testUrl = "www.example.com/test"
        val registrableDomainRange = 4 to 15 // example.com

        val (truncatedUrl, adjustedDomainIndexRange) = truncateUrlAroundDomain(
            url = testUrl,
            registrableDomainIndexRange = registrableDomainRange,
            maxCharCountAroundDomain = 10,
        )

        assertEquals("www.example.com/test", truncatedUrl)
        assertEquals(4 to 15, adjustedDomainIndexRange)
    }
}
