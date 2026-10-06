/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.webextensions

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.WebExtensionAction
import mozilla.components.browser.state.state.ActiveOptionsPage
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.WebExtensionState
import mozilla.components.browser.state.store.BrowserStore
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import kotlin.test.assertNotNull

class WebExtensionOptionsPageObserverTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `observes and forwards request to open options page`() = runTest(testDispatcher) {
        val extensionId = "ext"
        val extensionName = "name"
        val optionsPageUrl = "url"
        val store = BrowserStore(
            BrowserState(
                extensions = mapOf(extensionId to WebExtensionState(extensionId)),
            ),
        )

        var activeOptionsPage: ActiveOptionsPage? = null
        val observer = WebExtensionOptionsPageObserver(
            store,
            mainDispatcher = testDispatcher,
            onOpenOptionsPage = {
                activeOptionsPage = it
            },
        )

        observer.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertNull(activeOptionsPage)

        store.dispatch(
            WebExtensionAction.UpdateOptionsPageSessionAction(
                extensionId,
                "instanceId",
                optionsPageUrl,
                extensionName,
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertNotNull(activeOptionsPage)
        assertEquals("instanceId", activeOptionsPage.instanceId)
        assertEquals(extensionName, activeOptionsPage.name)
        assertEquals(optionsPageUrl, activeOptionsPage.url)
    }

    @Test
    fun `GIVEN options page session exists WHEN the same extension requests again THEN do not call onOpenOptionsPage again`() = runTest(testDispatcher) {
        val extensionId = "ext"
        val store = BrowserStore(
            BrowserState(
                extensions = mapOf(extensionId to WebExtensionState(extensionId)),
            ),
        )

        var callCount = 0
        val observer = WebExtensionOptionsPageObserver(
            store,
            mainDispatcher = testDispatcher,
            onOpenOptionsPage = { callCount++ },
        )
        observer.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            WebExtensionAction.UpdateOptionsPageSessionAction(
                extensionId,
                "instanceId",
                "url",
                "name",
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(1, callCount)

        store.dispatch(
            WebExtensionAction.UpdateOptionsPageSessionAction(
                extensionId,
                "instanceId2",
                "url",
                "name",
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(1, callCount)
    }

    @Test
    fun `GIVEN options page session exists WHEN a different extension requests THEN do not call onOpenOptionsPage again`() = runTest(testDispatcher) {
        val extensionId1 = "ext1"
        val extensionId2 = "ext2"
        val store = BrowserStore(
            BrowserState(
                extensions = mapOf(extensionId1 to WebExtensionState(extensionId1), extensionId2 to WebExtensionState(extensionId2)),
            ),
        )

        var callCount = 0
        val observer = WebExtensionOptionsPageObserver(
            store,
            mainDispatcher = testDispatcher,
            onOpenOptionsPage = { callCount++ },
        )
        observer.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            WebExtensionAction.UpdateOptionsPageSessionAction(
                extensionId1,
                "instanceId1",
                "url",
                "name",
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(1, callCount)

        store.dispatch(
            WebExtensionAction.UpdateOptionsPageSessionAction(
                extensionId2,
                "instanceId2",
                "url",
                "name",
            ),
        )
        testDispatcher.scheduler.advanceUntilIdle()
        assertEquals(1, callCount)
    }
}
