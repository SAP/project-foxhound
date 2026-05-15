/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class TrackingProtectionActionTest {
    private lateinit var tab: TabSessionState
    private lateinit var state: BrowserState

    @Before
    fun setUp() {
        tab = createTab("https://www.mozilla.org")

        state = BrowserState(
            tabs = listOf(tab),
        )
    }

    private fun tabState(): TabSessionState = state.findTab(tab.id)!!
    private fun trackingProtectionState() = tabState().trackingProtection

    @Test
    fun `ToggleAction - Updates enabled flag of TrackingProtectionState`() {
        assertFalse(trackingProtectionState().enabled)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleAction(tabId = tab.id, enabled = true),
        )

        assertTrue(trackingProtectionState().enabled)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleAction(tabId = tab.id, enabled = true),
        )

        assertTrue(trackingProtectionState().enabled)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleAction(tabId = tab.id, enabled = false),
        )

        assertFalse(trackingProtectionState().enabled)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleAction(tabId = tab.id, enabled = true),
        )

        assertTrue(trackingProtectionState().enabled)
    }

    @Test
    fun `ToggleExclusionListAction - Updates enabled flag of TrackingProtectionState`() {
        assertFalse(trackingProtectionState().ignoredOnTrackingProtection)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleExclusionListAction(
                tabId = tab.id,
                excluded = true,
            ),
        )

        assertTrue(trackingProtectionState().ignoredOnTrackingProtection)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleExclusionListAction(
                tabId = tab.id,
                excluded = true,
            ),
        )

        assertTrue(trackingProtectionState().ignoredOnTrackingProtection)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleExclusionListAction(
                tabId = tab.id,
                excluded = false,
            ),
        )

        assertFalse(trackingProtectionState().ignoredOnTrackingProtection)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ToggleExclusionListAction(
                tabId = tab.id,
                excluded = true,
            ),
        )

        assertTrue(trackingProtectionState().ignoredOnTrackingProtection)
    }

    @Test
    fun `TrackerBlockedAction - Adds tackers to TrackingProtectionState`() {
        assertTrue(trackingProtectionState().blockedTrackers.isEmpty())
        assertTrue(trackingProtectionState().loadedTrackers.isEmpty())

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerBlockedAction(tabId = tab.id, tracker = mock()),
        )

        assertEquals(1, trackingProtectionState().blockedTrackers.size)
        assertEquals(0, trackingProtectionState().loadedTrackers.size)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerBlockedAction(tabId = tab.id, tracker = mock()),
        )

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerBlockedAction(tabId = tab.id, tracker = mock()),
        )

        assertEquals(3, trackingProtectionState().blockedTrackers.size)
        assertEquals(0, trackingProtectionState().loadedTrackers.size)
    }

    @Test
    fun `TrackerLoadedAction - Adds tackers to TrackingProtectionState`() {
        assertTrue(trackingProtectionState().blockedTrackers.isEmpty())
        assertTrue(trackingProtectionState().loadedTrackers.isEmpty())

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerLoadedAction(tabId = tab.id, tracker = mock()),
        )

        assertEquals(0, trackingProtectionState().blockedTrackers.size)
        assertEquals(1, trackingProtectionState().loadedTrackers.size)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerLoadedAction(tabId = tab.id, tracker = mock()),
        )

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerLoadedAction(tabId = tab.id, tracker = mock()),
        )

        assertEquals(0, trackingProtectionState().blockedTrackers.size)
        assertEquals(3, trackingProtectionState().loadedTrackers.size)
    }

    @Test
    fun `ClearTrackers - Removes trackers from TrackingProtectionState`() {
        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerBlockedAction(tabId = tab.id, tracker = mock()),
        )
        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerBlockedAction(tabId = tab.id, tracker = mock()),
        )

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerLoadedAction(tabId = tab.id, tracker = mock()),
        )

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerLoadedAction(tabId = tab.id, tracker = mock()),
        )

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.TrackerLoadedAction(tabId = tab.id, tracker = mock()),
        )

        assertEquals(2, trackingProtectionState().blockedTrackers.size)
        assertEquals(3, trackingProtectionState().loadedTrackers.size)

        state = BrowserStateReducer.reduce(
            state,
            TrackingProtectionAction.ClearTrackersAction(tab.id),
        )

        assertEquals(0, trackingProtectionState().blockedTrackers.size)
        assertEquals(0, trackingProtectionState().loadedTrackers.size)
    }
}
