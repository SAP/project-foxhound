/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.blockedtrackers

import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateEarliestTrackingDate
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedCount
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedThisWeek
import org.mozilla.fenix.components.appstate.AppState

/**
 * [AppState] reducer of updates related to blocked trackers.
 */
object BlockedTrackersStateReducer {
    /**
     * [AppState] reducer of [BlockedTrackersAction]s.
     */
    fun reduce(state: AppState, action: BlockedTrackersAction): AppState = when (action) {
        is UpdateTrackersBlockedThisWeek -> state.updateBlockedTrackersState {
            copy(trackersBlockedThisWeek = action.blockedTrackerCategories)
        }
        is UpdateTrackersBlockedCount -> state.updateBlockedTrackersState {
            copy(trackersBlockedCount = action.count)
        }
        is UpdateEarliestTrackingDate -> state.updateBlockedTrackersState {
            copy(earliestTrackingDate = action.date)
        }
    }

    private fun AppState.updateBlockedTrackersState(update: BlockedTrackersState.() -> BlockedTrackersState) = copy(
        blockedTrackersState = blockedTrackersState.update(),
    )
}
