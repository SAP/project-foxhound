/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils.ext

import android.net.Uri

/**
 * Strips characters other than digits from a string.
 * Used to strip a credit card number user input of spaces and separators.
 */
fun String.toCreditCardNumber(): String {
    return this.filter { it.isDigit() }
}

/**
 * Decodes a string only if it appears to be percent-encoded and is not already decoded.
 *
 * This function prevents "double-decoding" or corruption by checking for malformed
 * percent-encoding. If the string contains a '%' character that is not followed by
 * two valid hexadecimal digits (e.g., "test%.txt" or "discount 10%"), it is treated
 * as already decoded, and the original string is returned.
 *
 * @return The decoded string if it contains valid percent-encoding;
 *         otherwise, the original string.
 */
fun String.decodeIfNeeded(): String {
    // Regex: A '%' that is NOT followed by exactly two hex digits
    val hasMalformedPercent = "%(?![0-9a-fA-F]{2})".toRegex()

    val result = when {
        // If there are no percent signs, there is nothing to decode
        !this.contains("%") -> this
        // If we find a '%' that doesn't look like an encoded byte,
        // it's likely already decoded (e.g., "test%.txt")
        this.contains(hasMalformedPercent) -> this
        // Otherwise, it's safe to attempt to decode.
        else -> Uri.decode(this) ?: this
    }
    // Apply Desktop parity: replace any remaining or literal '%' with '_'
    return result.replace('%', '_')
}
