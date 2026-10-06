/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ipprotection.helpers

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.helpers.LocaleTestRule
import org.robolectric.RobolectricTestRunner
import java.time.format.DateTimeParseException
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
class IsoPromoDeadlineTest {

    @get:Rule
    val localeTestRule = LocaleTestRule(Locale.US)

    @Test
    fun `GIVEN a valid ISO date WHEN formatted THEN returns a non-null localized string and does not report an exception`() {
        val captured = mutableListOf<Exception>()

        val formatted = IsoPromoDeadline("2026-09-30").formatPromoDateOrCatch(captured::add)

        assertNotNull(formatted)
        assertTrue(
            "Expected formatted date to contain the month name, was \"$formatted\"",
            formatted!!.contains("September"),
        )
        assertTrue(formatted.contains("30"))
        assertTrue(captured.isEmpty())
    }

    @Test
    fun `GIVEN an invalid calendar date WHEN formatted THEN returns null and reports a DateTimeParseException`() {
        val captured = mutableListOf<Exception>()

        val formatted = IsoPromoDeadline("2026-09-31").formatPromoDateOrCatch(captured::add)

        assertNull(formatted)
        assertEquals(1, captured.size)
        assertTrue(captured.single() is DateTimeParseException)
    }

    @Test
    fun `GIVEN a malformed date string WHEN formatted THEN returns null and reports a DateTimeParseException`() {
        val captured = mutableListOf<Exception>()

        val formatted = IsoPromoDeadline("not-a-date").formatPromoDateOrCatch(captured::add)

        assertNull(formatted)
        assertEquals(1, captured.size)
        assertTrue(captured.single() is DateTimeParseException)
    }

    @Test
    fun `GIVEN a non-ISO date format WHEN formatted THEN returns null and reports a DateTimeParseException`() {
        val captured = mutableListOf<Exception>()

        val formatted = IsoPromoDeadline("09/30/2026").formatPromoDateOrCatch(captured::add)

        assertNull(formatted)
        assertEquals(1, captured.size)
        assertTrue(captured.single() is DateTimeParseException)
    }

    @Test
    fun `GIVEN an empty date string WHEN formatted THEN returns null and reports a DateTimeParseException`() {
        val captured = mutableListOf<Exception>()

        val formatted = IsoPromoDeadline("").formatPromoDateOrCatch(captured::add)

        assertNull(formatted)
        assertEquals(1, captured.size)
        assertTrue(captured.single() is DateTimeParseException)
    }
}
