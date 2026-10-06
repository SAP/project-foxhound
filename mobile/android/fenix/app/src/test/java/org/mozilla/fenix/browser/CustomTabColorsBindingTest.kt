/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.browser

import android.view.Window
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.browser.store.BrowserScreenAction.CustomTabColorsUpdated
import org.mozilla.fenix.browser.store.BrowserScreenStore
import org.mozilla.fenix.browser.store.CustomTabColors
import org.robolectric.RobolectricTestRunner

@Suppress("DEPRECATION") // for accessing the window properties
@RunWith(RobolectricTestRunner::class)
class CustomTabColorsBindingTest {

    private val testDispatcher = StandardTestDispatcher()
    private val window: Window = mockk(relaxed = true)
    private val store = BrowserScreenStore()
    private val binding = CustomTabColorsBinding(store, window, testDispatcher)

    @Test
    fun `WHEN colors for the system bars change THEN apply them to the system bars`() = runTest(testDispatcher) {
        binding.start()

        store.dispatch(CustomTabColorsUpdated(CustomTabColors(1, 2, 3, 4, 5)))
        testDispatcher.scheduler.advanceUntilIdle()

        verify { window.statusBarColor = 2 }
        verify { window.navigationBarColor = 3 }
        verify { window.navigationBarDividerColor = 4 }
    }

    @Test
    fun `WHEN custom colors are not available THEN don't apply any color change`() = runTest(testDispatcher) {
        val binding = CustomTabColorsBinding(store, window, testDispatcher)
        binding.start()

        store.dispatch(CustomTabColorsUpdated(CustomTabColors(null, null, null, null)))
        testDispatcher.scheduler.advanceUntilIdle()

        verify(exactly = 0) { window.statusBarColor = any<Int>() }
        verify(exactly = 0) { window.navigationBarColor = any<Int>() }
        verify(exactly = 0) { window.navigationBarDividerColor = any<Int>() }
    }
}
