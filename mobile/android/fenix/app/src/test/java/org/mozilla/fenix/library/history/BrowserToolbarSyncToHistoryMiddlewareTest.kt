/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.library.history

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.EnterEditMode
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.ExitEditMode
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarState
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.compose.browser.toolbar.store.Mode
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.library.history.HistoryFragmentAction.SearchDismissed
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class BrowserToolbarSyncToHistoryMiddlewareTest {
    @Test
    fun `GIVEN in the process of searching in history WHEN the toolbar exits search mode THEN the search is dismissed`() {
        val historyStore: HistoryFragmentStore = mockk(relaxed = true) {
            every { state.isSearching } returns true
        }
        val toolbarStore = BrowserToolbarStore(
            initialState = BrowserToolbarState(mode = Mode.EDIT),
            middleware = listOf(BrowserToolbarSyncToHistoryMiddleware(historyStore)),
        )

        toolbarStore.dispatch(ExitEditMode)

        verify { historyStore.dispatch(SearchDismissed) }
    }

    @Test
    fun `GIVEN not in the process of searching in history WHEN the toolbar exits search mode THEN the search mode is not changed`() {
        val historyStore: HistoryFragmentStore = mockk(relaxed = true) {
            every { state.isSearching } returns false
        }
        val toolbarStore = BrowserToolbarStore(
            initialState = BrowserToolbarState(mode = Mode.EDIT),
            middleware = listOf(BrowserToolbarSyncToHistoryMiddleware(historyStore)),
        )

        toolbarStore.dispatch(ExitEditMode)

        verify(exactly = 0) { historyStore.dispatch(any()) }
    }

    @Test
    fun `GIVEN not in the process of searching in history WHEN the toolbar enters search mode THEN the search mode is not changed`() {
        val historyStore: HistoryFragmentStore = mockk(relaxed = true) {
            every { state.isSearching } returns false
        }
        val toolbarStore = BrowserToolbarStore(
            initialState = BrowserToolbarState(mode = Mode.EDIT),
            middleware = listOf(BrowserToolbarSyncToHistoryMiddleware(historyStore)),
        )

        toolbarStore.dispatch(EnterEditMode(false))

        verify(exactly = 0) { historyStore.dispatch(any()) }
    }
}
