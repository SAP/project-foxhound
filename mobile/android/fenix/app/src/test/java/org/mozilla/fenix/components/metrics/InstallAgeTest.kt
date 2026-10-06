package org.mozilla.fenix.components.metrics

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.Locale

class InstallAgeTest {
    private val dayMillis: Long = 1000 * 60 * 60 * 24

    private val installedTime: Long = Calendar.getInstance(Locale.US).apply {
        set(2026, Calendar.FEBRUARY, 6, 12, 0, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    private val installAge = InstallAge(installedTime)

    @Test
    fun `GIVEN time is within 24 hours WHEN checking isDuringFirstDay THEN return true`() {
        val testTime = installedTime + (dayMillis / 2)
        assertTrue(installAge.isDuringFirstDay(testTime))
    }

    @Test
    fun `GIVEN time is past 24 hours WHEN checking isDuringFirstDay THEN return false`() {
        val testTime = installedTime + (dayMillis * 2)
        assertFalse(installAge.isDuringFirstDay(testTime))
    }

    @Test
    fun `GIVEN time is past 24 hours WHEN checking isAfterFirstDay THEN return true`() {
        val testTime = installedTime + (dayMillis * 2)
        assertTrue(installAge.isAfterFirstDay(testTime))
    }

    @Test
    fun `GIVEN time is within 24 hours WHEN checking isAfterFirstDay THEN return false`() {
        val testTime = installedTime + (dayMillis / 2)
        assertFalse(installAge.isAfterFirstDay(testTime))
    }

    @Test
    fun `GIVEN time is past 3 days WHEN checking isAfterThirdDay THEN return true`() {
        val testTime = installedTime + (dayMillis * 4)
        assertTrue(installAge.isAfterThirdDay(testTime))
    }

    @Test
    fun `GIVEN time is within 3 days WHEN checking isAfterThirdDay THEN return false`() {
        val testTime = installedTime + (dayMillis * 2)
        assertFalse(installAge.isAfterThirdDay(testTime))
    }

    @Test
    fun `GIVEN time is within 8 days window WHEN checking isDuringFirstWeek THEN return true`() {
        val testTime = installedTime + (dayMillis * 7)
        assertTrue(installAge.isDuringFirstWeek(testTime))
    }

    @Test
    fun `GIVEN time is past 8 days window WHEN checking isDuringFirstWeek THEN return false`() {
        val testTime = installedTime + (dayMillis * 9)
        assertFalse(installAge.isDuringFirstWeek(testTime))
    }

    @Test
    fun `GIVEN time is within 4 days from install midnight WHEN checking isDuringFirstFourDays THEN return true`() {
        val testTime = installedTime + (dayMillis * 3)
        assertTrue(installAge.isDuringFirstFourDays(testTime))
    }

    @Test
    fun `GIVEN time is past 4 days from install midnight WHEN checking isDuringFirstFourDays THEN return false`() {
        val testTime = installedTime + (dayMillis * 5)
        assertFalse(installAge.isDuringFirstFourDays(testTime))
    }

    @Test
    fun `GIVEN time is within 7 days from install midnight WHEN checking isDuringFirst7Days THEN return true`() {
        val testTime = installedTime + (dayMillis * 6)
        assertTrue(installAge.isDuringFirst7Days(testTime))
    }

    @Test
    fun `GIVEN time is past 7 days from install midnight WHEN checking isDuringFirst7Days THEN return false`() {
        val testTime = installedTime + (dayMillis * 8)
        assertFalse(installAge.isDuringFirst7Days(testTime))
    }

    @Test
    fun `GIVEN time is on the 6th day WHEN checking isDuringLastThreeDays THEN return true`() {
        val testTime = installedTime + (dayMillis * 5)
        assertTrue(installAge.isDuringLastThreeDays(testTime))
    }

    @Test
    fun `GIVEN time is in the first half of the week WHEN checking isDuringLastThreeDays THEN return false`() {
        val testTime = installedTime + dayMillis
        assertFalse(installAge.isDuringLastThreeDays(testTime))
    }

    @Test
    fun `GIVEN time is past the first 7 days WHEN checking isDuringLastThreeDays THEN return false`() {
        val testTime = installedTime + (dayMillis * 8)
        assertFalse(installAge.isDuringLastThreeDays(testTime))
    }

    @Test
    fun `GIVEN time is within 28 days WHEN checking isDuringFirstMonth THEN return true`() {
        val testTime = installedTime + (dayMillis * 25)
        assertTrue(installAge.isDuringFirstMonth(testTime))
    }

    @Test
    fun `GIVEN time is past 28 days WHEN checking isDuringFirstMonth THEN return false`() {
        val testTime = installedTime + (dayMillis * 30)
        assertFalse(installAge.isDuringFirstMonth(testTime))
    }
}
