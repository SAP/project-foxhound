/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.action

import mozilla.components.browser.state.reducer.BrowserStateReducer
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.concept.engine.EngineSession.CookieBannerHandlingStatus.DETECTED
import mozilla.components.concept.engine.EngineSession.CookieBannerHandlingStatus.HANDLED
import mozilla.components.concept.engine.EngineSession.CookieBannerHandlingStatus.NO_DETECTED
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class CookieBannerActionTest {
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

    @Test
    fun `WHEN an UpdateStatusAction is dispatched THEN update cookieBanner on the given session`() {
        assertEquals(NO_DETECTED, tabState().cookieBanner)

        state = BrowserStateReducer.reduce(state, CookieBannerAction.UpdateStatusAction(tabId = tab.id, status = HANDLED))

        assertEquals(HANDLED, tabState().cookieBanner)

        state = BrowserStateReducer.reduce(state, CookieBannerAction.UpdateStatusAction(tabId = tab.id, status = DETECTED))

        assertEquals(DETECTED, tabState().cookieBanner)
    }
}
