/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bindings

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.FindInPageAction

class FindInPageBindingTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `WHEN find in page started action is dispatched THEN launch find in page feature`() = runTest(testDispatcher) {
        val appStore = AppStore()
        var onFindInPageLaunchCalled = false

        val binding = FindInPageBinding(
            appStore = appStore,
            onFindInPageLaunch = { onFindInPageLaunchCalled = true },
            mainDispatcher = testDispatcher,
        )
        binding.start()

        appStore.dispatch(FindInPageAction.FindInPageStarted)

        // Wait for FindInPageAction.FindInPageStarted
        testDispatcher.scheduler.advanceUntilIdle()
        // Wait for FindInPageAction.FindInPageShown

        assertFalse(appStore.state.showFindInPage)

        assertTrue(onFindInPageLaunchCalled)
    }
}
