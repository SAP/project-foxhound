/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ext

import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.geckoview.ContentBlockingController

/**
 * Convert a GeckoView [ContentBlockingController.TrackingDbEvent] to
 * an Android Components [TrackingProtectionEvent].
 * Returns `null` if the [ContentBlockingController.TrackingDbEvent] details
 * are not supported in Android Components.
 */
fun ContentBlockingController.TrackingDbEvent.toTrackingProtectionEvent(): TrackingProtectionEvent? {
    val mappedType = when (type) {
        ContentBlockingController.TrackingDbEvent.OTHER_COOKIES_BLOCKED_ID ->
            TrackingProtectionEvent.OTHER_COOKIES_BLOCKED
        ContentBlockingController.TrackingDbEvent.TRACKERS_ID ->
            TrackingProtectionEvent.TRACKERS
        ContentBlockingController.TrackingDbEvent.TRACKING_COOKIES_ID ->
            TrackingProtectionEvent.TRACKING_COOKIES
        ContentBlockingController.TrackingDbEvent.CRYPTOMINERS_ID ->
            TrackingProtectionEvent.CRYPTOMINERS
        ContentBlockingController.TrackingDbEvent.FINGERPRINTERS_ID ->
            TrackingProtectionEvent.FINGERPRINTERS
        ContentBlockingController.TrackingDbEvent.SOCIAL_ID ->
            TrackingProtectionEvent.SOCIAL
        ContentBlockingController.TrackingDbEvent.SUSPICIOUS_FINGERPRINTERS_ID ->
            TrackingProtectionEvent.SUSPICIOUS_FINGERPRINTERS
        ContentBlockingController.TrackingDbEvent.BOUNCETRACKERS_ID ->
            TrackingProtectionEvent.BOUNCETRACKERS
        else -> null
    }

    return when (mappedType) {
        null -> {
            Logger("TrackingDbEventMapper").warn("Unsupported tracker type: $type")
            null
        }
        else -> TrackingProtectionEvent(
            type = mappedType,
            count = count,
            date = date,
        )
    }
}
