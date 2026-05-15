/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.syncedtabs

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayStore

@OptIn(ExperimentalCoroutinesApi::class)
class SyncButtonBindingTest {
    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `WHEN syncing state is true THEN invoke callback`() = runTest(testDispatcher) {
        var invoked = false
        val store = TabsTrayStore()
        val binding = SyncButtonBinding(store, testDispatcher) { invoked = true }

        binding.start()

        store.dispatch(TabsTrayAction.SyncNow)
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(invoked)
    }

    @Test
    fun `WHEN syncing state is false THEN nothing is invoked`() = runTest(testDispatcher) {
        var invoked = false
        val store = TabsTrayStore()
        val binding = SyncButtonBinding(store, testDispatcher) { invoked = true }

        binding.start()

        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(invoked)

        store.dispatch(TabsTrayAction.SyncCompleted)
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(invoked)
    }
}
