/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabhistory

import androidx.navigation.NavController
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.TestScope
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.engine.EngineMiddleware
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.session.SessionUseCases
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Test

class TabHistoryControllerTest {

    private val navController = mockk<NavController>(relaxed = true)
    private val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
    private val tab = createTab("https://www.mozilla.org")

    private val store = BrowserStore(
        initialState = BrowserState(
            tabs = listOf(tab),
            selectedTabId = tab.id,
        ),
        middleware = listOf(captureActionsMiddleware) + EngineMiddleware.create(
            engine = mockk(),
            TestScope(),
        ),
    )

    private val goToHistoryIndexUseCase = SessionUseCases(store).goToHistoryIndex

    private val currentItem = TabHistoryItem(
        index = 0,
        title = "",
        url = "",
        isSelected = true,
    )

    @Test
    fun handleGoToHistoryIndexNormalBrowsing() {
        val controller = DefaultTabHistoryController(
            navController = navController,
            goToHistoryIndexUseCase = goToHistoryIndexUseCase,
        )

        controller.handleGoToHistoryItem(currentItem)

        verify { navController.navigateUp() }
        captureActionsMiddleware.assertFirstAction(EngineAction.GoToHistoryIndexAction::class) { action ->
            assertEquals(tab.id, action.tabId)
            assertEquals(0, action.index)
        }
    }

    @Test
    fun handleGoToHistoryIndexCustomTab() {
        val customTabId = "customTabId"

        val customTabController = DefaultTabHistoryController(
            navController = navController,
            goToHistoryIndexUseCase = goToHistoryIndexUseCase,
            customTabId = customTabId,
        )

        customTabController.handleGoToHistoryItem(currentItem)

        verify { navController.navigateUp() }
        captureActionsMiddleware.assertFirstAction(EngineAction.GoToHistoryIndexAction::class) { action ->
            assertEquals("customTabId", action.tabId)
            assertEquals(0, action.index)
        }
    }
}
