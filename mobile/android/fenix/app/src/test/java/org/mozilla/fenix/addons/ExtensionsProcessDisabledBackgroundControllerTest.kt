/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ExtensionsProcessAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppState

class ExtensionsProcessDisabledBackgroundControllerTest {

    private val dispatcher = StandardTestDispatcher()

    @Test
    fun `WHEN app is backgrounded AND extension process spawning threshold is exceeded THEN onExtensionsProcessDisabled is invoked`() =
        runTest(dispatcher) {
            val browserStore = BrowserStore(BrowserState())
            val appStore = AppStore(AppState(isForeground = false))
            var invoked = false

            val controller = ExtensionsProcessDisabledBackgroundController(
                browserStore,
                appStore,
                dispatcher,
                onExtensionsProcessDisabled = {
                    invoked = true
                },
            )

            controller.start()

            browserStore.dispatch(ExtensionsProcessAction.ShowPromptAction(show = true))
            dispatcher.scheduler.advanceUntilIdle()

            assertTrue(invoked)
        }

    @Test
    fun `WHEN app is in foreground AND extension process spawning threshold is exceeded THEN onExtensionsProcessDisabled is not invoked`() =
        runTest(dispatcher) {
            val browserStore = BrowserStore(BrowserState())
            val appStore = AppStore(AppState(isForeground = true))
            var invoked = false

            val controller = ExtensionsProcessDisabledBackgroundController(
                browserStore,
                appStore,
                dispatcher,
                onExtensionsProcessDisabled = {
                    invoked = true
                },
            )

            controller.start()

            browserStore.dispatch(ExtensionsProcessAction.ShowPromptAction(show = true))
            dispatcher.scheduler.advanceUntilIdle()

            assertFalse(invoked)
        }
}
