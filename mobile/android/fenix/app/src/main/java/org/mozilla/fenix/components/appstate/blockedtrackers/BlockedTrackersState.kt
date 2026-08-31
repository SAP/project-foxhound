/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.blockedtrackers

import mozilla.components.feature.protection.dashboard.TrackersBlockedCategory

/**
 * The current status of blocked trackers.
 *
 * @property trackersBlockedCount The total number of trackers blocked to display in the privacy report.
 * @property trackersBlockedThisWeek The total number of trackers blocked this week.
 * @property earliestTrackingDate The earliest date for which we have information about blocked trackers
 * as a Unix time stamp. May be `null` if this information is not available.
 */
data class BlockedTrackersState(
    val trackersBlockedCount: Int = 0,
    val trackersBlockedThisWeek: List<TrackersBlockedCategory> = emptyList(),
    val earliestTrackingDate: Long? = null,
)
