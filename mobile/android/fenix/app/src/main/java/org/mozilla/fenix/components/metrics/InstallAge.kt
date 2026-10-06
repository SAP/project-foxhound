/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import java.util.Calendar
import java.util.Locale

/**
 * Helper class to see how many days have passed since the user installed the app. This helps us know if the user is in
 * their first day, first week, or first month.
 */
internal class InstallAge(
    private val installedTime: Long,
) {

    /**
     * Holds the time when the installation day started (at 00:00 midnight).Used to calculate full calendar days instead
     * of exact hours.
     */
    private val installedTimeToMidnight = installedTime.toMidnight()

    fun isDuringFirstMonth(currentTime: Long) = currentTime < installedTime + SHORTEST_MONTH_MILLIS

    fun isAfterFirstDay(currentTime: Long) = currentTime > installedTime + DAY_MILLIS

    fun isDuringFirstDay(currentTime: Long) = currentTime < installedTime + DAY_MILLIS

    fun isAfterThirdDay(currentTime: Long) = currentTime > installedTime + THREE_DAY_MILLIS

    fun isDuringFirstWeek(currentTime: Long) = currentTime < installedTime + FULL_WEEK_MILLIS

    fun isDuringFirst7Days(currentTime: Long) = currentTime < installedTimeToMidnight + SEVEN_DAYS_MILLIS

    fun isDuringFirstFourDays(currentTime: Long) = currentTime < installedTimeToMidnight + FOUR_DAY_MILLIS

    /**
     * Checks if the user is currently in days 5, 6, or 7 of their first week.It counts from the midnight of the
     * installation day to stay accurate.
     */
    fun isDuringLastThreeDays(currentTime: Long) =
        currentTime >= installedTimeToMidnight + FOUR_DAY_MILLIS && isDuringFirst7Days(currentTime)

    /**
     * Changes any time to 00:00 midnight of that same day by removing hours, minutes, seconds, and milliseconds.
     */
    private fun Long.toMidnight(): Long = Calendar.getInstance(Locale.US).also { calendar ->
        calendar.timeInMillis = this
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    companion object {
        private const val DAY_MILLIS: Long = 1000 * 60 * 60 * 24
        private const val THREE_DAY_MILLIS: Long = 3 * DAY_MILLIS
        private const val FOUR_DAY_MILLIS: Long = 4 * DAY_MILLIS
        private const val SEVEN_DAYS_MILLIS: Long = 7 * DAY_MILLIS

        // Note this is 8 so that recording of FirstWeekSeriesActivity happens throughout the length
        // of the 7th day after install
        private const val FULL_WEEK_MILLIS: Long = DAY_MILLIS * 8

        /**
         * Set to 28 days because February is the shortest month. This makes monthly checks safe and predictable.
         */
        private const val SHORTEST_MONTH_MILLIS: Long = DAY_MILLIS * 28
    }
}
