/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CountdownCalculatorTest {

    private val now = Instant.parse("2026-04-22T00:00:00Z")
    private val nowMillis = now.toEpochMilli()

    @Test
    fun `GIVEN an invalid date string WHEN computing countdown THEN all values are zero`() = runTest {
        val result = countdownFlow("not-a-date", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN an empty string WHEN computing countdown THEN all values are zero`() = runTest {
        val result = countdownFlow("", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN a date without timezone designator WHEN computing countdown THEN all values are zero`() = runTest {
        val result = countdownFlow("2026-06-11T00:00:00", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN a date in the past WHEN computing countdown THEN all values are zero`() = runTest {
        val result = countdownFlow("2026-01-01T00:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN a date exactly equal to now WHEN computing countdown THEN all values are zero`() = runTest {
        val result = countdownFlow("2026-04-22T00:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN 59 seconds remaining WHEN computing countdown THEN all values are zero`() = runTest {
        val result = countdownFlow("2026-04-22T00:00:59Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN exactly 1 minute remaining WHEN computing countdown THEN mins is 01`() = runTest {
        val result = countdownFlow("2026-04-22T00:01:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "01"), result)
    }

    @Test
    fun `GIVEN exactly 59 minutes remaining WHEN computing countdown THEN mins is 59`() = runTest {
        val result = countdownFlow("2026-04-22T00:59:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "59"), result)
    }

    @Test
    fun `GIVEN exactly 1 hour remaining WHEN computing countdown THEN hours is 01 and mins is 00`() = runTest {
        val result = countdownFlow("2026-04-22T01:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "01", mins = "00"), result)
    }

    @Test
    fun `GIVEN exactly 23 hours remaining WHEN computing countdown THEN hours is 23 and mins is 00`() = runTest {
        val result = countdownFlow("2026-04-22T23:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "00", hours = "23", mins = "00"), result)
    }

    @Test
    fun `GIVEN exactly 1 day remaining WHEN computing countdown THEN days is 01 and hours and mins are 00`() = runTest {
        val result = countdownFlow("2026-04-23T00:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "01", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN exactly 30 days remaining WHEN computing countdown THEN days is 30`() = runTest {
        val result = countdownFlow("2026-05-22T00:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "30", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN 4 days 3 hours and 45 minutes remaining WHEN computing countdown THEN all values are correct`() =
        runTest {
            val result = countdownFlow("2026-04-26T03:45:00Z", clock = { nowMillis }).first()
            assertEquals(CountdownTime(days = "04", hours = "03", mins = "45"), result)
        }

    @Test
    fun `GIVEN 1 day 1 hour and 1 minute remaining WHEN computing countdown THEN all values are 01`() = runTest {
        val result = countdownFlow("2026-04-23T01:01:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "01", hours = "01", mins = "01"), result)
    }

    @Test
    fun `GIVEN single digit days hours and minutes WHEN computing countdown THEN all values have a leading zero`() =
        runTest {
            val result = countdownFlow("2026-04-25T02:05:00Z", clock = { nowMillis }).first()
            assertEquals(CountdownTime(days = "03", hours = "02", mins = "05"), result)
        }

    @Test
    fun `GIVEN the target date of 2026-06-11 WHEN computing countdown from 2026-04-22 THEN days is 50`() = runTest {
        val result = countdownFlow("2026-06-11T00:00:00Z", clock = { nowMillis }).first()
        assertEquals(CountdownTime(days = "50", hours = "00", mins = "00"), result)
    }

    @Test
    fun `GIVEN a future date WHEN the countdown expires THEN the flow terminates`() = runTest {
        var tick = nowMillis
        val oneMinuteLater = nowMillis + 60_000L
        val emissions = mutableListOf<CountdownTime>()

        countdownFlow("2026-04-22T00:01:00Z", clock = { tick }).collect {
            emissions.add(it)
            tick = oneMinuteLater
        }

        assertEquals(2, emissions.size)
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "01"), emissions[0])
        assertEquals(CountdownTime(days = "00", hours = "00", mins = "00"), emissions[1])
    }

    @Test
    fun `GIVEN today is before kickoff WHEN checking hasWorldCupStarted THEN returns false`() {
        assertFalse(hasWorldCupStarted(today = { LocalDate.of(2026, 6, 10) }))
    }

    @Test
    fun `GIVEN today is exactly the kickoff date WHEN checking hasWorldCupStarted THEN returns true`() {
        assertTrue(hasWorldCupStarted(today = { LocalDate.of(2026, 6, 11) }))
    }

    @Test
    fun `GIVEN today is after kickoff WHEN checking hasWorldCupStarted THEN returns true`() {
        assertTrue(hasWorldCupStarted(today = { LocalDate.of(2026, 7, 1) }))
    }

    @Test
    fun `GIVEN today is before the one-week window WHEN checking isOneWeekToWorldCup THEN returns false`() {
        assertFalse(isOneWeekToWorldCup(today = { LocalDate.of(2026, 6, 3) }))
    }

    @Test
    fun `GIVEN today is the start of the one-week window WHEN checking isOneWeekToWorldCup THEN returns true`() {
        assertTrue(isOneWeekToWorldCup(today = { LocalDate.of(2026, 6, 4) }))
    }

    @Test
    fun `GIVEN today is mid-window WHEN checking isOneWeekToWorldCup THEN returns true`() {
        assertTrue(isOneWeekToWorldCup(today = { LocalDate.of(2026, 6, 8) }))
    }

    @Test
    fun `GIVEN today is the day before kickoff WHEN checking isOneWeekToWorldCup THEN returns true`() {
        assertTrue(isOneWeekToWorldCup(today = { LocalDate.of(2026, 6, 10) }))
    }

    @Test
    fun `GIVEN today is the kickoff date WHEN checking isOneWeekToWorldCup THEN returns false`() {
        assertFalse(isOneWeekToWorldCup(today = { LocalDate.of(2026, 6, 11) }))
    }

    @Test
    fun `GIVEN today is after kickoff WHEN checking isOneWeekToWorldCup THEN returns false`() {
        assertFalse(isOneWeekToWorldCup(today = { LocalDate.of(2026, 7, 1) }))
    }

    @Test
    fun `GIVEN now is before the end instant WHEN checking hasWorldCupEnded THEN returns false`() {
        assertFalse(hasWorldCupEnded(now = { Instant.parse("2026-07-20T07:59:59Z") }))
    }

    @Test
    fun `GIVEN now is exactly the end instant WHEN checking hasWorldCupEnded THEN returns true`() {
        assertTrue(hasWorldCupEnded(now = { Instant.parse("2026-07-20T08:00:00Z") }))
    }

    @Test
    fun `GIVEN now is after the end instant WHEN checking hasWorldCupEnded THEN returns true`() {
        assertTrue(hasWorldCupEnded(now = { Instant.parse("2026-07-21T00:00:00Z") }))
    }
}
