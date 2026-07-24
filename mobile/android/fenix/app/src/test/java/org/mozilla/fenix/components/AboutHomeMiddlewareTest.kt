/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.history.HistoryItem
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AboutHomeMiddlewareTest {
    private lateinit var middleware: AboutHomeMiddleware
    private lateinit var captureActionsMiddleware: CaptureActionsMiddleware<BrowserState, BrowserAction>

    private val homepageTitle = "Mozilla Firefox"

    @Before
    fun setup() {
        captureActionsMiddleware = CaptureActionsMiddleware()
        middleware = AboutHomeMiddleware(
            homepageTitle = homepageTitle,
        )
    }

    @Test
    fun `GIVEN ABOUT_HOME_URL tab WHEN update title action is dispatched THEN intercept the action and update the title`() {
        val tab = createTab(url = ABOUT_HOME_URL, id = "test-tab1")
        val store = createStore(
            initialState = BrowserState(tabs = listOf(tab)),
        )

        store.dispatch(
            ContentAction.UpdateTitleAction(sessionId = tab.id, title = ""),
        )

        assertEquals(
            homepageTitle,
            captureActionsMiddleware.findLastAction(ContentAction.UpdateTitleAction::class).title,
        )
    }

    @Test
    fun `GIVEN a tab that is not ABOUT_HOME_URL WHEN update title action is dispatched THEN let the action pass through`() {
        val tab = createTab("https://www.mozilla.org", id = "test-tab1")
        val store = createStore(
            initialState = BrowserState(tabs = listOf(tab)),
        )
        val title = "Mozilla"

        store.dispatch(
            ContentAction.UpdateTitleAction(sessionId = tab.id, title = title),
        )

        assertEquals(
            title,
            captureActionsMiddleware.findLastAction(ContentAction.UpdateTitleAction::class).title,
        )
    }

    @Test
    fun `GIVEN a ABOUT_HOME_URL tab is in a tab history state WHEN update history state action is dispatched THEN intercept the action and update the title of the homepage history item`() {
        val tab = createTab("https://www.mozilla.org", id = "test-tab1")
        val store = createStore(
            initialState = BrowserState(tabs = listOf(tab)),
        )
        val originalHistoryList = listOf(
            HistoryItem(title = "", uri = ABOUT_HOME_URL),
            HistoryItem(title = "Mozilla", uri = "https://www.mozilla.org"),
        )
        val expectedHistoryList = listOf(
            HistoryItem(title = homepageTitle, uri = ABOUT_HOME_URL),
            HistoryItem(title = "Mozilla", uri = "https://www.mozilla.org"),
        )

        store.dispatch(
            ContentAction.UpdateHistoryStateAction(
                sessionId = tab.id,
                historyList = originalHistoryList,
                currentIndex = 1,
            ),
        )

        assertEquals(
            expectedHistoryList,
            captureActionsMiddleware.findLastAction(ContentAction.UpdateHistoryStateAction::class).historyList,
        )
    }

    private fun createStore(
        initialState: BrowserState = BrowserState(),
    ) = BrowserStore(
        initialState = initialState,
        middleware = listOf(middleware, captureActionsMiddleware),
    )
}
