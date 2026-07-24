/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.pocket.ext

import mozilla.components.service.pocket.PocketStory.SponsoredContent
import mozilla.components.service.pocket.PocketStory.SponsoredContentFrequencyCaps
import java.util.concurrent.TimeUnit

/**
 * Returns a list of all sponsored content impressions (expressed in seconds from Epoch) in the
 * period between `now` down to [SponsoredContentFrequencyCaps.flightPeriod].
 */
fun SponsoredContent.getCurrentFlightImpressions(): List<Long> {
    val now = TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis())
    return caps.currentImpressions.filter {
        now - it < caps.flightPeriod
    }
}

/**
 * Returns true if sponsored content has reached the maximum number of impressions in the period
 * specified by [SponsoredContentFrequencyCaps.flightPeriod] and false otherwise.
 */
fun SponsoredContent.hasFlightImpressionsLimitReached(): Boolean {
    return getCurrentFlightImpressions().size >= caps.flightCount
}

/**
 * Records a new impression and returns the [SponsoredContent] with the updated impressions
 * details. This only updates the in-memory data.
 */
fun SponsoredContent.recordNewImpression(): SponsoredContent {
    return this.copy(
        caps = caps.copy(
            currentImpressions = caps.currentImpressions + TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis()),
        ),
    )
}
