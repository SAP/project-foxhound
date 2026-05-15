/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads

import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.DownloadAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Test

class DownloadUseCasesTest {

    private val captureMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()

    @Test
    fun consumeDownloadUseCase() {
        val store = BrowserStore(middleware = listOf(captureMiddleware))
        val useCases = DownloadsUseCases(store, mock())

        useCases.consumeDownload("tabId", "downloadId")

        captureMiddleware.assertFirstAction(ContentAction.ConsumeDownloadAction::class) { action ->
            assertEquals("tabId", action.sessionId)
            assertEquals("downloadId", action.downloadId)
        }
    }

    @Test
    fun restoreDownloadsUseCase() {
        val store = BrowserStore(middleware = listOf(captureMiddleware))
        val useCases = DownloadsUseCases(store, mock())

        useCases.restoreDownloads()

        captureMiddleware.findFirstAction(DownloadAction.RestoreDownloadsStateAction::class)
    }

    @Test
    fun removeDownloadUseCase() {
        val store = BrowserStore(middleware = listOf(captureMiddleware))
        val useCases = DownloadsUseCases(store, mock())

        useCases.removeDownload("downloadId")

        captureMiddleware.assertFirstAction(DownloadAction.RemoveDownloadAction::class) { action ->
            assertEquals("downloadId", action.downloadId)
        }
    }

    @Test
    fun removeAllDownloadsUseCase() {
        val store = BrowserStore(middleware = listOf(captureMiddleware))
        val useCases = DownloadsUseCases(store, mock())

        useCases.removeAllDownloads()

        captureMiddleware.findFirstAction(DownloadAction.RemoveAllDownloadsAction::class)
    }
}
