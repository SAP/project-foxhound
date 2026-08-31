/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.util

import org.junit.Test
import java.util.Locale
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LocalizedCountryNameTest {

    private val enUs = Locale.US
    private val french = Locale.FRENCH

    @Test
    fun `GIVEN an ISO-3 country code WHEN resolved in en-US THEN returns the English country name`() {
        assertEquals("United States", localizedCountryName("USA", enUs))
    }

    @Test
    fun `GIVEN a FIFA alias that diverges from ISO-3 WHEN resolved THEN maps through the alias`() {
        // FIFA "GER" → ISO-3 "DEU" → ISO-2 "DE" → "Germany".
        assertEquals("Germany", localizedCountryName("GER", enUs))
    }

    @Test
    fun `GIVEN the URU FIFA alias WHEN resolved THEN returns Uruguay`() {
        // Regression guard: Uruguay's feed code is "URY" (ISO-3) but the app keys on "URU" (FIFA).
        assertEquals("Uruguay", localizedCountryName("URU", enUs))
    }

    @Test
    fun `GIVEN a French locale WHEN resolved THEN returns the French country name`() {
        assertEquals("Allemagne", localizedCountryName("GER", french))
    }

    @Test
    fun `GIVEN a lowercase input WHEN resolved THEN normalization is case-insensitive`() {
        assertEquals("Germany", localizedCountryName("ger", enUs))
    }

    @Test
    fun `GIVEN a FIFA-only code with no ISO 3166 equivalent WHEN resolved THEN returns the code unchanged`() {
        // ENG and SCO are UK constituents; they have no ISO 3166 country mapping.
        assertEquals("ENG", localizedCountryName("ENG", enUs))
        assertEquals("SCO", localizedCountryName("SCO", enUs))
    }

    @Test
    fun `GIVEN an unknown code WHEN resolved THEN returns the code unchanged`() {
        assertEquals("XYZ", localizedCountryName("XYZ", enUs))
    }

    @Test
    fun `GIVEN an empty string WHEN resolved THEN returns an empty string`() {
        assertEquals("", localizedCountryName("", enUs))
    }

    @Test
    fun `GIVEN apiKeyToFifa WHEN looking up an inverted ISO-3 alias THEN returns the FIFA code`() {
        assertEquals("URU", apiKeyToFifa["URY"])
        assertEquals("GER", apiKeyToFifa["DEU"])
        assertEquals("NED", apiKeyToFifa["NLD"])
    }

    @Test
    fun `GIVEN apiKeyToFifa WHEN looking up a CVI or CDR key THEN return the FIFA code`() {
        // The feed returns non-standard codes for these; mapping rescues them.
        assertEquals("CPV", apiKeyToFifa["CVI"])
        assertEquals("COD", apiKeyToFifa["CDR"])
    }

    @Test
    fun `GIVEN apiKeyToFifa WHEN looking up a FIFA code as the key THEN no entry exists`() {
        // The map is one-directional: ISO-3 / CVI / CDR → FIFA. A FIFA-as-key hit would be a bug.
        assertNull(apiKeyToFifa["URU"])
        assertNull(apiKeyToFifa["GER"])
    }

    @Test
    fun `GIVEN every fifaToIso3 entry WHEN looking up the ISO-3 in apiKeyToFifa THEN it maps back to the FIFA code`() {
        fifaToIso3.forEach { (fifa, iso3) ->
            assertEquals(fifa, apiKeyToFifa[iso3])
        }
    }
}
