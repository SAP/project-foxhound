/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.onboarding.continuous

import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.FakeDateTimeProvider
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.concurrent.TimeUnit

private val ONE_DAY_MILLIS = TimeUnit.DAYS.toMillis(1)

@RunWith(RobolectricTestRunner::class)
class ContinuousOnboardingStageProviderTest {

    private val day0Millis = LocalDate.of(2025, 1, 1).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
    private val day1Millis = day0Millis + ONE_DAY_MILLIS
    private val day2Millis = day0Millis + 2 * ONE_DAY_MILLIS
    private val day3Millis = day0Millis + 3 * ONE_DAY_MILLIS

    private lateinit var settings: Settings

    @Before
    fun setup() {
        settings = Settings(testContext)
        settings.onboardingCompletedTimestamp = day0Millis
    }

    @Test
    fun `WHEN initial onboarding not completed THEN get stage returns NONE`() {
        settings.onboardingCompletedTimestamp = -1L

        assertEquals(ContinuousOnboardingStage.NONE, getStage(day1Millis))
    }

    @Test
    fun `WHEN initial onboarding completed today and day 2 not shown THEN get stage returns NONE`() {
        assertEquals(ContinuousOnboardingStage.NONE, getStage(day0Millis))
    }

    @Test
    fun `WHEN initial onboarding completed 1 day ago and day 2 not shown THEN get stage returns DAY_2`() {
        assertEquals(ContinuousOnboardingStage.DAY_2, getStage(day1Millis))
    }

    @Test
    fun `WHEN initial onboarding completed 1 day ago and day 2 already shown THEN get stage returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis

        assertEquals(ContinuousOnboardingStage.NONE, getStage(day1Millis))
    }

    @Test
    fun `WHEN initial onboarding completed 3 days ago and day 2 not shown THEN get stage returns DAY_2`() {
        assertEquals(ContinuousOnboardingStage.DAY_2, getStage(day3Millis))
    }

    @Test
    fun `WHEN day 2 shown today and day 3 not shown THEN get stage returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis

        assertEquals(ContinuousOnboardingStage.NONE, getStage(day1Millis))
    }

    @Test
    fun `WHEN day 2 shown 1 day ago and day 3 not shown THEN get stage returns DAY_3`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis

        assertEquals(ContinuousOnboardingStage.DAY_3, getStage(day2Millis))
    }

    @Test
    fun `WHEN day 2 shown 2 days ago and day 3 not shown THEN get stage returns DAY_3`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis

        assertEquals(ContinuousOnboardingStage.DAY_3, getStage(day3Millis))
    }

    @Test
    fun `WHEN day 2 shown 1 day ago and day 3 already shown THEN get stage returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis

        assertEquals(
            ContinuousOnboardingStage.NONE,
            getStage(day2Millis + ONE_DAY_MILLIS),
        )
    }

    @Test
    fun `WHEN day 3 shown today and day 7 not shown THEN get stage returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis

        assertEquals(ContinuousOnboardingStage.NONE, getStage(day2Millis))
    }

    @Test
    fun `WHEN day 3 shown 3 days ago and day 7 not shown THEN get stage returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis

        assertEquals(
            ContinuousOnboardingStage.NONE,
            getStage(day2Millis + 3 * ONE_DAY_MILLIS),
        )
    }

    @Test
    fun `WHEN day 3 shown 4 days ago and day 7 not shown THEN get stage returns DAY_7`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis

        assertEquals(
            ContinuousOnboardingStage.DAY_7,
            getStage(day2Millis + 4 * ONE_DAY_MILLIS),
        )
    }

    @Test
    fun `WHEN day 3 shown 5 days ago and day 7 not shown THEN get stage returns DAY_7`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis

        assertEquals(
            ContinuousOnboardingStage.DAY_7,
            getStage(day2Millis + 5 * ONE_DAY_MILLIS),
        )
    }

    @Test
    fun `WHEN day 3 shown 4 days ago and day 7 already shown THEN get stage returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis
        settings.seventhDayOnboardingCompletedTimestamp = day2Millis + 4 * ONE_DAY_MILLIS

        assertEquals(
            ContinuousOnboardingStage.NONE,
            getStage(day2Millis + 4 * ONE_DAY_MILLIS),
        )
    }

    @Test
    fun `WHEN all stages completed THEN returns NONE`() {
        settings.secondDayOnboardingCompletedTimestamp = day1Millis
        settings.thirdDayOnboardingCompletedTimestamp = day2Millis
        settings.seventhDayOnboardingCompletedTimestamp = day2Millis + 4 * ONE_DAY_MILLIS

        assertEquals(
            ContinuousOnboardingStage.NONE,
            getStage(day2Millis + 10 * ONE_DAY_MILLIS),
        )
    }

    private fun getStage(currentTimeMillis: Long) = ContinuousOnboardingStageProviderDefault(
        settings = settings,
        dateTimeProvider = FakeDateTimeProvider(currentTime = currentTimeMillis),
        zoneId = ZoneOffset.UTC,
    ).getContinuousOnboardingStage()
}
