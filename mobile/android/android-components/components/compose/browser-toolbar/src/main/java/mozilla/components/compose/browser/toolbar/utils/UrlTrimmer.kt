/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.utils

/**
 * Truncates a URL to a specific length around its registrable domain.
 *
 * @param url The full URL string.
 * @param registrableDomainIndexRange The start and end indices of the domain within the full URL.
 * @param maxCharCountAroundDomain The maximum number of characters to preserve on either side of the domain.
 *
 * @return A [Pair] containing the truncated URL string and the adjusted index range for the domain,
 * or the original inputs if no truncation is needed or possible.
 */
internal fun truncateUrlAroundDomain(
    url: String,
    registrableDomainIndexRange: Pair<Int, Int>?,
    maxCharCountAroundDomain: Int = 300,
): Pair<String, Pair<Int, Int>?> {
    if (registrableDomainIndexRange == null) {
        // If there's no domain, we can't center on it. Return a simple truncation.
        return url.take(maxCharCountAroundDomain * 2) to null
    }

    val (domainStart, domainEnd) = registrableDomainIndexRange
    val truncatedUrlStart = (domainStart - maxCharCountAroundDomain).coerceAtLeast(0)
    val truncatedUrlEnd = (domainEnd + maxCharCountAroundDomain).coerceAtMost(url.length)

    val truncatedUrl = url.substring(truncatedUrlStart, truncatedUrlEnd)

    // Slide the window of the registrable domain by how many characters from the start were removed.
    val newDomainStart = domainStart - truncatedUrlStart
    val newDomainEnd = domainEnd - truncatedUrlStart
    val newRange = newDomainStart to newDomainEnd

    return truncatedUrl to newRange
}
