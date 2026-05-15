/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.app.Activity
import android.app.Application
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.support.test.mock
import mozilla.components.support.utils.FakeDateTimeProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.utils.Settings
import java.text.SimpleDateFormat
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.Calendar
import java.util.Locale

class DefaultMetricsStorageTest {

    private val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val calendarStart = Calendar.getInstance(Locale.US)
    private val dayMillis: Long = 1000 * 60 * 60 * 24
    private val usageThresholdMillis: Long = 340 * 1000

    private var checkDefaultBrowser = false
    private val doCheckDefaultBrowser = { checkDefaultBrowser }
    private var shouldSendGenerally = true
    private val doShouldSendGenerally = { shouldSendGenerally }
    private var installTime = 0L
    private val doGetInstallTime = { installTime }

    private val todaysDate = LocalDate.of(2026, 2, 6)
    private val currentTimeMillis = todaysDate.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli()

    private val settings = mockk<Settings>()

    private val dispatcher = StandardTestDispatcher()

    private lateinit var storage: DefaultMetricsStorage

    @Before
    fun setup() {
        checkDefaultBrowser = false
        shouldSendGenerally = true
        installTime = System.currentTimeMillis()

        every { settings.firstWeekDaysOfUseGrowthData } returns setOf()
        every { settings.firstWeekDaysOfUseGrowthData = any() } returns Unit

        storage = DefaultMetricsStorage(
            context = mockk(),
            settings = settings,
            checkDefaultBrowser = doCheckDefaultBrowser,
            shouldSendGenerally = doShouldSendGenerally,
            getInstalledTime = doGetInstallTime,
            dispatcher = dispatcher,
            dateTimeProvider = FakeDateTimeProvider(),
        )
    }

    @Test
    fun `GIVEN that events should not be generally sent WHEN event would be tracked THEN it is not`() = runTest(dispatcher) {
        shouldSendGenerally = false
        checkDefaultBrowser = true
        every { settings.setAsDefaultGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.SetAsDefault)

        assertFalse(result)
    }

    @Test
    fun `GIVEN set as default has not been sent and app is not default WHEN checked for sending THEN will not be sent`() = runTest(dispatcher) {
        every { settings.setAsDefaultGrowthSent } returns false
        checkDefaultBrowser = false

        val result = storage.shouldTrack(Event.GrowthData.SetAsDefault)

        assertFalse(result)
    }

    @Test
    fun `GIVEN set as default has not been sent and app is default WHEN checked for sending THEN will be sent`() = runTest(dispatcher) {
        every { settings.setAsDefaultGrowthSent } returns false
        checkDefaultBrowser = true

        val result = storage.shouldTrack(Event.GrowthData.SetAsDefault)

        assertTrue(result)
    }

    @Test
    fun `GIVEN set as default has been sent and app is default WHEN checked for sending THEN will be not sent`() = runTest(dispatcher) {
        every { settings.setAsDefaultGrowthSent } returns true
        checkDefaultBrowser = true

        val result = storage.shouldTrack(Event.GrowthData.SetAsDefault)

        assertFalse(result)
    }

    @Test
    fun `WHEN set as default updated THEN settings will be updated accordingly`() = runTest(dispatcher) {
        val updateSlot = slot<Boolean>()
        every { settings.setAsDefaultGrowthSent = capture(updateSlot) } returns Unit

        storage.updateSentState(Event.GrowthData.SetAsDefault)

        assertTrue(updateSlot.captured)
    }

    @Test
    fun `GIVEN that app has been used for less than 3 days in a row WHEN checked for first week activity THEN event will not be sent`() = runTest(dispatcher) {
        val tomorrow = calendarStart.createNextDay()
        every { settings.firstWeekDaysOfUseGrowthData = any() } returns Unit
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf(calendarStart, tomorrow).toStrings()
        every { settings.firstWeekSeriesGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertFalse(result)
    }

    @Test
    fun `GIVEN that app has only been used for 3 days in a row WHEN checked for first week activity THEN event will be sent`() = runTest(dispatcher) {
        val tomorrow = calendarStart.createNextDay()
        val thirdDay = tomorrow.createNextDay()
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf(calendarStart, tomorrow, thirdDay).toStrings()
        every { settings.firstWeekSeriesGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertTrue(result)
    }

    @Test
    fun `GIVEN that app has been used for 3 days but not consecutively WHEN checked for first week activity THEN event will be not sent`() = runTest(dispatcher) {
        val tomorrow = calendarStart.createNextDay()
        val fourDaysFromNow = tomorrow.createNextDay().createNextDay()
        every { settings.firstWeekDaysOfUseGrowthData = any() } returns Unit
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf(calendarStart, tomorrow, fourDaysFromNow).toStrings()
        every { settings.firstWeekSeriesGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertFalse(result)
    }

    @Test
    fun `GIVEN that app has been used for 3 days consecutively but not within first week WHEN checked for first week activity THEN event will be not sent`() = runTest(dispatcher) {
        val tomorrow = calendarStart.createNextDay()
        val thirdDay = tomorrow.createNextDay()
        val installTime9DaysEarlier = calendarStart.timeInMillis - (dayMillis * 9)
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf(calendarStart, tomorrow, thirdDay).toStrings()
        every { settings.firstWeekSeriesGrowthSent } returns false
        installTime = installTime9DaysEarlier

        val result = storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertFalse(result)
    }

    @Test
    fun `GIVEN that first week activity has already been sent WHEN checked for first week activity THEN event will be not sent`() = runTest(dispatcher) {
        val tomorrow = calendarStart.createNextDay()
        val thirdDay = tomorrow.createNextDay()
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf(calendarStart, tomorrow, thirdDay).toStrings()
        every { settings.firstWeekSeriesGrowthSent } returns true

        val result = storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertFalse(result)
    }

    @Test
    fun `GIVEN that first week activity is not sent WHEN checked to send THEN current day is added to rolling days`() = runTest(dispatcher) {
        val captureRolling = slot<Set<String>>()
        val previousDay = calendarStart.createPreviousDay()
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf(previousDay).toStrings()
        every { settings.firstWeekDaysOfUseGrowthData = capture(captureRolling) } returns Unit
        every { settings.firstWeekSeriesGrowthSent } returns false

        storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertTrue(captureRolling.captured.contains(formatter.format(calendarStart.time)))
    }

    @Test
    fun `WHEN first week activity state updated THEN settings updated accordingly`() = runTest(dispatcher) {
        val captureSent = slot<Boolean>()
        every { settings.firstWeekSeriesGrowthSent } returns false
        every { settings.firstWeekSeriesGrowthSent = capture(captureSent) } returns Unit

        storage.updateSentState(Event.GrowthData.FirstWeekSeriesActivity)

        assertTrue(captureSent.captured)
    }

    @Test
    fun `GIVEN not yet in recording window WHEN checking to track THEN days of use still updated`() = runTest(dispatcher) {
        shouldSendGenerally = false
        val captureSlot = slot<Set<String>>()
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf()
        every { settings.firstWeekDaysOfUseGrowthData = capture(captureSlot) } returns Unit

        storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertTrue(captureSlot.captured.isNotEmpty())
    }

    @Test
    fun `GIVEN outside first week after install WHEN checking to track THEN days of use is not updated`() = runTest(dispatcher) {
        val captureSlot = slot<Set<String>>()
        every { settings.firstWeekDaysOfUseGrowthData } returns setOf()
        every { settings.firstWeekDaysOfUseGrowthData = capture(captureSlot) } returns Unit
        installTime = calendarStart.timeInMillis - (dayMillis * 9)

        storage.shouldTrack(Event.GrowthData.FirstWeekSeriesActivity)

        assertFalse(captureSlot.isCaptured)
    }

    @Test
    fun `GIVEN serp ad clicked event already sent WHEN checking to track serp ad clicked THEN event will not be sent`() = runTest(dispatcher) {
        every { settings.adClickGrowthSent } returns true

        val result = storage.shouldTrack(Event.GrowthData.SerpAdClicked)

        assertFalse(result)
    }

    @Test
    fun `GIVEN serp ad clicked event not sent WHEN checking to track serp ad clicked THEN event will be sent`() = runTest(dispatcher) {
        every { settings.adClickGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.SerpAdClicked)

        assertTrue(result)
    }

    @Test
    fun `GIVEN usage time has not passed threshold and has not been sent WHEN checking to track THEN event will not be sent`() = runTest(dispatcher) {
        every { settings.usageTimeGrowthData } returns usageThresholdMillis - 1
        every { settings.usageTimeGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.UsageThreshold)

        assertFalse(result)
    }

    @Test
    fun `GIVEN usage time has passed threshold and has not been sent WHEN checking to track THEN event will be sent`() = runTest(dispatcher) {
        every { settings.usageTimeGrowthData } returns usageThresholdMillis + 1
        every { settings.usageTimeGrowthSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.UsageThreshold)

        assertTrue(result)
    }

    @Test
    fun `GIVEN usage time growth has not been sent and within first day WHEN registering as usage recorder THEN will be registered`() {
        val application = mockk<Application>()
        every { settings.usageTimeGrowthSent } returns false
        every { application.registerActivityLifecycleCallbacks(any()) } returns Unit

        storage.tryRegisterAsUsageRecorder(application)

        verify { application.registerActivityLifecycleCallbacks(any()) }
    }

    @Test
    fun `GIVEN usage time growth has not been sent and not within first day WHEN registering as usage recorder THEN will not be registered`() {
        val application = mockk<Application>()
        installTime = System.currentTimeMillis() - dayMillis * 2
        every { settings.usageTimeGrowthSent } returns false

        storage.tryRegisterAsUsageRecorder(application)

        verify(exactly = 0) { application.registerActivityLifecycleCallbacks(any()) }
    }

    @Test
    fun `GIVEN usage time growth has been sent WHEN registering as usage recorder THEN will not be registered`() {
        val application = mockk<Application>()
        every { settings.usageTimeGrowthSent } returns true

        storage.tryRegisterAsUsageRecorder(application)

        verify(exactly = 0) { application.registerActivityLifecycleCallbacks(any()) }
    }

    @Test
    fun `WHEN updating usage state THEN storage will be delegated to settings`() {
        val initial = 10L
        val update = 15L
        val slot = slot<Long>()
        every { settings.usageTimeGrowthData } returns initial
        every { settings.usageTimeGrowthData = capture(slot) } returns Unit

        storage.updateUsageState(update)

        assertEquals(slot.captured, initial + update)
    }

    @Test
    fun `WHEN usage recorder receives onResume and onPause callbacks THEN it will store usage length`() {
        val storage = mockk<MetricsStorage>()
        val activity = mockk<Activity>()
        val slot = slot<Long>()
        every { storage.updateUsageState(capture(slot)) } returns Unit
        every { activity.componentName } returns mock()

        val usageRecorder = DefaultMetricsStorage.UsageRecorder(storage)
        val startTime = System.currentTimeMillis()

        usageRecorder.onActivityResumed(activity)
        usageRecorder.onActivityPaused(activity)
        val stopTime = System.currentTimeMillis()

        assertTrue(slot.captured < stopTime - startTime)
    }

    @Test
    fun `GIVEN that it has been less than 24 hours since last resumed sent WHEN checked for sending THEN will not be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        every { settings.resumeGrowthLastSent } returns currentTime

        val result = storage.shouldTrack(Event.GrowthData.FirstAppOpenForDay)

        assertFalse(result)
    }

    @Test
    fun `GIVEN that it has been more than 24 hours since last resumed sent WHEN checked for sending THEN will be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis + 1)
        every { settings.resumeGrowthLastSent } returns currentTime - 1000 * 60 * 60 * 24 * 2

        val result = storage.shouldTrack(Event.GrowthData.FirstAppOpenForDay)

        assertTrue(result)
    }

    @Test
    fun `WHEN last resumed state updated THEN settings updated accordingly`() = runTest(dispatcher) {
        val updateSlot = slot<Long>()
        every { settings.resumeGrowthLastSent } returns 0
        every { settings.resumeGrowthLastSent = capture(updateSlot) } returns Unit

        storage.updateSentState(Event.GrowthData.FirstAppOpenForDay)

        assertTrue(updateSlot.captured > 0)
    }

    @Test
    fun `GIVEN that it has been less than 24 hours since uri load sent WHEN checked for sending THEN will not be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        every { settings.uriLoadGrowthLastSent } returns currentTime

        val result = storage.shouldTrack(Event.GrowthData.FirstUriLoadForDay)

        assertFalse(result)
    }

    @Test
    fun `GIVEN that it has been more than 24 hours since uri load sent WHEN checked for sending THEN will be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis + 1)
        every { settings.uriLoadGrowthLastSent } returns currentTime - 1000 * 60 * 60 * 24 * 2

        val result = storage.shouldTrack(Event.GrowthData.FirstUriLoadForDay)

        assertTrue(result)
    }

    @Test
    fun `WHEN uri load updated THEN settings updated accordingly`() = runTest(dispatcher) {
        val updateSlot = slot<Long>()
        every { settings.uriLoadGrowthLastSent } returns 0
        every { settings.uriLoadGrowthLastSent = capture(updateSlot) } returns Unit

        storage.updateSentState(Event.GrowthData.FirstUriLoadForDay)

        assertTrue(updateSlot.captured > 0)
    }

    @Test
    fun `GIVEN first week activated days of use and search use thresholds reached THEN will be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 5)
        every { settings.growthEarlyUseCount.value } returns 3
        every { settings.growthEarlySearchUsed } returns true
        every { settings.growthUserActivatedSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.UserActivated(fromSearch = false))

        assertTrue(result)
    }

    @Test
    fun `GIVEN first week activated days of use threshold not reached THEN will not be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 5)
        every { settings.growthEarlyUseCount.value } returns 1
        every { settings.growthEarlySearchUsed } returns true
        every { settings.growthUserActivatedSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.UserActivated(fromSearch = false))

        assertFalse(result)
    }

    @Test
    fun `GIVEN first week activated search use threshold not reached THEN will not be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 5)
        every { settings.growthEarlyUseCount.value } returns 3
        every { settings.growthEarlySearchUsed } returns false
        every { settings.growthUserActivatedSent } returns false

        val result = storage.shouldTrack(Event.GrowthData.UserActivated(fromSearch = false))

        assertFalse(result)
    }

    @Test
    fun `GIVEN first week activated already sent WHEN first week activated signal sent THEN userActivated will not be sent`() = runTest(dispatcher) {
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 5)
        every { settings.growthEarlyUseCount.value } returns 3
        every { settings.growthEarlySearchUsed } returns true
        every { settings.growthUserActivatedSent } returns true

        val result = storage.shouldTrack(Event.GrowthData.UserActivated(fromSearch = false))

        assertFalse(result)
    }

    @Test
    fun `WHEN first week usage signal is sent a full day after last sent THEN settings will be updated accordingly`() = runTest(dispatcher) {
        val captureSent = slot<Long>()
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 3)
        every { settings.growthEarlyUseCount.value } returns 1
        every { settings.growthEarlyUseCount.increment() } just Runs
        every { settings.growthEarlyUseCountLastIncrement } returns 0L
        every { settings.growthEarlyUseCountLastIncrement = capture(captureSent) } returns Unit

        storage.updatePersistentState(Event.GrowthData.UserActivated(fromSearch = false))

        assertTrue(captureSent.captured > 0L)
    }

    @Test
    fun `WHEN first week usage signal is sent less than a full day after last sent THEN settings will not be updated`() = runTest(dispatcher) {
        val captureSent = slot<Long>()
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 3)
        val lastUsageIncrementTime = currentTime - (dayMillis / 2)
        every { settings.growthEarlyUseCount.value } returns 1
        every { settings.growthEarlyUseCountLastIncrement } returns lastUsageIncrementTime
        every { settings.growthEarlyUseCountLastIncrement = capture(captureSent) } returns Unit

        storage.updatePersistentState(Event.GrowthData.UserActivated(fromSearch = false))

        assertFalse(captureSent.isCaptured)
    }

    @Test
    fun `WHEN first week search activity is sent in second half of first week THEN settings will be updated`() = runTest(dispatcher) {
        val captureSent = slot<Boolean>()
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 3) - 100
        every { settings.growthEarlySearchUsed } returns false
        every { settings.growthEarlySearchUsed = capture(captureSent) } returns Unit

        storage.updatePersistentState(Event.GrowthData.UserActivated(fromSearch = true))

        assertTrue(captureSent.captured)
    }

    @Test
    fun `WHEN first week search activity is sent in first half of first week THEN settings will not be updated`() = runTest(dispatcher) {
        val captureSent = slot<Boolean>()
        val currentTime = System.currentTimeMillis()
        installTime = currentTime - (dayMillis * 3) + 100
        every { settings.growthEarlySearchUsed } returns false
        every { settings.growthEarlySearchUsed = capture(captureSent) } returns Unit

        storage.updatePersistentState(Event.GrowthData.UserActivated(fromSearch = true))

        assertFalse(captureSent.isCaptured)
    }

    // shouldTrackFirstWeekLastDaysActivity
    @Test
    fun `GIVEN activity on 5th day of the first week WHEN checking for last days activity THEN return true`() {
        installTime = currentTimeMillis
        val fifthDayMillis = installTime + (dayMillis * 4)

        val result = storage.shouldTrackFirstWeekLastDaysActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(fifthDayMillis).toDateStrings(),
            currentTime = fifthDayMillis,
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN activity on 7th day of the first week WHEN checking for last days activity THEN return true`() {
        installTime = currentTimeMillis
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.shouldTrackFirstWeekLastDaysActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(seventhDayMillis).toDateStrings(),
            currentTime = seventhDayMillis,
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN no activity in the last 3 days of the first week WHEN checking for last days activity THEN return false`() {
        installTime = currentTimeMillis
        val fourthDayMillis = installTime + (dayMillis * 3)

        val result = storage.shouldTrackFirstWeekLastDaysActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(fourthDayMillis).toDateStrings(),
            currentTime = fourthDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN activity in last 3 days but event already sent WHEN checking for last days activity THEN return false`() {
        installTime = currentTimeMillis
        val sixthDayMillis = installTime + (dayMillis * 5)

        val result = storage.shouldTrackFirstWeekLastDaysActivity(
            eventSent = true,
            firstWeekDaysOfUse = setOf(sixthDayMillis).toDateStrings(),
            currentTime = sixthDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN no activity in last 3 days of first week but outside of it WHEN checking for last days activity THEN return false`() {
        installTime = currentTimeMillis
        val eighthDayMillis = installTime + (dayMillis * 7)

        val result = storage.shouldTrackFirstWeekLastDaysActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(eighthDayMillis).toDateStrings(),
            currentTime = eighthDayMillis,
        )

        assertFalse(result)
    }

    // shouldTrackFirstWeekRecurrentlyActivity
    @Test
    fun `GIVEN minimum of 2 days of activity in first and second half of the week WHEN checking for recurrent activity THEN return true`() {
        installTime = currentTimeMillis
        val firstDayMillis = installTime
        val fourthDayMillis = installTime + (dayMillis * 3)
        val fifthDayMillis = installTime + (dayMillis * 4)
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.shouldTrackFirstWeekRecurrentlyActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(
                firstDayMillis,
                fourthDayMillis,
                fifthDayMillis,
                seventhDayMillis,
            ).toDateStrings(),
            currentTime = seventhDayMillis,
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN activity only in first half of the week WHEN checking for recurrent activity THEN return false`() {
        installTime = currentTimeMillis
        val firstDayMillis = installTime
        val fourthDayMillis = installTime + (dayMillis * 3)
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.shouldTrackFirstWeekRecurrentlyActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(firstDayMillis, fourthDayMillis).toDateStrings(),
            currentTime = seventhDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN activity only in second half of the week WHEN checking for recurrent activity THEN return false`() {
        installTime = currentTimeMillis
        val fifthDayMillis = installTime + (dayMillis * 4)
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.shouldTrackFirstWeekRecurrentlyActivity(
            eventSent = false,
            firstWeekDaysOfUse = setOf(fifthDayMillis, seventhDayMillis).toDateStrings(),
            currentTime = seventhDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN activity in both halves but event already sent WHEN checking for recurrent activity THEN return false`() {
        installTime = currentTimeMillis
        val firstDayMillis = installTime
        val secondDayMillis = installTime + dayMillis
        val fifthDayMillis = installTime + (dayMillis * 4)
        val sixthDayMillis = installTime + (dayMillis * 5)
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.shouldTrackFirstWeekRecurrentlyActivity(
            eventSent = true,
            firstWeekDaysOfUse = setOf(
                firstDayMillis,
                secondDayMillis,
                fifthDayMillis,
                sixthDayMillis,
                seventhDayMillis,
            ).toDateStrings(),
            currentTime = seventhDayMillis,
        )

        assertFalse(result)
    }

    // shouldTrackFirstWeekFullActivityDefault
    @Test
    fun `GIVEN activity every day and set as default in first 4 days WHEN checking for full activity default THEN return true`() {
        installTime = currentTimeMillis
        val days = (0..6).map { (installTime + (it * dayMillis)) }.toSet().toDateStrings()
        val seventhDayMillis = installTime + (6 * dayMillis)

        val result = storage.shouldTrackFirstWeekFullActivityDefault(
            eventSent = false,
            isBrowserSetToDefaultDuringFirstFourDays = true,
            firstWeekDaysOfUse = days,
            currentTime = seventhDayMillis,
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN activity only 5 days WHEN checking for full activity default THEN return false`() {
        installTime = currentTimeMillis
        val days = (0..4).map { (installTime + (it * dayMillis)) }.toSet().toDateStrings()
        val seventhDayMillis = installTime + (6 * dayMillis)

        val result = storage.shouldTrackFirstWeekFullActivityDefault(
            eventSent = false,
            isBrowserSetToDefaultDuringFirstFourDays = true,
            firstWeekDaysOfUse = days,
            currentTime = seventhDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN activity only 6 days WHEN checking for full activity default on 8th day THEN return false`() {
        installTime = currentTimeMillis
        val days = (0..5).map { (installTime + (it * dayMillis)) }.toSet().toDateStrings()
        val eighthDayMillis = installTime + (7 * dayMillis)

        val result = storage.shouldTrackFirstWeekFullActivityDefault(
            eventSent = false,
            isBrowserSetToDefaultDuringFirstFourDays = true,
            firstWeekDaysOfUse = days,
            currentTime = eighthDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN not set as default in first 4 days WHEN checking for full activity default THEN return false`() {
        installTime = currentTimeMillis
        val days = (0..6).map { (installTime + (it * dayMillis)) }.toSet().toDateStrings()
        val seventhDayMillis = installTime + (6 * dayMillis)

        val result = storage.shouldTrackFirstWeekFullActivityDefault(
            eventSent = false,
            isBrowserSetToDefaultDuringFirstFourDays = false,
            firstWeekDaysOfUse = days,
            currentTime = seventhDayMillis,
        )

        assertFalse(result)
    }

    @Test
    fun `GIVEN activity every day and set as default in first 4 days but event already sent WHEN checking for full activity default THEN return false`() {
        installTime = currentTimeMillis
        val days = (0..6).map { (installTime + (it * dayMillis)) }.toSet().toDateStrings()
        val seventhDayMillis = installTime + (6 * dayMillis)

        val result = storage.shouldTrackFirstWeekFullActivityDefault(
            eventSent = true,
            isBrowserSetToDefaultDuringFirstFourDays = true,
            firstWeekDaysOfUse = days,
            currentTime = seventhDayMillis,
        )

        assertFalse(result)
    }

    // activeInFirstPartOfTheWeek
    @Test
    fun `GIVEN 2 active days in the first 4 days WHEN checking activeInFirstPartOfTheWeek THEN return true`() {
        installTime = currentTimeMillis
        val firstDayMillis = installTime
        val fourthDayMillis = installTime + (dayMillis * 3)

        val result = storage.activeInFirstPartOfTheWeek(
            setOf(
                firstDayMillis,
                fourthDayMillis,
            ).toDateStrings(),
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN 1 active day in the first 4 days WHEN checking activeInFirstPartOfTheWeek THEN return false`() {
        installTime = currentTimeMillis
        val firstDayMillis = installTime

        val result = storage.activeInFirstPartOfTheWeek(setOf(firstDayMillis).toDateStrings())

        assertFalse(result)
    }

    @Test
    fun `GIVEN 2 active days but none in the first 4 days WHEN checking activeInFirstPartOfTheWeek THEN return false`() {
        installTime = currentTimeMillis
        val sixthDayMillis = installTime + (dayMillis * 5)
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.activeInFirstPartOfTheWeek(
            setOf(
                sixthDayMillis,
                seventhDayMillis,
            ).toDateStrings(),
        )

        assertFalse(result)
    }

    // activeInLastPartOfTheWeek
    @Test
    fun `GIVEN 2 active days in the last 3 days WHEN checking activeInLastPartOfTheWeek THEN return true`() {
        installTime = currentTimeMillis
        val fifthDayMillis = installTime + (dayMillis * 4)
        val seventhDayMillis = installTime + (dayMillis * 6)

        val result = storage.activeInLastPartOfTheWeek(
            setOf(
                fifthDayMillis,
                seventhDayMillis,
            ).toDateStrings(),
        )

        assertTrue(result)
    }

    @Test
    fun `GIVEN 1 active day in the last 3 days WHEN checking activeInLastPartOfTheWeek THEN return false`() {
        installTime = currentTimeMillis
        val fifthDayMillis = installTime + (dayMillis * 4)

        val result = storage.activeInLastPartOfTheWeek(setOf(fifthDayMillis).toDateStrings())

        assertFalse(result)
    }

    @Test
    fun `GIVEN 2 active days but none in the last 3 days WHEN checking activeInLastPartOfTheWeek THEN return false`() {
        installTime = currentTimeMillis
        val firstDayMillis = installTime
        val secondDayMillis = installTime + dayMillis

        val result = storage.activeInLastPartOfTheWeek(
            setOf(
                firstDayMillis,
                secondDayMillis,
            ).toDateStrings(),
        )

        assertFalse(result)
    }

    // updateIsDefaultBrowserDuringFirstFourDays
    @Test
    fun `GIVEN app is default browser within first 4 days WHEN updating THEN setting is updated`() {
        installTime = currentTimeMillis
        every {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        } returns Unit
        val secondDayMillis = installTime + dayMillis

        storage.updateIsDefaultBrowserDuringFirstFourDays(
            isDefaultBrowserDuringFirstFourDay = false,
            isDefaultBrowser = true,
            currentTime = secondDayMillis,
        )

        verify { settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = true }
    }

    @Test
    fun `GIVEN app is not default browser within first 4 days WHEN updating THEN setting is not updated`() {
        installTime = currentTimeMillis
        every {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        } returns Unit
        val secondDayMillis = installTime + dayMillis

        storage.updateIsDefaultBrowserDuringFirstFourDays(
            isDefaultBrowserDuringFirstFourDay = false,
            isDefaultBrowser = false,
            currentTime = secondDayMillis,
        )

        verify(exactly = 0) {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        }
    }

    @Test
    fun `GIVEN browser not set to default during first 4 days WHEN it is set to default on fifth day THEN the setting is not updated`() {
        installTime = currentTimeMillis
        every {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        } returns Unit
        val fourthDayMillis = installTime + (dayMillis * 3)
        val fifthDayMillis = installTime + (dayMillis * 4)

        storage.updateIsDefaultBrowserDuringFirstFourDays(
            isDefaultBrowserDuringFirstFourDay = false,
            isDefaultBrowser = false,
            currentTime = fourthDayMillis,
        )

        verify(exactly = 0) {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        }

        storage.updateIsDefaultBrowserDuringFirstFourDays(
            isDefaultBrowserDuringFirstFourDay = false,
            isDefaultBrowser = true,
            currentTime = fifthDayMillis,
        )

        verify(exactly = 0) {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        }
    }

    @Test
    fun `GIVEN setting is already true WHEN updating THEN setting is not updated again`() {
        installTime = currentTimeMillis
        every {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        } returns Unit
        val secondDayMillis = installTime + dayMillis

        storage.updateIsDefaultBrowserDuringFirstFourDays(
            isDefaultBrowserDuringFirstFourDay = true,
            isDefaultBrowser = true,
            currentTime = secondDayMillis,
        )

        verify(exactly = 0) {
            settings.firstWeekPostInstallIsBrowserSetToDefaultDuringFirstFourDays = any()
        }
    }

    private fun Calendar.copy() = clone() as Calendar
    private fun Calendar.createNextDay() = copy().apply {
        add(Calendar.DAY_OF_MONTH, 1)
    }
    private fun Calendar.createPreviousDay() = copy().apply {
        add(Calendar.DAY_OF_MONTH, -1)
    }

    private fun Set<Calendar>.toStrings() = map {
        formatter.format(it.time)
    }.toSet()

    private fun Set<Long>.toDateStrings() = map {
        formatter.format(it).toString()
    }.toSet()
}
