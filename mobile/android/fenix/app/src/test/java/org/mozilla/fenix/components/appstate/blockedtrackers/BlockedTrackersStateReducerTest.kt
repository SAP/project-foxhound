/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.blockedtrackers

import mozilla.components.feature.protection.dashboard.TrackerCategory
import mozilla.components.feature.protection.dashboard.TrackersBlockedCategory
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateEarliestTrackingDate
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedCount
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedThisWeek
import org.mozilla.fenix.components.appstate.AppState

class BlockedTrackersStateReducerTest {
    @Test
    fun `WHEN the total number of blocked trackers is updated THEN update the state`() {
        val initialState = AppState()
        val newBlockedTrackersTotal = 53

        val updatedState = BlockedTrackersStateReducer.reduce(initialState, UpdateTrackersBlockedCount(newBlockedTrackersTotal))

        assertEquals(
            BlockedTrackersState(trackersBlockedCount = newBlockedTrackersTotal),
            updatedState.blockedTrackersState,
        )
    }

    @Test
    fun `WHEN the number of trackers blocked this week is updated THEN update the state`() {
        val initialState = AppState()
        val newTrackersBlocked: List<TrackersBlockedCategory> =
            listOf(TrackersBlockedCategory(1, 1, 2, TrackerCategory.CROSS_SITE_COOKIES))

        val updatedState = BlockedTrackersStateReducer.reduce(initialState, UpdateTrackersBlockedThisWeek(newTrackersBlocked))

        assertEquals(
            BlockedTrackersState(trackersBlockedThisWeek = newTrackersBlocked),
            updatedState.blockedTrackersState,
        )
    }

    @Test
    fun `WHEN the earliest date from when we have tracking information is updated THEN update the state`() {
        val initialState = AppState()
        val newDate = 7L

        val updatedState = BlockedTrackersStateReducer.reduce(initialState, UpdateEarliestTrackingDate(newDate))

        assertEquals(
            BlockedTrackersState(earliestTrackingDate = newDate),
            updatedState.blockedTrackersState,
        )
    }
}
