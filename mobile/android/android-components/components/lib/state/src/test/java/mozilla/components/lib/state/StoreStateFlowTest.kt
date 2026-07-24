/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package mozilla.components.lib.state

import junit.framework.TestCase.assertEquals
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StoreStateFlowTest {

    @Test
    fun `initial state is set in store`() {
        val store = Store(
            TestState(counter = 4),
            ::reducer,
        )
        assertEquals(4, store.state.counter)
    }

    @Test
    fun `can increment state in store`() {
        val store = Store(
            TestState(counter = 0),
            ::reducer,
        )
        assertEquals(0, store.state.counter)
        store.dispatch(TestAction.IncrementAction)
        assertEquals(1, store.state.counter)
    }

    @Test
    fun `stateflow exposes incrementing state`() {
        val store = Store(
            TestState(counter = 0),
            ::reducer,
        )
        assertEquals(0, store.stateFlow.value.counter)
        store.dispatch(TestAction.IncrementAction)
        store.dispatch(TestAction.IncrementAction)
        assertEquals(2, store.stateFlow.value.counter)
    }

    @Test
    fun `can collect from stateflow`() = runTest {
        val store = Store(
            TestState(counter = 0),
            ::reducer,
        )
        var counter = 0
        assertEquals(0, counter)
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            store.stateFlow.collect {
                counter = it.counter
            }
        }
        store.dispatch(TestAction.IncrementAction)
        store.dispatch(TestAction.IncrementAction)
        store.dispatch(TestAction.IncrementAction)
        testScheduler.advanceUntilIdle()
        assertEquals(3, counter)
    }
}
