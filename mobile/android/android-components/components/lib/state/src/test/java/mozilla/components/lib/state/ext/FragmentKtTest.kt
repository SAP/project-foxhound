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
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.TestAction
import mozilla.components.lib.state.TestState
import mozilla.components.lib.state.reducer
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import mozilla.components.support.test.rule.MainCoroutineRule
import org.junit.Assert
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.atLeastOnce
import org.mockito.Mockito.doNothing
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class FragmentKtTest {

    @get:Rule
    val coroutinesTestRule = MainCoroutineRule()

    @Test
    @Synchronized
    fun `consumeFrom reads states from store`() {
        val fragment = mock<Fragment>()
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)

        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        val onAttachListener = argumentCaptor<View.OnAttachStateChangeListener>()
        var receivedValue = 0
        var latch = CountDownLatch(1)

        doNothing().`when`(view).addOnAttachStateChangeListener(onAttachListener.capture())
        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(owner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFrom(store) { state ->
            receivedValue = state.counter
            latch.countDown()
        }

        // Nothing received yet.
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(0, receivedValue)

        // Updating state: Nothing received yet.
        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(0, receivedValue)

        // Switching to STARTED state: Receiving initial state
        owner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(24, receivedValue)
        latch = CountDownLatch(1)

        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(25, receivedValue)
        latch = CountDownLatch(1)

        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(26, receivedValue)
        latch = CountDownLatch(1)

        // View gets detached
        onAttachListener.value.onViewDetachedFromWindow(view)

        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(26, receivedValue)
    }

    @Test
    @Synchronized
    fun `consumeFrom does not run when fragment is detached`() {
        val fragment = mock<Fragment>()
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.STARTED)

        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        var receivedValue = 0
        var latch = CountDownLatch(1)

        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(owner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFrom(store) { state ->
            receivedValue = state.counter
            latch.countDown()
        }

        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(23, receivedValue)

        latch = CountDownLatch(1)
        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(24, receivedValue)

        latch = CountDownLatch(1)
        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(25, receivedValue)

        doReturn(null).`when`(fragment).activity

        latch = CountDownLatch(1)
        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(25, receivedValue)

        latch = CountDownLatch(1)
        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(25, receivedValue)

        doReturn(mock<FragmentActivity>()).`when`(fragment).activity

        latch = CountDownLatch(1)
        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(28, receivedValue)
    }

    @Test
    fun `consumeFlow - reads states from store`() {
        val fragment = mock<Fragment>()
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)

        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        val onAttachListener = argumentCaptor<View.OnAttachStateChangeListener>()
        var receivedValue = 0
        var latch = CountDownLatch(1)

        doNothing().`when`(view).addOnAttachStateChangeListener(onAttachListener.capture())
        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(owner).`when`(fragment).viewLifecycleOwner
        doReturn(owner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFlow(
            from = store,
            owner = owner,
        ) { flow ->
            flow.collect { state ->
                receivedValue = state.counter
                latch.countDown()
            }
        }

        // Nothing received yet.
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(0, receivedValue)

        // Updating state: Nothing received yet.
        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(0, receivedValue)

        // Switching to STARTED state: Receiving initial state
        owner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(24, receivedValue)
        latch = CountDownLatch(1)

        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(25, receivedValue)
        latch = CountDownLatch(1)

        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(26, receivedValue)
        latch = CountDownLatch(1)

        // View gets detached
        onAttachListener.value.onViewDetachedFromWindow(view)

        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(26, receivedValue)
    }

    @Test
    fun `consumeFlow - uses fragment as lifecycle owner by default`() {
        val fragment = mock<Fragment>()
        val fragmentLifecycleOwner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)
        val view = mock<View>()
        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        val onAttachListener = argumentCaptor<View.OnAttachStateChangeListener>()
        var receivedValue = 0
        var latch = CountDownLatch(1)

        doNothing().`when`(view).addOnAttachStateChangeListener(onAttachListener.capture())
        doReturn(mock<FragmentActivity>()).`when`(fragment).activity
        doReturn(view).`when`(fragment).view
        doReturn(fragmentLifecycleOwner).`when`(fragment).viewLifecycleOwner

        doReturn(fragmentLifecycleOwner.lifecycle).`when`(fragment).lifecycle

        fragment.consumeFlow(
            from = store,
        ) { flow ->
            flow.collect { state ->
                receivedValue = state.counter
                latch.countDown()
            }
        }

        // Nothing received yet.
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(0, receivedValue)

        // Updating state: Nothing received yet.
        store.dispatch(TestAction.IncrementAction)
        assertFalse(latch.await(1, TimeUnit.SECONDS))
        assertEquals(0, receivedValue)

        // Switching to STARTED state: Receiving initial state
        fragmentLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(24, receivedValue)
        latch = CountDownLatch(1)

        store.dispatch(TestAction.IncrementAction)
        assertTrue(latch.await(1, TimeUnit.SECONDS))
        assertEquals(25, receivedValue)
        latch = CountDownLatch(1)
    }

    @Test
    fun `consumeFlow - creates flow synchronously`() {
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

        // Only way to verify that store.flow was called without triggering the channelFlow
        // producer and in this test we want to make sure we call store.flow before the flow
        // is "produced."
        verify(fragmentLifecycle, atLeastOnce()).addObserver(any())
    }

    @Test
    fun `consumeFlow does not collect when view lifecycle destroyed before collection`() {
        val fragment = mock<Fragment>()
        val viewMock = mock<View>()
        val viewLifecycleOwner = MockedLifecycleOwner(Lifecycle.State.CREATED)

        val store = Store(
            TestState(counter = 42),
            ::reducer,
        )

        var collectedValue: Int? = null
        var collectionAttemptedFor43 = false
        val collectionLatch = CountDownLatch(1) // For item 43 (should not be hit)

        val attachStateChangeListenerCaptor =
            ArgumentCaptor.forClass(View.OnAttachStateChangeListener::class.java)

        doNothing().`when`(viewMock)
            .addOnAttachStateChangeListener(attachStateChangeListenerCaptor.capture())
        `when`(viewMock.isAttachedToWindow).thenReturn(true)
        `when`(fragment.activity).thenReturn(org.mockito.Mockito.mock(FragmentActivity::class.java))
        // View is initially available
        `when`(fragment.view).thenReturn(viewMock)
        `when`(fragment.viewLifecycleOwner).thenReturn(viewLifecycleOwner)
        `when`(fragment.lifecycle).thenReturn(viewLifecycleOwner.lifecycle)

        // Call consumeFlow. Collection is set up but not active due to CREATED state.
        fragment.consumeFlow(
            from = store,
        ) { flow ->
            flow.collect { state ->
                collectedValue = state.counter
                if (state.counter == 43) { // Only care if 43 is collected
                    collectionAttemptedFor43 = true
                    collectionLatch.countDown()
                }
            }
        }

        verify(viewMock).addOnAttachStateChangeListener(attachStateChangeListenerCaptor.capture())
        assertNotNull(
            "OnAttachStateChangeListener should have been captured",
            attachStateChangeListenerCaptor.value,
        )

        store.dispatch(TestAction.IncrementAction)

        `when`(fragment.view).thenReturn(null)

        attachStateChangeListenerCaptor.value.onViewDetachedFromWindow(viewMock)
        `when`(viewMock.isAttachedToWindow).thenReturn(false)

        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.STARTED

        coroutinesTestRule.testDispatcher.scheduler.runCurrent()

        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.DESTROYED

        coroutinesTestRule.testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(
            "Latch for 43 should NOT have counted down. collectedValue: $collectedValue, collectionAttemptedFor43: $collectionAttemptedFor43",
            collectionLatch.await(50, TimeUnit.MILLISECONDS),
        )
        assertFalse("Collection of state 43 should not have occurred", collectionAttemptedFor43)
        if (collectedValue == 43) {
            Assert.fail("collectedValue became 43, but should not have.")
        }
    }

    @Test
    fun `consumeFlow stops collecting when view detached mid flow`() {
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

        `when`(fragment.activity).thenReturn(mock<FragmentActivity>())
        `when`(fragment.view).thenReturn(viewMock) // View is initially available
        `when`(fragment.viewLifecycleOwner).thenReturn(viewLifecycleOwner)
        `when`(fragment.lifecycle).thenReturn(viewLifecycleOwner.lifecycle)

        fragment.consumeFlow(from = store) { flow ->
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
            "OnAttachStateChangeListener should have been captured",
            attachStateChangeListenerCaptor.value,
        )

        // Move to STARTED to allow collection of initial state (10)
        viewLifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        coroutinesTestRule.testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(
            "Initial item (10) should have been collected",
            firstItemLatch.await(1, TimeUnit.SECONDS),
        )
        assertEquals("Collected value should be 10", 10, collectedValue)

        // Dispatch and collect a second item (11)
        store.dispatch(TestAction.IncrementAction) // counter becomes 11
        coroutinesTestRule.testDispatcher.scheduler.advanceUntilIdle()

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
        coroutinesTestRule.testDispatcher.scheduler.runCurrent()
        coroutinesTestRule.testDispatcher.scheduler.advanceUntilIdle()

        // Attempt to dispatch a third item (12)
        store.dispatch(TestAction.IncrementAction) // counter becomes 12
        coroutinesTestRule.testDispatcher.scheduler.advanceUntilIdle()

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
