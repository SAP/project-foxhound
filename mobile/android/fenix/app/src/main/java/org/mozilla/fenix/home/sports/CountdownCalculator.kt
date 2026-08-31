/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

private const val MILLIS_PER_MINUTE = 60_000L
private const val MINS_PER_DAY = 1440L
private const val MINS_PER_HOUR = 60L
private const val ONE_WEEK_DAYS = 7L

/**
 * Date of the World Cup tournament kickoff. Use this for any local-date comparisons
 * (e.g. "is today after kickoff?") and to derive the ISO `yyyy-MM-dd` string accepted
 * by the Merino WCS `date` query parameter.
 */
val WORLD_CUP_KICKOFF: LocalDate = LocalDate.of(2026, 6, 11)

/**
 * Instant at which the World Cup widget is retired for everyone — the day after the final. After
 * this point the widget is hidden regardless of channel, experiment, or feature flag. A fixed UTC
 * instant (not a local date) so the cut-off happens at the same moment worldwide. See bug 2051431.
 */
val WORLD_CUP_END: Instant = Instant.parse("2026-07-20T08:00:00Z")

/**
 * True once the World Cup is over and the widget should no longer be shown — i.e. [now] is at or
 * past [WORLD_CUP_END].
 *
 * @param now Source of the current instant. Defaults to the device clock.
 */
fun hasWorldCupEnded(now: () -> Instant = Instant::now): Boolean =
    !now().isBefore(WORLD_CUP_END)

/**
 * ISO-8601 timestamp for the World Cup kickoff at midnight in the device's timezone.
 * Use this for the countdown widget's `dateIso` input so the countdown reaches zero
 * at the same instant [hasWorldCupStarted] flips to true.
 *
 * @param zone Timezone used to resolve midnight. Defaults to the device's timezone.
 */
fun worldCupKickoffCountdownTarget(zone: ZoneId = ZoneId.systemDefault()): String =
    WORLD_CUP_KICKOFF.atStartOfDay(zone).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)

internal fun countdownFlow(
    utcDate: String,
    clock: () -> Long = System::currentTimeMillis,
): Flow<CountdownTime> = flow {
    val epochMillis = parseUtcDate(utcDate)
    val formatter = NumberFormat.getIntegerInstance().apply {
        minimumIntegerDigits = 2
        isGroupingUsed = false
    }
    while (true) {
        val now = clock()
        emit(computeCountdown(epochMillis, now, formatter))

        if (epochMillis == null || now >= epochMillis) break

        delay(MILLIS_PER_MINUTE - now % MILLIS_PER_MINUTE)
    }
}

private fun computeCountdown(
    epochMillis: Long?,
    nowMillis: Long,
    formatter: NumberFormat,
): CountdownTime {
    val zero = formatter.format(0)
    if (epochMillis == null) return CountdownTime(zero, zero, zero)

    val remaining = (epochMillis - nowMillis).coerceAtLeast(0L)
    val totalMins = remaining / MILLIS_PER_MINUTE
    val days = totalMins / MINS_PER_DAY
    val hours = (totalMins % MINS_PER_DAY) / MINS_PER_HOUR
    val mins = totalMins % MINS_PER_HOUR

    return CountdownTime(
        days = formatter.format(days),
        hours = formatter.format(hours),
        mins = formatter.format(mins),
    )
}

private fun parseUtcDate(utcDate: String): Long? = try {
    ZonedDateTime.parse(utcDate, DateTimeFormatter.ISO_DATE_TIME).toInstant().toEpochMilli()
} catch (e: DateTimeParseException) {
    null
}

/**
 * Checks if the world cup has started.
 *
 * @param today Source of "today's" date. Defaults to the device's date.
 */
fun hasWorldCupStarted(today: () -> LocalDate = LocalDate::now): Boolean =
    today() >= WORLD_CUP_KICKOFF

/**
 * Checks if the world cup starts within one week.
 * Returns true only during the seven-day window leading up to (but not including) kickoff.
 *
 * @param today Source of "today's" date. Defaults to the device's date.
 */
fun isOneWeekToWorldCup(today: () -> LocalDate = LocalDate::now): Boolean =
    today() >= WORLD_CUP_KICKOFF.minusDays(ONE_WEEK_DAYS) && !hasWorldCupStarted(today)
