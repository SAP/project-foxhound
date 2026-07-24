/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.search

import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SessionState
import mozilla.components.browser.state.state.createCustomTab
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val SELECTED_TAB_ID = "1"
private const val CUSTOM_TAB_ID = "2"

class BrowserStoreSearchAdapterTest {

    private val state = BrowserState(
        tabs = listOf(createTab(id = SELECTED_TAB_ID, url = "https://mozilla.org", private = true)),
        customTabs = listOf(createCustomTab(id = CUSTOM_TAB_ID, url = "https://firefox.com", source = SessionState.Source.Internal.CustomTab)),
        selectedTabId = SELECTED_TAB_ID,
    )

    @Test
    fun `adapter does nothing with null tab`() {
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val browserStore = BrowserStore(middleware = listOf(captureActionsMiddleware))
        val searchAdapter = BrowserStoreSearchAdapter(browserStore)

        searchAdapter.sendSearch(isPrivate = false, text = "normal search")
        searchAdapter.sendSearch(isPrivate = true, text = "private search")

        captureActionsMiddleware.assertNotDispatched(ContentAction.UpdateSearchRequestAction::class)
        assertFalse(searchAdapter.isPrivateSession())
    }

    @Test
    fun `sendSearch with selected tab`() {
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val browserStore = BrowserStore(state, middleware = listOf(captureActionsMiddleware))

        val searchAdapter = BrowserStoreSearchAdapter(browserStore)
        searchAdapter.sendSearch(isPrivate = false, text = "normal search")

        captureActionsMiddleware.assertFirstAction(ContentAction.UpdateSearchRequestAction::class) { action ->
            assertFalse(action.searchRequest.isPrivate)
            assertEquals("normal search", action.searchRequest.query)
            assertEquals(SELECTED_TAB_ID, action.sessionId)
        }

        searchAdapter.sendSearch(isPrivate = true, text = "private search")

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateSearchRequestAction::class) { action ->
            assertTrue(action.searchRequest.isPrivate)
            assertEquals("private search", action.searchRequest.query)
            assertEquals(SELECTED_TAB_ID, action.sessionId)
        }

        assertTrue(searchAdapter.isPrivateSession())
    }

    @Test
    fun `sendSearch with custom tab`() {
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val browserStore = BrowserStore(state, middleware = listOf(captureActionsMiddleware))

        val searchAdapter = BrowserStoreSearchAdapter(browserStore, CUSTOM_TAB_ID)
        searchAdapter.sendSearch(isPrivate = false, text = "normal search")

        captureActionsMiddleware.assertFirstAction(ContentAction.UpdateSearchRequestAction::class) { action ->
            assertFalse(action.searchRequest.isPrivate)
            assertEquals("normal search", action.searchRequest.query)
            assertEquals(CUSTOM_TAB_ID, action.sessionId)
        }

        searchAdapter.sendSearch(isPrivate = true, text = "private search")

        captureActionsMiddleware.assertLastAction(ContentAction.UpdateSearchRequestAction::class) { action ->
            assertTrue(action.searchRequest.isPrivate)
            assertEquals("private search", action.searchRequest.query)
            assertEquals(CUSTOM_TAB_ID, action.sessionId)
        }

        assertFalse(searchAdapter.isPrivateSession())
    }
}
