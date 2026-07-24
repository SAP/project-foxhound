/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.toolbar

import io.mockk.clearMocks
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.browser.toolbar.BrowserToolbar
import org.junit.Before
import org.junit.Test

class MenuPresenterTest {

    private lateinit var store: BrowserStore
    private lateinit var testTab: TabSessionState
    private lateinit var menuPresenter: MenuPresenter
    private lateinit var menuToolbar: BrowserToolbar

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        testTab = createTab(url = "https://mozilla.org")
        store = BrowserStore(initialState = BrowserState(tabs = listOf(testTab), selectedTabId = testTab.id))
        menuToolbar = mockk(relaxed = true)
        menuPresenter = MenuPresenter(menuToolbar, store, mainDispatcher = testDispatcher).also {
            it.start()
            testDispatcher.scheduler.advanceUntilIdle()
        }
        clearMocks(menuToolbar)
    }

    @Test
    fun `WHEN loading state is updated THEN toolbar is invalidated`() {
        verify(exactly = 0) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateLoadingStateAction(testTab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 1) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateLoadingStateAction(testTab.id, false))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 2) { menuToolbar.invalidateActions() }
    }

    @Test
    fun `WHEN back navigation state is updated THEN toolbar is invalidated`() {
        verify(exactly = 0) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateBackNavigationStateAction(testTab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 1) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateBackNavigationStateAction(testTab.id, false))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 2) { menuToolbar.invalidateActions() }
    }

    @Test
    fun `WHEN forward navigation state is updated THEN toolbar is invalidated`() {
        verify(exactly = 0) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateForwardNavigationStateAction(testTab.id, true))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 1) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateForwardNavigationStateAction(testTab.id, false))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 2) { menuToolbar.invalidateActions() }
    }

    @Test
    fun `WHEN web app manifest is updated THEN toolbar is invalidated`() {
        verify(exactly = 0) { menuToolbar.invalidateActions() }

        store.dispatch(ContentAction.UpdateWebAppManifestAction(testTab.id, mockk()))
        testDispatcher.scheduler.advanceUntilIdle()
        verify(exactly = 1) { menuToolbar.invalidateActions() }
    }
}
