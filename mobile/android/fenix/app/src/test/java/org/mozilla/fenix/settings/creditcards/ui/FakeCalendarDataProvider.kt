/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.creditcards.ui

class FakeCalendarDataProvider(
    var expectedMonths: List<String> = emptyList(),
    var expectedYears: List<String> = emptyList(),
) : CalendarDataProvider {
    override fun months(): List<String> {
        return expectedMonths
    }

    override fun years(): List<String> {
        return expectedYears
    }

    override fun years(startYear: Long): List<String> {
        return expectedYears
    }
}
