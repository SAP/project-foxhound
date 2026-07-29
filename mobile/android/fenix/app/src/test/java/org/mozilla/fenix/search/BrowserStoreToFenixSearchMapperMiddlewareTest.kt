/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search

import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.SearchAction.ApplicationSearchEnginesLoaded
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SearchState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.search.fixtures.EMPTY_SEARCH_FRAGMENT_STATE
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class BrowserStoreToFenixSearchMapperMiddlewareTest {
    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `WHEN the browser search state changes THEN update the application search state`() = runTest(UnconfinedTestDispatcher()) {
        val defaultSearchEngine: SearchEngine = mockk()
        val newSearchEngines: List<SearchEngine> = listOf(defaultSearchEngine, mockk())
        val browserStore = BrowserStore(
            BrowserState(
                search = SearchState(
                    applicationSearchEngines = newSearchEngines,
                ),
            ),
        )
        val middleware = BrowserStoreToFenixSearchMapperMiddleware(browserStore, backgroundScope)
        val searchStore = buildStore(middleware)

        browserStore.dispatch(ApplicationSearchEnginesLoaded(newSearchEngines))

        assertEquals(defaultSearchEngine, searchStore.state.defaultEngine)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `GIVEN no appStore WHEN the browser search state changes THEN isPrivate defaults to false`() = runTest(UnconfinedTestDispatcher()) {
        val newSearchEngines: List<SearchEngine> = listOf(mockk(), mockk())
        val browserStore = BrowserStore(
            BrowserState(
                search = SearchState(
                    applicationSearchEngines = newSearchEngines,
                ),
            ),
        )
        val actionsCaptor = CaptureActionsMiddleware<SearchFragmentState, SearchFragmentAction>()
        val middleware = BrowserStoreToFenixSearchMapperMiddleware(browserStore, backgroundScope)
        buildStore(middleware, actionsCaptor)

        browserStore.dispatch(ApplicationSearchEnginesLoaded(newSearchEngines))

        actionsCaptor.assertLastAction(SearchFragmentAction.UpdateSearchState::class) {
            assertFalse(it.isPrivate)
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `GIVEN appStore in private mode WHEN the browser search state changes THEN isPrivate is true`() = runTest(UnconfinedTestDispatcher()) {
        val newSearchEngines: List<SearchEngine> = listOf(mockk(), mockk())
        val browserStore = BrowserStore(
            BrowserState(
                search = SearchState(
                    applicationSearchEngines = newSearchEngines,
                ),
            ),
        )
        val appStore = AppStore(AppState(mode = BrowsingMode.Private))
        val actionsCaptor = CaptureActionsMiddleware<SearchFragmentState, SearchFragmentAction>()
        val middleware = BrowserStoreToFenixSearchMapperMiddleware(browserStore, backgroundScope, appStore)
        buildStore(middleware, actionsCaptor)

        browserStore.dispatch(ApplicationSearchEnginesLoaded(newSearchEngines))

        actionsCaptor.assertLastAction(SearchFragmentAction.UpdateSearchState::class) {
            assertTrue(it.isPrivate)
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `GIVEN appStore in normal mode WHEN the browser search state changes THEN isPrivate is false`() = runTest(UnconfinedTestDispatcher()) {
        val newSearchEngines: List<SearchEngine> = listOf(mockk(), mockk())
        val browserStore = BrowserStore(
            BrowserState(
                search = SearchState(
                    applicationSearchEngines = newSearchEngines,
                ),
            ),
        )
        val appStore = AppStore(AppState(mode = BrowsingMode.Normal))
        val actionsCaptor = CaptureActionsMiddleware<SearchFragmentState, SearchFragmentAction>()
        val middleware = BrowserStoreToFenixSearchMapperMiddleware(browserStore, backgroundScope, appStore)
        buildStore(middleware, actionsCaptor)

        browserStore.dispatch(ApplicationSearchEnginesLoaded(newSearchEngines))

        actionsCaptor.assertLastAction(SearchFragmentAction.UpdateSearchState::class) {
            assertFalse(it.isPrivate)
        }
    }

    private fun buildStore(
        middleware: BrowserStoreToFenixSearchMapperMiddleware,
        vararg additional: CaptureActionsMiddleware<SearchFragmentState, SearchFragmentAction>,
    ) = SearchFragmentStore(
        initialState = EMPTY_SEARCH_FRAGMENT_STATE,
        middleware = listOf(middleware) + additional.toList(),
    )
}
