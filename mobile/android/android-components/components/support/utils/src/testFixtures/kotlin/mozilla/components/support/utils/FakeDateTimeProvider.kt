/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset

private val defaultDate = LocalDate.of(2025, 5, 31)

/**
 * A fake date time provider to be used for testing.
 */
class FakeDateTimeProvider(
    private val localDate: LocalDate = defaultDate,
    private val currentTime: Long = 0,
) : DateTimeProvider {

    override fun currentLocalDate(): LocalDate = localDate

    override fun currentZoneId(): ZoneId = ZoneOffset.UTC

    override fun currentTimeMillis(): Long = currentTime
}
