/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import junit.framework.TestCase.assertEquals
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.downloads.DownloadsScreenTestTag
import org.mozilla.fenix.downloads.listscreen.DownloadsScreen
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIAction
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIStore
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.downloads.listscreen.store.TimeCategory
import kotlin.test.assertIs

@RunWith(AndroidJUnit4::class)
class DownloadsScreenDialogTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun confirmDeleteDialogClickedTest() {
        var dispatchedAction: DownloadUIAction.AddPendingDeletionSet? = null

        val downloadedFileItem = FileItem(
            id = "1",
            fileName = "test_file.pdf",
            url = "https://example.com/file",
            description = "1.2 MB",
            directoryPath = "/Downloads",
            displayedShortUrl = "example.com",
            contentType = "application/pdf",
            status = FileItem.Status.Completed,
            filePath = "/path/to/file",
            timeCategory = TimeCategory.TODAY,
        )

        val middleware = createMiddleware { action ->
            if (action is DownloadUIAction.AddPendingDeletionSet) {
                dispatchedAction = action
            }
        }

        val store = DownloadUIStore(
            initialState = DownloadUIState.INITIAL.copy(
                dialogState = DownloadUIState.DialogState.DeleteConfirmation(setOf(downloadedFileItem)),
            ),
            middleware = listOf(middleware),
        )

        composeTestRule.setContent {
            DownloadsScreen(
                downloadsStore = store,
                onItemClick = {},
            )
        }

        composeTestRule.onNodeWithTag(DownloadsScreenTestTag.DELETE_DIALOG_CONFIRM_BUTTON).performClick()

        assertTrue(dispatchedAction != null)

        assertEquals(true, dispatchedAction?.removeFromDisk)
    }

    @Test
    fun cancelDeleteDialogClickedTest() {
        var dispatchedAction: DownloadUIAction.DismissDeleteDialog? = null

        val downloadedFileItem = FileItem(
            id = "1",
            fileName = "test_file.pdf",
            url = "https://example.com/file",
            description = "1.2 MB",
            directoryPath = "/Downloads",
            displayedShortUrl = "example.com",
            contentType = "application/pdf",
            status = FileItem.Status.Completed,
            filePath = "/path/to/file",
            timeCategory = TimeCategory.TODAY,
        )

        val middleware = createMiddleware { action ->
            if (action is DownloadUIAction.DismissDeleteDialog) {
                dispatchedAction = action
            }
        }

        val store = DownloadUIStore(
            initialState = DownloadUIState.INITIAL.copy(
                dialogState = DownloadUIState.DialogState.DeleteConfirmation(setOf(downloadedFileItem)),
            ),
            middleware = listOf(middleware),
        )

        composeTestRule.setContent {
            DownloadsScreen(
                downloadsStore = store,
                onItemClick = {},
            )
        }

        composeTestRule.onNodeWithTag(DownloadsScreenTestTag.DELETE_DIALOG_CANCEL_BUTTON).performClick()

        assertIs<DownloadUIAction.DismissDeleteDialog>(dispatchedAction)
    }

    private fun createMiddleware(
        onAction: (DownloadUIAction) -> Unit,
    ) = object : Middleware<DownloadUIState, DownloadUIAction> {
        override fun invoke(
            store: Store<DownloadUIState, DownloadUIAction>,
            next: (DownloadUIAction) -> Unit,
            action: DownloadUIAction,
        ) {
            onAction(action)
            next(action)
        }
    }
}
