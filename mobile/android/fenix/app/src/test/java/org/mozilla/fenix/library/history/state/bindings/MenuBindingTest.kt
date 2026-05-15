/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.library.history.state.bindings

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.library.history.HistoryFragmentAction
import org.mozilla.fenix.library.history.HistoryFragmentState
import org.mozilla.fenix.library.history.HistoryFragmentStore

class MenuBindingTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `WHEN the mode is updated THEN the menu is invalidated`() = runTest(testDispatcher) {
        var menuInvalidated = false
        val store = HistoryFragmentStore(HistoryFragmentState.initial.copy(mode = HistoryFragmentState.Mode.Syncing))
        val binding = MenuBinding(
            store = store,
            invalidateOptionsMenu = { menuInvalidated = true },
            mainDispatcher = testDispatcher,
        )

        binding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(menuInvalidated)
    }
}
