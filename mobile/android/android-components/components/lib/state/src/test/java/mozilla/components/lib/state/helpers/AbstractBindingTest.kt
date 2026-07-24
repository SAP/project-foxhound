/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state.helpers

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.test.StandardTestDispatcher
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.TestAction
import mozilla.components.lib.state.TestState
import mozilla.components.lib.state.reducer
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class AbstractBindingTest {

    val testDispatcher = StandardTestDispatcher()

    @Test
    fun `binding onState is invoked when a flow is created`() {
        val store = Store(
            TestState(counter = 0),
            ::reducer,
        )

        val binding = TestBinding(store)
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(binding.invoked)

        binding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(binding.invoked)
    }

    @Test
    fun `binding has no state changes when only stop is invoked`() {
        val store = Store(
            TestState(counter = 0),
            ::reducer,
        )

        val binding = TestBinding(store)
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(binding.invoked)

        binding.stop()
        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(binding.invoked)
    }

    @Test
    fun `binding does not get state updates after stopped`() {
        val store = Store(
            TestState(counter = 0),
            ::reducer,
        )

        var counter = 0

        val binding = TestBinding(store) {
            counter++
            // After we stop, we shouldn't get updates for the third action dispatched.
            if (counter >= 3) {
                fail()
            }
        }
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(TestAction.IncrementAction)

        binding.start()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(TestAction.IncrementAction)

        binding.stop()
        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(TestAction.IncrementAction)
    }

    inner class TestBinding(
        store: Store<TestState, TestAction>,
        private val onStateUpdated: (TestState) -> Unit = {},
    ) : AbstractBinding<TestState>(store, testDispatcher) {
        var invoked = false
        override suspend fun onState(flow: Flow<TestState>) {
            invoked = true
            flow.collect { onStateUpdated(it) }
        }
    }
}
