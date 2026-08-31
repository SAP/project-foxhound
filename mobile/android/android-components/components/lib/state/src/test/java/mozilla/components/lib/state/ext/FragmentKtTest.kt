/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state.ext

import android.view.View
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.TestAction
import mozilla.components.lib.state.TestState
import mozilla.components.lib.state.reducer
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.atLeastOnce
import org.mockito.Mockito.doNothing
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.test.assertNotNull

@RunWith(AndroidJUnit4::class)
class FragmentKtTest {

    @Test
    fun `consumeFrom reads states from store`() = runTest {
        val fragment = mock<Fragment>()
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)
        val store = Store(TestState(counter = 23), ::reducer)

        val onAttachListener = argumentCaptor<View.OnAttachStateChangeListener>()
        var receivedValue = 0

        doNothing().`when`(view).addOnAttachStateChangeListener(onAttachListener.capture())
        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(owner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFrom(
            store,
            mainDispatcher = StandardTestDispatcher(testScheduler),
        ) { state ->
            receivedValue = state.counter
        }

        // Initially 0 because the coroutine hasn't started and lifecycle is INITIALIZED
        assertEquals(0, receivedValue)

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(0, receivedValue)

        // Switching to STARTED state
        owner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        testScheduler.runCurrent()
        // Should have initial state + the increment dispatch earlier
        assertEquals(24, receivedValue)

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(25, receivedValue)

        // View gets detached
        onAttachListener.value.onViewDetachedFromWindow(view)
        doReturn(null).`when`(fragment).view

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(25, receivedValue)
    }

    @Test
    fun `consumeFrom does not run when fragment is detached`() = runTest {
        val fragment = mock<Fragment>()
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.STARTED)
        val store = Store(TestState(counter = 23), ::reducer)

        var receivedValue = 0

        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(owner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFrom(
            store,
            mainDispatcher = StandardTestDispatcher(testScheduler),
        ) { state ->
            receivedValue = state.counter
        }

        testScheduler.runCurrent()
        assertEquals(23, receivedValue)

        doReturn(null).`when`(fragment).activity

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(23, receivedValue)

        doReturn(mock<FragmentActivity>()).`when`(fragment).activity

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(25, receivedValue)
    }

    @Test
    fun `consumeFlow - reads states from store`() = runTest {
        val fragment = mock<Fragment>()
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)
        val store = Store(TestState(counter = 23), ::reducer)

        val onAttachListener = argumentCaptor<View.OnAttachStateChangeListener>()
        var receivedValue = 0

        doNothing().`when`(view).addOnAttachStateChangeListener(onAttachListener.capture())
        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(owner).`when`(fragment).viewLifecycleOwner
        doReturn(owner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFlow(
            from = store,
            owner = owner,
            mainDispatcher = StandardTestDispatcher(testScheduler),
        ) { flow ->
            flow.collect { state ->
                receivedValue = state.counter
            }
        }

        // Before runCurrent, nothing is executed
        assertEquals(0, receivedValue)

        testScheduler.runCurrent() // Processes the launch and the yield() inside consumeFlow
        assertEquals(0, receivedValue)

        owner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        testScheduler.runCurrent()
        assertEquals(23, receivedValue)

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(24, receivedValue)

        // View gets detached
        onAttachListener.value.onViewDetachedFromWindow(view)
        doReturn(null).`when`(fragment).view

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(24, receivedValue)
    }

    @Test
    fun `consumeFlow - uses fragment as lifecycle owner by default`() = runTest {
        val fragment = mock<Fragment>()
        val fragmentLifecycleOwner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)
        val view = mock<View>()
        val store = Store(TestState(counter = 23), ::reducer)

        var receivedValue = 0

        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(fragmentLifecycleOwner).`when`(fragment).viewLifecycleOwner
        doReturn(fragmentLifecycleOwner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFlow(
            from = store,
            mainDispatcher = StandardTestDispatcher(testScheduler),
        ) { flow ->
            flow.collect { state ->
                receivedValue = state.counter
            }
        }

        testScheduler.runCurrent()
        assertEquals(0, receivedValue)

        fragmentLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        testScheduler.runCurrent()
        assertEquals(23, receivedValue)
    }

    @Test
    fun `consumeFlow - creates flow synchronously`() = runTest {
        val fragment = mock<Fragment>()
        val fragmentLifecycle = mock<LifecycleRegistry>()
        val view = mock<View>()
        val store = Store(TestState(counter = 23), ::reducer)
        val owner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)

        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(fragmentLifecycle).`when`(fragment).lifecycle
        doReturn(owner).`when`(fragment).viewLifecycleOwner
        doReturn(view).`when`(fragment).view

        fragment.consumeFlow(store) { flow ->
            flow.collect { }
        }

        verify(fragmentLifecycle, atLeastOnce()).addObserver(any())
    }

    @Test
    fun `consumeFlow does not collect when view lifecycle destroyed before collection`() = runTest {
        val fragment = mock<Fragment>()
        val viewMock = mock<View>()
        val viewLifecycleOwner = MockedLifecycleOwner(Lifecycle.State.CREATED)
        val store = Store(TestState(counter = 42), ::reducer)

        var collectedValue: Int? = null
        val attachStateChangeListenerCaptor = ArgumentCaptor.forClass(View.OnAttachStateChangeListener::class.java)

        doNothing().`when`(viewMock).addOnAttachStateChangeListener(attachStateChangeListenerCaptor.capture())
        `when`(fragment.activity).thenReturn(mock(FragmentActivity::class.java))
        `when`(fragment.view).thenReturn(viewMock)
        `when`(fragment.viewLifecycleOwner).thenReturn(viewLifecycleOwner)
        `when`(fragment.lifecycle).thenReturn(viewLifecycleOwner.lifecycle)

        // Call consumeFlow. Collection is set up but not active due to CREATED state.
        fragment.consumeFlow(
            from = store,
            mainDispatcher = StandardTestDispatcher(testScheduler),
        ) { flow ->
            flow.collect { state -> collectedValue = state.counter }
        }

        testScheduler.runCurrent()
        verify(viewMock).addOnAttachStateChangeListener(attachStateChangeListenerCaptor.capture())
        assertNotNull(
            attachStateChangeListenerCaptor.value,
            "OnAttachStateChangeListener should have been captured",
        )

        store.dispatch(TestAction.IncrementAction)

        `when`(fragment.view).thenReturn(null)

        attachStateChangeListenerCaptor.value.onViewDetachedFromWindow(viewMock)
        `when`(viewMock.isAttachedToWindow).thenReturn(false)

        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        testScheduler.runCurrent()

        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
        testScheduler.runCurrent()

        assertEquals(null, collectedValue)
    }

    @Test
    fun `consumeFlow stops collecting when view detached mid flow`() = runTest {
        val fragment = mock<Fragment>()
        val viewMock = mock<View>()
        // Start lifecycle in a state where collection can begin once STARTED
        val viewLifecycleOwner = MockedLifecycleOwner(Lifecycle.State.CREATED)

        val store = Store(
            TestState(counter = 10), // Initial state
            ::reducer,
        )

        var collectedValue: Int? = null
        val collectedItems = mutableListOf<Int>()
        val firstItemLatch = CountDownLatch(1)
        val secondItemLatch = CountDownLatch(1)
        // This latch should NOT be hit for the third item
        val thirdItemLatch = CountDownLatch(1)

        val attachStateChangeListenerCaptor =
            ArgumentCaptor.forClass(View.OnAttachStateChangeListener::class.java)

        doNothing().`when`(viewMock)
            .addOnAttachStateChangeListener(attachStateChangeListenerCaptor.capture())
        `when`(viewMock.isAttachedToWindow).thenReturn(true) // View is initially attached

        `when`(fragment.activity).thenReturn(mozilla.components.support.test.mock<FragmentActivity>())
        `when`(fragment.view).thenReturn(viewMock) // View is initially available
        `when`(fragment.viewLifecycleOwner).thenReturn(viewLifecycleOwner)
        `when`(fragment.lifecycle).thenReturn(viewLifecycleOwner.lifecycle)

        fragment.consumeFlow(from = store, mainDispatcher = StandardTestDispatcher(testScheduler)) { flow ->
            flow.collect { state ->
                collectedValue = state.counter
                collectedItems.add(state.counter)
                when (state.counter) {
                    10 -> firstItemLatch.countDown()
                    11 -> secondItemLatch.countDown()
                    12 -> thirdItemLatch.countDown() // Should not reach here
                }
            }
        }

        verify(viewMock).addOnAttachStateChangeListener(attachStateChangeListenerCaptor.capture())
        assertNotNull(
            attachStateChangeListenerCaptor.value,
            "OnAttachStateChangeListener should have been captured",
        )

        // Move to STARTED to allow collection of initial state (10)
        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        testScheduler.advanceUntilIdle()

        assertTrue(
            "Initial item (10) should have been collected",
            firstItemLatch.await(1, TimeUnit.SECONDS),
        )
        assertEquals("Collected value should be 10", 10, collectedValue)

        // Dispatch and collect a second item (11)
        store.dispatch(TestAction.IncrementAction) // counter becomes 11
        testScheduler.advanceUntilIdle()

        assertTrue(
            "Second item (11) should have been collected",
            secondItemLatch.await(1, TimeUnit.SECONDS),
        )
        assertEquals("Collected value should be 11", 11, collectedValue)

        // Now, simulate view detachment - this should cancel the viewScope
        attachStateChangeListenerCaptor.value.onViewDetachedFromWindow(viewMock)
        `when`(fragment.view).thenReturn(null) // Fragment's view is now null
        `when`(viewMock.isAttachedToWindow).thenReturn(false) // View is no longer attached

        // Optional: Also move lifecycle to DESTROYED to be thorough
        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.DESTROYED

        // Run any tasks that result from detachment/destruction
        testScheduler.runCurrent()
        testScheduler.advanceUntilIdle()

        // Attempt to dispatch a third item (12)
        store.dispatch(TestAction.IncrementAction) // counter becomes 12
        testScheduler.advanceUntilIdle()

        // Verify the third item (12) was NOT collected
        assertFalse(
            "Third item (12) should NOT have been collected after detachment/destruction. Collected items: $collectedItems",
            thirdItemLatch.await(50, TimeUnit.MILLISECONDS),
        )
        assertEquals(
            "Collected value should remain 11 (the last value before cancellation)",
            11,
            collectedValue,
        )
        assertTrue("Collected items should not contain 12", !collectedItems.contains(12))
        assertEquals("Should have collected 2 items (10, 11)", 2, collectedItems.size)
    }
}
