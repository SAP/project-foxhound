/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate

import io.mockk.mockk
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.concept.storage.BookmarkNode
import mozilla.components.concept.storage.BookmarkNodeType
import mozilla.components.lib.crash.Crash.NativeCodeCrash
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction.AddNonFatalCrash
import org.mozilla.fenix.components.appstate.AppAction.RemoveAllNonFatalCrashes
import org.mozilla.fenix.components.appstate.AppAction.RemoveNonFatalCrash
import org.mozilla.fenix.components.appstate.AppAction.UpdateInactiveExpanded
import org.mozilla.fenix.components.appstate.search.SearchState
import org.mozilla.fenix.components.appstate.search.SelectedSearchEngine
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState
import org.mozilla.fenix.components.metrics.MetricsUtils

class AppStoreReducerTest {
    @Test
    fun `GIVEN a new value for inactiveTabsExpanded WHEN UpdateInactiveExpanded is called THEN update the current value`() {
        val initialState = AppState(
            inactiveTabsExpanded = true,
        )

        var updatedState = AppStoreReducer.reduce(
            state = initialState,
            action = UpdateInactiveExpanded(false),
        )
        assertFalse(updatedState.inactiveTabsExpanded)

        updatedState = AppStoreReducer.reduce(updatedState, UpdateInactiveExpanded(true))
        assertTrue(updatedState.inactiveTabsExpanded)
    }

    @Test
    fun `GIVEN a Crash WHEN AddNonFatalCrash is called THEN add that Crash to the current list`() {
        val initialState = AppState()
        val crash1: NativeCodeCrash = mockk()
        val crash2: NativeCodeCrash = mockk()

        var updatedState = AppStoreReducer.reduce(initialState, AddNonFatalCrash(crash1))
        assertTrue(listOf(crash1).containsAll(updatedState.nonFatalCrashes))

        updatedState = AppStoreReducer.reduce(updatedState, AddNonFatalCrash(crash2))
        assertTrue(listOf(crash1, crash2).containsAll(updatedState.nonFatalCrashes))
    }

    @Test
    fun `GIVEN a Crash WHEN RemoveNonFatalCrash is called THEN remove that Crash from the current list`() {
        val crash1: NativeCodeCrash = mockk()
        val crash2: NativeCodeCrash = mockk()
        val initialState = AppState(
            nonFatalCrashes = listOf(crash1, crash2),
        )

        var updatedState = AppStoreReducer.reduce(initialState, RemoveNonFatalCrash(crash1))
        assertTrue(listOf(crash2).containsAll(updatedState.nonFatalCrashes))

        updatedState = AppStoreReducer.reduce(updatedState, RemoveNonFatalCrash(mockk()))
        assertTrue(listOf(crash2).containsAll(updatedState.nonFatalCrashes))

        updatedState = AppStoreReducer.reduce(updatedState, RemoveNonFatalCrash(crash2))
        assertTrue(updatedState.nonFatalCrashes.isEmpty())
    }

    @Test
    fun `GIVEN crashes exist in State WHEN RemoveAllNonFatalCrashes is called THEN clear the current list of crashes`() {
        val initialState = AppState(
            nonFatalCrashes = listOf(mockk(), mockk()),
        )

        val updatedState = AppStoreReducer.reduce(initialState, RemoveAllNonFatalCrashes)

        assertTrue(updatedState.nonFatalCrashes.isEmpty())
    }

    @Test
    fun `WHEN a new search is started THEN update state to reflect it`() {
        val initialState = AppState()

        assertFalse(initialState.searchState.isSearchActive)

        val updatedState = AppStoreReducer.reduce(
            initialState,
            AppAction.SearchAction.SearchStarted(
                tabId = "test",
                source = MetricsUtils.Source.ACTION,
            ),
        )

        assertTrue(updatedState.searchState.isSearchActive)
        assertEquals(updatedState.searchState.sourceTabId, "test")
        assertEquals(updatedState.searchState.searchAccessPoint, MetricsUtils.Source.ACTION)
    }

    @Test
    fun `WHEN search is aborted THEN reset the search related state`() {
        val initialState = AppState(
            searchState = SearchState.EMPTY.copy(
                selectedSearchEngine = mockk(),
            ),
        )

        val updatedState = AppStoreReducer.reduce(
            initialState,
            AppAction.SearchAction.SearchEnded,
        )

        assertFalse(updatedState.searchState.isSearchActive)
        assertNull(updatedState.searchState.selectedSearchEngine)
        assertNull(updatedState.searchState.sourceTabId)
        assertEquals(updatedState.searchState.searchAccessPoint, MetricsUtils.Source.NONE)
    }

    @Test
    fun `WHEN a new search engine is selected THEN update state to reflect it`() {
        val initialState = AppState()

        assertNull(initialState.searchState.selectedSearchEngine)

        val newSearchEngineSelection: SearchEngine = mockk()
        val updatedState = AppStoreReducer.reduce(
            initialState,
            AppAction.SearchAction.SearchEngineSelected(newSearchEngineSelection, true),
        )

        assertEquals(
            SelectedSearchEngine(newSearchEngineSelection, true),
            updatedState.searchState.selectedSearchEngine,
        )
    }

    @Test
    fun `WHEN translation started action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()
        val sessionId = "sessionId"

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.TranslationsAction.TranslationStarted(sessionId = sessionId),
        )

        assertEquals(
            SnackbarState.TranslationInProgress(sessionId = sessionId),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN bookmark added action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()
        val guidToEdit = "guidToEdit"
        val parentNode = BookmarkNode(
            type = BookmarkNodeType.FOLDER,
            guid = "456",
            parentGuid = "123",
            position = 0u,
            title = "Mozilla",
            url = null,
            dateAdded = 0,
            lastModified = 0,
            children = listOf(),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.BookmarkAction.BookmarkAdded(
                guidToEdit = guidToEdit,
                parentNode = parentNode,
                source = MetricsUtils.BookmarkAction.Source.TEST,
            ),
        )

        assertEquals(
            SnackbarState.BookmarkAdded(
                guidToEdit = guidToEdit,
                parentNode = parentNode,
            ),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN bookmark deleted action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()
        val bookmarkTitle = "test"

        val finalState = AppStoreReducer.reduce(initialState, AppAction.BookmarkAction.BookmarkDeleted(title = bookmarkTitle))

        assertEquals(
            SnackbarState.BookmarkDeleted(title = bookmarkTitle),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN delete and quit selected action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.DeleteAndQuitStarted,
        )

        assertEquals(
            SnackbarState.DeletingBrowserDataInProgress,
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN open in firefox started action is dispatched THEN open in firefox requested is true`() {
        val initialState = AppState()
        assertFalse(initialState.openInFirefoxRequested)

        val finalState = AppStoreReducer.reduce(initialState, AppAction.OpenInFirefoxStarted)

        assertTrue(finalState.openInFirefoxRequested)
    }

    @Test
    fun `WHEN open in firefox finished action is dispatched THEN open in firefox requested is false`() {
        val initialState = AppState(
            openInFirefoxRequested = true,
        )
        assertTrue(initialState.openInFirefoxRequested)

        val finalState = AppStoreReducer.reduce(initialState, AppAction.OpenInFirefoxFinished)

        assertFalse(finalState.openInFirefoxRequested)
    }

    @Test
    fun `WHEN UserAccountAuthenticated action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.UserAccountAuthenticated,
        )

        assertEquals(
            SnackbarState.UserAccountAuthenticated,
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN the current tab is closed THEN show a snackbar`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.CurrentTabClosed(true),
        )

        assertEquals(
            SnackbarState.CurrentTabClosed(true),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN the current tab's URL has been copied THEN show a snackbar`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(initialState, AppAction.URLCopiedToClipboard)

        assertEquals(
            SnackbarState.URLCopiedToClipboard,
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN download in progress action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.DownloadAction.DownloadInProgress("id"),
        )

        assertEquals(
            SnackbarState.DownloadInProgress("id"),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN download failed action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.DownloadAction.DownloadFailed("fileName"),
        )

        assertEquals(
            SnackbarState.DownloadFailed("fileName"),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN download completed action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()
        val downloadState = DownloadState(
            id = "1",
            url = "url",
            fileName = "fileName",
            contentType = "application/zip",
            contentLength = 5242880,
            status = DownloadState.Status.DOWNLOADING,
            directoryPath = "downloads",
            destinationDirectory = "Environment.DIRECTORY_MUSIC",
            private = true,
            createdTime = 33,
            etag = "etag",
        )
        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.DownloadAction.DownloadCompleted(
                downloadState,
            ),
        )

        assertEquals(
            SnackbarState.DownloadCompleted(
                downloadState,
            ),
            finalState.snackbarState,
        )
        assertTrue(finalState.supportedMenuNotifications.contains(SupportedMenuNotifications.Downloads))
    }

    @Test
    fun `WHEN can not open file action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val downloadState = DownloadState(
            id = "1",
            url = "url",
            fileName = "fileName",
            contentType = "application/zip",
            contentLength = 5242880,
            status = DownloadState.Status.DOWNLOADING,
            directoryPath = "downloads",
            destinationDirectory = "Environment.DIRECTORY_MUSIC",
            private = true,
            createdTime = 33,
            etag = "etag",
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.DownloadAction.CannotOpenFile(
                downloadState,
            ),
        )

        assertEquals(
            SnackbarState.CannotOpenFileError(
                downloadState,
            ),
            finalState.snackbarState,
        )
    }
}
