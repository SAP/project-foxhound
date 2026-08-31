/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.client

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalDate

/**
 * Unit tests for [apiRequestDate].
 *
 * The WCS endpoint only returns matches within ±10 days of the date param, so before the
 * tournament starts we pin the request to the kickoff date (2026-06-11). Once the tournament
 * is underway the device's local "today" is used and the window tracks the current matchday.
 */
class AppServicesWorldCupMatchesClientTest {

    @Test
    fun `GIVEN today is well before kickoff WHEN apiRequestDate THEN returns the kickoff date`() {
        val today = LocalDate.of(2025, 12, 1)
        assertEquals("2026-06-11", apiRequestDate(today))
    }

    @Test
    fun `GIVEN today is one day before kickoff WHEN apiRequestDate THEN returns the kickoff date`() {
        val today = LocalDate.of(2026, 6, 10)
        assertEquals("2026-06-11", apiRequestDate(today))
    }

    @Test
    fun `GIVEN today is the kickoff date WHEN apiRequestDate THEN returns today`() {
        val today = LocalDate.of(2026, 6, 11)
        assertEquals("2026-06-11", apiRequestDate(today))
    }

    @Test
    fun `GIVEN today is mid-tournament WHEN apiRequestDate THEN returns today`() {
        val today = LocalDate.of(2026, 6, 20)
        assertEquals("2026-06-20", apiRequestDate(today))
    }

    @Test
    fun `GIVEN today is after the tournament WHEN apiRequestDate THEN returns today`() {
        val today = LocalDate.of(2026, 8, 1)
        assertEquals("2026-08-01", apiRequestDate(today))
    }

    @Test
    fun `apiRequestDate always returns ISO-8601 yyyy-MM-dd`() {
        val singleDigitMonthDay = LocalDate.of(2026, 7, 4)
        // Asserting the explicit padded form catches any regression to a localized format.
        assertEquals("2026-07-04", apiRequestDate(singleDigitMonthDay))
    }
}
