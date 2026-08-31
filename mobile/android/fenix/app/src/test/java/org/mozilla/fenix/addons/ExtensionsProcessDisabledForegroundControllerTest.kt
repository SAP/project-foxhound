/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import android.view.View
import android.widget.Button
import androidx.appcompat.app.AlertDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ExtensionsProcessAction
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppState
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ExtensionsProcessDisabledForegroundControllerTest {
    private val dispatcher = StandardTestDispatcher()

    @Test
    fun `WHEN showExtensionsProcessDisabledPrompt is true AND positive button clicked then enable extension process spawning`() =
        runTest(dispatcher) {
            val browserStore = BrowserStore()
            val dialog: AlertDialog = mockk(relaxed = true)
            val builder: MaterialAlertDialogBuilder = mockk(relaxed = true)
            val controller = ExtensionsProcessDisabledForegroundController(
                context = testContext,
                appStore = AppStore(AppState(isForeground = true)),
                browserStore = browserStore,
                builder = builder,
                appName = "TestApp",
                dispatcher = dispatcher,
            )
            val buttonsContainerCaptor = slot<View>()

            controller.start()

            every { builder.show() } returns dialog

            assertFalse(browserStore.state.showExtensionsProcessDisabledPrompt)
            assertFalse(browserStore.state.extensionsProcessDisabled)

            // Pretend the process has been disabled and we show the dialog.
            browserStore.dispatch(ExtensionsProcessAction.DisabledAction)
            browserStore.dispatch(ExtensionsProcessAction.ShowPromptAction(show = true))
            dispatcher.scheduler.advanceUntilIdle()
            assertTrue(browserStore.state.showExtensionsProcessDisabledPrompt)
            assertTrue(browserStore.state.extensionsProcessDisabled)

            verify { builder.setView(capture(buttonsContainerCaptor)) }
            verify { builder.show() }

            buttonsContainerCaptor.captured.findViewById<Button>(R.id.positive).performClick()

            assertFalse(browserStore.state.showExtensionsProcessDisabledPrompt)
            assertFalse(browserStore.state.extensionsProcessDisabled)
            verify { dialog.dismiss() }
        }

    @Test
    fun `WHEN showExtensionsProcessDisabledPrompt is true AND negative button clicked then dismiss without enabling extension process spawning`() =
        runTest(dispatcher) {
            val browserStore = BrowserStore()
            val dialog: AlertDialog = mockk(relaxed = true)
            val builder: MaterialAlertDialogBuilder = mockk(relaxed = true)
            val controller = ExtensionsProcessDisabledForegroundController(
                context = testContext,
                appStore = AppStore(AppState(isForeground = true)),
                browserStore = browserStore,
                builder = builder,
                appName = "TestApp",
                dispatcher = dispatcher,
            )
            val buttonsContainerCaptor = slot<View>()

            controller.start()

            every { builder.show() } returns dialog

            assertFalse(browserStore.state.showExtensionsProcessDisabledPrompt)
            assertFalse(browserStore.state.extensionsProcessDisabled)

            // Pretend the process has been disabled and we show the dialog.
            browserStore.dispatch(ExtensionsProcessAction.DisabledAction)
            browserStore.dispatch(ExtensionsProcessAction.ShowPromptAction(show = true))
            dispatcher.scheduler.advanceUntilIdle()
            assertTrue(browserStore.state.showExtensionsProcessDisabledPrompt)
            assertTrue(browserStore.state.extensionsProcessDisabled)

            verify { builder.setView(capture(buttonsContainerCaptor)) }
            verify { builder.show() }

            buttonsContainerCaptor.captured.findViewById<Button>(R.id.negative).performClick()

            assertFalse(browserStore.state.showExtensionsProcessDisabledPrompt)
            assertTrue(browserStore.state.extensionsProcessDisabled)
            verify { dialog.dismiss() }
        }

    @Test
    fun `WHEN dispatching the same event twice THEN the dialog should only be created once`() =
        runTest(dispatcher) {
            val browserStore = BrowserStore()
            val dialog: AlertDialog = mockk(relaxed = true)
            val builder: MaterialAlertDialogBuilder = mockk(relaxed = true)
            val controller = ExtensionsProcessDisabledForegroundController(
                context = testContext,
                appStore = AppStore(AppState(isForeground = true)),
                browserStore = browserStore,
                builder = builder,
                appName = "TestApp",
                dispatcher = dispatcher,
            )
            val buttonsContainerCaptor = slot<View>()

            controller.start()

            every { builder.show() } returns dialog

            // First dispatch...
            browserStore.dispatch(ExtensionsProcessAction.ShowPromptAction(show = true))
            dispatcher.scheduler.advanceUntilIdle()

            // Second dispatch... without having dismissed the dialog before!
            browserStore.dispatch(ExtensionsProcessAction.ShowPromptAction(show = true))
            dispatcher.scheduler.advanceUntilIdle()

            verify { builder.setView(capture(buttonsContainerCaptor)) }
            verify(exactly = 1) { builder.show() }

            // Click a button to dismiss the dialog.
            buttonsContainerCaptor.captured.findViewById<Button>(R.id.negative).performClick()
        }
}
