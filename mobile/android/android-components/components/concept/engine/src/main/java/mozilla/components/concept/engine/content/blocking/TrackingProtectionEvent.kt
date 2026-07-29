/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.content.blocking

import androidx.annotation.IntDef

/**
 * Represents an aggregate content blocking event from the tracking protection database.
 *
 * @property type the tracker type ID.
 * @property count the aggregated count for this type on the given date.
 * @property date the date for this event, in "YYYY-MM-DD" format. May be null if this is not known.
 */
data class TrackingProtectionEvent(
    @param:BlockedEventType val type: Int,
    val count: Int,
    val date: String?,
) {
    companion object {
        /**
         * All blocked trackers types.
         * To be kept in sync with the `nsITrackingDBService` constants from
         * https://searchfox.org/firefox-main/rev/8352bcb6d75d53f3e2190221b71190e47afa0bfc/toolkit/components/antitracking/nsITrackingDBService.idl#57-64
         */
        @Retention(AnnotationRetention.SOURCE)
        @IntDef(
            OTHER_COOKIES_BLOCKED,
            TRACKERS,
            TRACKING_COOKIES,
            CRYPTOMINERS,
            FINGERPRINTERS,
            SOCIAL,
            SUSPICIOUS_FINGERPRINTERS,
            BOUNCETRACKERS,
        )
        annotation class BlockedEventType

        /**
         * Generic cookies.
         */
        const val OTHER_COOKIES_BLOCKED = 0

        /**
         * Generic tracking scripts.
         */
        const val TRACKERS = 1

        /**
         * Generic tracking cookies.
         */
        const val TRACKING_COOKIES = 2

        /**
         * Cryptocurrency miners.
         */
        const val CRYPTOMINERS = 3

        /**
         * Fingerprinting trackers.
         */
        const val FINGERPRINTERS = 4

        /**
         * Social trackers from the social-track-digest256 list.
         */
        const val SOCIAL = 5

        /**
         * Scripts potentially aiding in fingerprinting.
         */
        const val SUSPICIOUS_FINGERPRINTERS = 6

        /**
         * Redirect-based trackers.
         *
         * [Bounce tracking mitigations](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Bounce_tracking_mitigations)
         */
        const val BOUNCETRACKERS = 7
    }
}
