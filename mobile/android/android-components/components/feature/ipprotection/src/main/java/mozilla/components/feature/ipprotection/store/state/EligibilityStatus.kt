/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection.store.state

/**
 * Whether the user qualifies to use IP Protection.
 */
sealed interface EligibilityStatus {
    /**
     * Feature is yet to initialize.
     */
    data object Unknown : EligibilityStatus

    /**
     * Feature is not available for the user, due to the Nimbus config.
     */
    data object Ineligible : EligibilityStatus

    /**
     * Feature is not available for the user, due to the region not being supported.
     */
    data object UnsupportedRegion : EligibilityStatus

    /**
     * Feature is available for the user.
     */
    data object Eligible : EligibilityStatus
}
