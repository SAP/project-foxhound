/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state.ext

import android.view.View
import androidx.lifecycle.Lifecycle
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.TestAction
import mozilla.components.lib.state.TestState
import mozilla.components.lib.state.reducer
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doNothing
import kotlin.coroutines.ContinuationInterceptor

@RunWith(AndroidJUnit4::class)
class ViewKtTest {

    @Test
    @Synchronized
    fun `consumeFrom reads states from store`() = runTest {
        val view = mock<View>()
        val owner = MockedLifecycleOwner(Lifecycle.State.INITIALIZED)

        val store = Store(
            TestState(counter = 23),
            ::reducer,
        )

        val onAttachListener = argumentCaptor<View.OnAttachStateChangeListener>()
        var receivedValue = 0
        doNothing().`when`(view).addOnAttachStateChangeListener(onAttachListener.capture())

        view.consumeFrom(
            store,
            owner,
            mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        ) { state ->
            receivedValue = state.counter
        }

        testScheduler.runCurrent()
        // Nothing received yet.
        assertEquals(0, receivedValue)

        // Updating state: Nothing received yet.
        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(0, receivedValue)

        // Switching to STARTED state: Receiving initial state
        owner.lifecycleRegistry.currentState = Lifecycle.State.STARTED
        testScheduler.runCurrent()
        assertEquals(24, receivedValue)

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(25, receivedValue)

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(26, receivedValue)

        // View gets detached
        onAttachListener.value.onViewDetachedFromWindow(view)

        store.dispatch(TestAction.IncrementAction)
        testScheduler.runCurrent()
        assertEquals(26, receivedValue)
    }
}
