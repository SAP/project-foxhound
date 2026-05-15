/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.creditcards.ui

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Provider for calendar data used in the credit card editor
 */
interface CalendarDataProvider {

    /**
     * Returns a list of months.
     *
     * @return a list of months
     */
    fun months(): List<String>

    /**
     * Returns a list of years supported by the credit expiry card year field.
     *
     * @return a list of years
     */
    fun years(): List<String>

    /**
     * Returns a list of years supported by the credit expiry card year field.
     *
     * @param startYear The start year to use for the list of years.
     * @return a list of years
     */
    fun years(startYear: Long): List<String>
}

/**
 * Default implementation of [CalendarDataProvider] using [Calendar]
 *
 * @param dateFormat The [SimpleDateFormat] to use for formatting the dates.
 */
class DefaultCalendarDataProvider(
    private val dateFormat: SimpleDateFormat = SimpleDateFormat("MMMM (MM)", Locale.getDefault()),
) : CalendarDataProvider {

    override fun months(): List<String> {
        val calendar = Calendar.getInstance()
        return buildList {
            calendar.set(Calendar.DAY_OF_MONTH, 1)

            for (month in 0..NUMBER_OF_MONTHS) {
                calendar.set(Calendar.MONTH, month)
                add(dateFormat.format(calendar.time))
            }
        }
    }

    override fun years(): List<String> {
        val calendar = Calendar.getInstance()
        val startYear = calendar.get(Calendar.YEAR)
        return years(startYear = startYear.toLong())
    }

    override fun years(startYear: Long): List<String> {
        val endYear = startYear + NUMBER_OF_YEARS_TO_SHOW
        return buildList {
            for (year in startYear..endYear + NUMBER_OF_YEARS_TO_SHOW) {
                add(year.toString())
            }
        }
    }
}

/**
 * Number of months in a year (0-indexed).
 */
private const val NUMBER_OF_MONTHS = 11

/**
 * Number of years to show in the credit card expiry year field.
 */
private const val NUMBER_OF_YEARS_TO_SHOW = 10
