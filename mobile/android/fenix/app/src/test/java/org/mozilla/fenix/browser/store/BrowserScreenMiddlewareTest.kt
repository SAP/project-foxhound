/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser.store

import android.content.Context
import androidx.fragment.app.FragmentManager
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.feature.downloads.ui.DownloadCancelDialogFragment
import mozilla.components.lib.crash.CrashReporter
import mozilla.components.lib.state.Middleware
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.Test
import org.mozilla.fenix.browser.store.BrowserScreenAction.CancelPrivateDownloadsOnPrivateTabsClosedAccepted
import org.mozilla.fenix.browser.store.BrowserScreenMiddleware.Companion.CANCEL_PRIVATE_DOWNLOADS_DIALOG_FRAGMENT_TAG

class BrowserScreenMiddlewareTest {
    private val fragmentManager: FragmentManager = mockk(relaxed = true)
    private val crashReporter: CrashReporter = mockk(relaxed = true)

    private val testContext: Context = mockk()

    @Test
    fun `WHEN the last private tab is closing THEN record a breadcrumb and show a warning dialog`() {
        val middleware = spyk(BrowserScreenMiddleware(testContext, crashReporter, fragmentManager))
        val store = buildStore(listOf(middleware))
        val warningDialog: DownloadCancelDialogFragment = mockk(relaxed = true)

        every { middleware.createDownloadCancelDialog(any(), any(), any(), any()) } returns warningDialog

        store.dispatch(BrowserScreenAction.ClosingLastPrivateTab(tabId = "tabId", inProgressPrivateDownloads = 3))

        verify { crashReporter.recordCrashBreadcrumb(any()) }
        verify {
            middleware.createDownloadCancelDialog(
                context = testContext,
                store = store,
                downloadCount = 3,
                tabId = "tabId",
            )
        }
        verify { warningDialog.show(fragmentManager, CANCEL_PRIVATE_DOWNLOADS_DIALOG_FRAGMENT_TAG) }
    }

    @Test
    fun `GIVEN a warning dialog for closing private tabs is shown WHEN the warning is accepted THEN inform about this`() {
        val middleware = spyk(BrowserScreenMiddleware(testContext, crashReporter, fragmentManager))
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserScreenState, BrowserScreenAction>()
        val store = buildStore(listOf(middleware, captureActionsMiddleware))
        val warningDialog: DownloadCancelDialogFragment = mockk(relaxed = true)

        every { middleware.createDownloadCancelDialog(any(), any(), any(), any()) } returns warningDialog

        store.dispatch(BrowserScreenAction.ClosingLastPrivateTab("tabId", 3))

        store.dispatch(CancelPrivateDownloadsOnPrivateTabsClosedAccepted)

        captureActionsMiddleware.assertLastAction(CancelPrivateDownloadsOnPrivateTabsClosedAccepted::class) {}
    }

    private fun buildStore(
        middlewares: List<Middleware<BrowserScreenState, BrowserScreenAction>> = emptyList(),
    ) = BrowserScreenStore(
        middleware = middlewares,
    )
}
