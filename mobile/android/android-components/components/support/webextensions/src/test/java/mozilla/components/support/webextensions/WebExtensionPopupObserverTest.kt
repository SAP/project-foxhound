/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.webextensions

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.WebExtensionAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.WebExtensionState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineSession
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class WebExtensionPopupObserverTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `observes and forwards request to open popup`() = runTest(testDispatcher) {
        val extensionId = "ext1"
        val engineSession: EngineSession = mock()
        val store = BrowserStore(
            BrowserState(
                extensions = mapOf(extensionId to WebExtensionState(extensionId)),
            ),
        )

        var extensionOpeningPopup: WebExtensionState? = null
        val observer = WebExtensionPopupObserver(
            store,
            mainDispatcher = testDispatcher,
            onOpenPopup = {
                extensionOpeningPopup = it
            },
        )

        observer.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(extensionOpeningPopup)

        store.dispatch(WebExtensionAction.UpdatePopupSessionAction(extensionId, popupSession = engineSession))
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(extensionOpeningPopup)
        assertEquals(extensionId, extensionOpeningPopup!!.id)
        assertEquals(engineSession, extensionOpeningPopup.popupSession)

        // Verify that stopped feature does not observe and forward requests to open popup
        extensionOpeningPopup = null
        observer.stop()
        store.dispatch(WebExtensionAction.UpdatePopupSessionAction(extensionId, popupSession = mock()))

        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(extensionOpeningPopup)
    }
}
