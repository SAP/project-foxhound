/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import java.time.LocalDate
import java.time.ZoneId

/**
 * Interface for providing date and time information. This is useful for separating the
 * implementation of getting date and time from the rest of the code, making it easier to test
 * the code that uses date and time.
 */
interface DateTimeProvider {

    /**
     * Get the current local date.
     */
    fun currentLocalDate(): LocalDate

    /**
     * Get the current time zone.
     */
    fun currentZoneId(): ZoneId

    /**
     * Get the current time in milliseconds.
     */
    fun currentTimeMillis(): Long
}

/**
 * The default implementation of [DateTimeProvider].
 */
class DefaultDateTimeProvider : DateTimeProvider {

    override fun currentLocalDate(): LocalDate {
        return LocalDate.now()
    }

    override fun currentZoneId(): ZoneId {
        return ZoneId.systemDefault()
    }

    override fun currentTimeMillis(): Long {
        return System.currentTimeMillis()
    }
}
