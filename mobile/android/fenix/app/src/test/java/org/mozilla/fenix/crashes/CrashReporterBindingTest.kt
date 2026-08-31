/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.crash.store.CrashAction
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import kotlin.test.assertNotNull

class CrashReporterBindingTest {

    private val testDispatcher = StandardTestDispatcher()

    @Test
    fun `GIVEN CrashAction ShowPrompt WHEN an action is dispatched THEN CrashReporterBinding is called with null crashIDs`() = runTest(testDispatcher) {
        val appStore = AppStore()
        var onReportingCalled = false
        val binding = CrashReporterBinding(
            store = appStore,
            onReporting = { crashIDs ->
                assertEquals(listOf<String>(), crashIDs)
                onReportingCalled = true
            },
            mainDispatcher = testDispatcher,
        )
        binding.start()

        appStore.dispatch(AppAction.CrashActionWrapper(CrashAction.ShowPrompt()))
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(onReportingCalled)
    }

    @Test
    fun `GIVEN CrashAction PullCrashes WHEN an action is dispatched THEN CrashReporterBinding is called with non null crashIDs`() = runTest(testDispatcher) {
        val appStore = AppStore()
        var onReportingCalled = false
        val binding = CrashReporterBinding(
            store = appStore,
            onReporting = { crashIDs ->
                assertNotNull(crashIDs)
                assertEquals(listOf("1", "2"), crashIDs)
                onReportingCalled = true
            },
            mainDispatcher = testDispatcher,
        )
        binding.start()

        appStore.dispatch(AppAction.CrashActionWrapper(CrashAction.ShowPrompt(listOf("1", "2"))))
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(onReportingCalled)
    }
}
