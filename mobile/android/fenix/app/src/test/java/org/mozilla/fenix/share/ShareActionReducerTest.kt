package org.mozilla.fenix.share

import io.mockk.mockk
import mozilla.components.concept.sync.TabData
import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.AppStoreReducer
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState

class ShareActionReducerTest {
    @Test
    fun `WHEN ShareToAppFailed action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.ShareAction.ShareToAppFailed,
        )

        assertEquals(
            SnackbarState.ShareToAppFailed,
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN SharedTabsSuccessfully action is dispatched THEN snackbar state is updated`() {
        val destination = listOf("a")
        val tabs = listOf(mockk<TabData>(), mockk<TabData>())
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.ShareAction.SharedTabsSuccessfully(destination, tabs),
        )

        assertEquals(
            SnackbarState.SharedTabsSuccessfully(destination, tabs),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN ShareTabsFailed action is dispatched THEN snackbar state is updated`() {
        val destination = listOf("a")
        val tabs = listOf(mockk<TabData>(), mockk<TabData>())
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.ShareAction.ShareTabsFailed(destination, tabs),
        )

        assertEquals(
            SnackbarState.ShareTabsFailed(destination, tabs),
            finalState.snackbarState,
        )
    }

    @Test
    fun `WHEN CopyLinkToClipboard action is dispatched THEN snackbar state is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.ShareAction.CopyLinkToClipboard,
        )

        assertEquals(
            SnackbarState.CopyLinkToClipboard,
            finalState.snackbarState,
        )
    }
}
