/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.privatemode.feature

import android.view.Window
import android.view.WindowManager.LayoutParams.FLAG_SECURE
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.mock
import org.junit.Test
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

class SecureWindowFeatureTest {

    private val window: Window = mock()
    private val tabId = "test-tab"
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `no-op if no sessions`() = runTest {
        val store = BrowserStore(BrowserState(tabs = emptyList()))
        val feature = SecureWindowFeature(window, store, mainDispatcher = testDispatcher)

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(window, never()).addFlags(FLAG_SECURE)
        verify(window, never()).clearFlags(FLAG_SECURE)
    }

    @Test
    fun `add flags to private session`() = runTest {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = tabId, private = true),
                ),
                selectedTabId = tabId,
            ),
        )
        val feature = SecureWindowFeature(window, store, mainDispatcher = testDispatcher)

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(window).addFlags(FLAG_SECURE)
    }

    @Test
    fun `remove flags from normal session`() = runTest {
        val store = BrowserStore(
            BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = tabId, private = false),
                ),
                selectedTabId = tabId,
            ),
        )
        val feature = SecureWindowFeature(window, store, mainDispatcher = testDispatcher)

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        verify(window).clearFlags(FLAG_SECURE)
    }

    @Test
    fun `remove flags on stop`() = runTest {
        val store = BrowserStore()
        val feature = SecureWindowFeature(window, store, clearFlagOnStop = true, mainDispatcher = testDispatcher)

        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()

        feature.stop()

        verify(window).clearFlags(FLAG_SECURE)
    }
}
