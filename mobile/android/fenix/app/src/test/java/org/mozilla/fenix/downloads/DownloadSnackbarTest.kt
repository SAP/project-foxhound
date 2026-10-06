/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState

@RunWith(AndroidJUnit4::class)
class DownloadSnackbarTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `GIVEN previous snackbar was DownloadInProgress WHEN download is cancelled THEN snackbar is dismissed`() = runTest(testDispatcher) {
        val appStore = spyk(
            AppStore(
                AppState(
                    snackbarState = SnackbarState.None(previous = SnackbarState.DownloadInProgress("downloadId")),
                ),
            ),
        )
        val download = DownloadState(
            url = "https://www.mozilla.org",
            sessionId = "test-tab",
            id = "downloadId",
            status = DownloadState.Status.CANCELLED,
        )

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "test-tab")),
                selectedTabId = "test-tab",
                downloads = mapOf("downloadId" to download),
            ),
        )

        val downloadSnackbar = DownloadSnackbar(store, appStore, testDispatcher)

        downloadSnackbar.start()
        testDispatcher.scheduler.advanceUntilIdle()

        verify { appStore.dispatch(AppAction.SnackbarAction.SnackbarDismissed) }
    }

    @Test
    fun `GIVEN previous snackbar is download completed WHEN download is completed THEN snackbar is not dismissed`() = runTest(testDispatcher) {
        val download = DownloadState(
            url = "https://www.mozilla.org",
            sessionId = "test-tab",
            id = "downloadId",
            status = DownloadState.Status.COMPLETED,
        )

        val appStore = spyk(
            AppStore(
                AppState(
                    snackbarState = SnackbarState.None(
                        previous = SnackbarState.DownloadCompleted(
                            download,
                        ),
                    ),
                ),
            ),
        )

        val store = BrowserStore(
            BrowserState(
                tabs = listOf(createTab("https://www.mozilla.org", id = "test-tab")),
                selectedTabId = "test-tab",
                downloads = mapOf("downloadId" to download),
            ),
        )

        val downloadSnackbar = DownloadSnackbar(store, appStore)

        downloadSnackbar.start()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(exactly = 0) { appStore.dispatch(AppAction.SnackbarAction.SnackbarDismissed) }
    }
}
