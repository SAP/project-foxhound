/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ipprotection.helpers

import android.text.format.DateFormat
import org.mozilla.fenix.nimbus.FxNimbus
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale

/**
 * Contains an ISO 8601 date.
 */
@JvmInline
value class IsoPromoDeadline(val date: String)

/**
 * A formatted promo date based on feature properties in [org.mozilla.fenix.nimbus.IpProtection].
 */
internal fun formatPromoDateOrCatch(
    maxGib: Int = FxNimbus.features.ipProtection.value().dataLimitGigabyte,
    onException: (Exception) -> Unit,
): String? {
    if (maxGib > 0) {
        return null
    }

    val date = IsoPromoDeadline(FxNimbus.features.ipProtection.value().promoDeadline)
    return date.formatPromoDateOrCatch(
        onException,
    )
}

/**
 * Formats an ISO 8601 date to a localized version for representing the promotion deadline date (e.g. 2026-08-31).
 *
 * @param onException any exception caught during parsing or formatting of the date.
 */
internal fun IsoPromoDeadline.formatPromoDateOrCatch(onException: (Exception) -> Unit): String? {
    return try {
        val date = LocalDate.parse(date)
        val formatter = DateTimeFormatter.ofPattern(
            DateFormat.getBestDateTimePattern(Locale.getDefault(), "MMMMd"),
        )
        date.format(formatter)
    } catch (e: DateTimeParseException) {
        onException(e)
        null
    } catch (e: IllegalArgumentException) {
        onException(e)
        null
    }
}
