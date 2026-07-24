/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state

import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.util.concurrent.Executors

class StoreTest {
    @Test
    fun `Dispatching Action executes reducers and creates new State`() {
        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        store.dispatch(TestAction.IncrementAction)

        assertEquals(24, store.state.counter)

        store.dispatch(TestAction.DecrementAction)
        store.dispatch(TestAction.DecrementAction)

        assertEquals(22, store.state.counter)
    }

    @Test
    fun `Observer gets notified about state changes`() {
        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        var observedValue = 0

        store.observeManually { state -> observedValue = state.counter }.also {
            it.resume()
        }

        store.dispatch(TestAction.IncrementAction)

        assertEquals(24, observedValue)
    }

    @Test
    fun `Observer gets initial value before state changes`() {
        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        var observedValue = 0

        store.observeManually { state -> observedValue = state.counter }.also {
            it.resume()
        }

        assertEquals(23, observedValue)
    }

    @Test
    fun `Observer does not get notified if state does not change`() {
        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        var stateChangeObserved = false

        store.observeManually { stateChangeObserved = true }.also {
            it.resume()
        }

        // Initial state observed
        assertTrue(stateChangeObserved)
        stateChangeObserved = false

        store.dispatch(TestAction.DoNothingAction)

        assertFalse(stateChangeObserved)
    }

    @Test
    fun `Observer does not get notified after unsubscribe`() {
        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        var observedValue = 0

        val subscription = store.observeManually { state ->
            observedValue = state.counter
        }.also {
            it.resume()
        }

        store.dispatch(TestAction.IncrementAction)

        assertEquals(24, observedValue)

        store.dispatch(TestAction.DecrementAction)

        assertEquals(23, observedValue)

        subscription.unsubscribe()

        store.dispatch(TestAction.DecrementAction)

        assertEquals(23, observedValue)
        assertEquals(22, store.state.counter)
    }

    @Test
    fun `Middleware chain gets executed in order`() {
        val incrementMiddleware: Middleware<TestState, TestAction> = { store, next, action ->
            if (action == TestAction.DoNothingAction) {
                store.dispatch(TestAction.IncrementAction)
            }

            next(action)
        }

        val doubleMiddleware: Middleware<TestState, TestAction> = { store, next, action ->
            if (action == TestAction.DoNothingAction) {
                store.dispatch(TestAction.DoubleAction)
            }

            next(action)
        }

        val store = Store(
            TestState(counter = 0),
            ::reducer,
            listOf(
                incrementMiddleware,
                doubleMiddleware,
            ),
        )

        store.dispatch(TestAction.DoNothingAction)

        assertEquals(2, store.state.counter)

        store.dispatch(TestAction.DoNothingAction)

        assertEquals(6, store.state.counter)

        store.dispatch(TestAction.DoNothingAction)

        assertEquals(14, store.state.counter)

        store.dispatch(TestAction.DecrementAction)

        assertEquals(13, store.state.counter)
    }

    @Test
    fun `Middleware can intercept actions`() {
        val interceptingMiddleware: Middleware<TestState, TestAction> = { _, _, _ ->
            // Do nothing!
        }

        val store = Store(
            TestState(counter = 0),
            ::reducer,
            listOf(interceptingMiddleware),
        )

        store.dispatch(TestAction.IncrementAction)
        assertEquals(0, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(0, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(0, store.state.counter)
    }

    @Test
    fun `Middleware can rewrite actions`() {
        val rewritingMiddleware: Middleware<TestState, TestAction> = { _, next, _ ->
            next(TestAction.DecrementAction)
        }

        val store = Store(
            TestState(counter = 0),
            ::reducer,
            listOf(rewritingMiddleware),
        )

        store.dispatch(TestAction.IncrementAction)
        assertEquals(-1, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(-2, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(-3, store.state.counter)
    }

    @Test
    fun `Middleware can intercept and dispatch other action instead`() {
        val rewritingMiddleware: Middleware<TestState, TestAction> = { store, next, action ->
            if (action == TestAction.IncrementAction) {
                store.dispatch(TestAction.DecrementAction)
            } else {
                next(action)
            }
        }

        val store = Store(
            TestState(counter = 0),
            ::reducer,
            listOf(rewritingMiddleware),
        )

        store.dispatch(TestAction.IncrementAction)
        assertEquals(-1, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(-2, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(-3, store.state.counter)
    }

    @Test
    fun `Middleware sees state before and after reducing`() {
        var countBefore = -1
        var countAfter = -1

        val observingMiddleware: Middleware<TestState, TestAction> = { store, next, action ->
            countBefore = store.state.counter
            next(action)
            countAfter = store.state.counter
        }

        val store = Store(
            TestState(counter = 0),
            ::reducer,
            listOf(observingMiddleware),
        )

        store.dispatch(TestAction.IncrementAction)
        assertEquals(0, countBefore)
        assertEquals(1, countAfter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(1, countBefore)
        assertEquals(2, countAfter)

        store.dispatch(TestAction.IncrementAction)
        assertEquals(2, countBefore)
        assertEquals(3, countAfter)

        store.dispatch(TestAction.DecrementAction)
        assertEquals(3, countBefore)
        assertEquals(2, countAfter)
    }

    @Test
    fun `Middleware can catch exceptions in reducer`() {
        var caughtException: Exception? = null

        val catchingMiddleware: Middleware<TestState, TestAction> = { _, next, action ->
            try {
                next(action)
            } catch (e: Exception) {
                caughtException = e
            }
        }

        val store = Store(
            TestState(counter = 0),
            { _: State, _: Action -> throw IOException() },
            listOf(catchingMiddleware),
        )

        store.dispatch(TestAction.IncrementAction)

        assertNotNull(caughtException)
        assertTrue(caughtException is IOException)
    }

    @Test
    fun `Dispatching Actions from a different thread from middleware does not create concurrent write problems`() = runTest {
        val middlewareJobs = mutableListOf<Job>()
        val middlewareDispatcher = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
        val storeDispatcher = Executors.newSingleThreadExecutor().asCoroutineDispatcher()
        val middleware = object : Middleware<TestState, TestAction> {
            override fun invoke(
                store: Store<TestState, TestAction>,
                next: (TestAction) -> Unit,
                action: TestAction,
            ) {
                if (action is TestAction.DecrementAction) {
                    middlewareJobs += this@runTest.launch(middlewareDispatcher) {
                        delay(5)
                        store.dispatch(TestAction.IncrementAction)
                    }
                }
                next(action)
            }
        }
        val store = Store(
            TestState(counter = 23),
            ::reducer,
            listOf(middleware),
        )

        val storeJobs = mutableListOf<Job>()
        for (i in 0..10_000) {
            storeJobs += this.launch(storeDispatcher) { store.dispatch(TestAction.DecrementAction) }
        }
        storeJobs.joinAll()
        assertEquals(10_001 * 2, storeJobs.size + middlewareJobs.size)
        middlewareJobs.joinAll()
        middlewareDispatcher.close()
        storeDispatcher.close()

        assertEquals(23, store.state.counter)
    }
}
