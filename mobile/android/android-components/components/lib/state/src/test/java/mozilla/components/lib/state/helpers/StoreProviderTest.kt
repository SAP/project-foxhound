/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state.helpers

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.TestAction
import mozilla.components.lib.state.TestState
import mozilla.components.lib.state.helpers.StoreProvider.Companion.buildPersistentStore
import mozilla.components.lib.state.helpers.StoreProvider.Companion.storeProvider
import mozilla.components.lib.state.reducer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StoreProviderTest {
    private val lifecycleOwner = MockedLifecycleOwner(Lifecycle.State.STARTED)

    @Test
    fun `GIVEN same store type was built before WHEN building a new store THEN reuse the state of the previous store`() {
        var store = lifecycleOwner.buildPersistentStore(TestState(23)) { TestStore(it) }.value
        assertEquals(23, store.state.counter)
        var store2 = lifecycleOwner.buildPersistentStore(TestState(123)) { TestStore2(it) }.value
        assertEquals(123, store2.state.counter)

        lifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.DESTROYED

        store = lifecycleOwner.buildPersistentStore(TestState(99)) { TestStore(it) }.value
        assertEquals(23, store.state.counter)
        store2 = lifecycleOwner.buildPersistentStore(TestState(999)) { TestStore2(it) }.value
        assertEquals(123, store2.state.counter)
    }

    @Test
    fun `GIVEN same store type was built before WHEN asking for it THEN return the previously built instance`() {
        val store = lifecycleOwner.buildPersistentStore(TestState(23)) { TestStore(it) }.value
        val store2 = lifecycleOwner.buildPersistentStore(TestState(123)) { TestStore2(it) }.value
        val store3 = lifecycleOwner.storeProvider.get<TestState, TestStore3> { TestStore3(TestState(1234)) }

        var result1 = lifecycleOwner.storeProvider.get<TestStore>()
        var result2: TestStore2? = lifecycleOwner.storeProvider.get()
        var result3: TestStore3 = lifecycleOwner.storeProvider.get<TestState, TestStore3> { TestStore3(TestState(9999)) }
        assertEquals(store, result1)
        assertEquals(store2, result2)
        assertEquals(store3, result3)

        lifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.DESTROYED

        result1 = lifecycleOwner.storeProvider.get<TestStore>()
        result2 = lifecycleOwner.storeProvider.get()
        result3 = lifecycleOwner.storeProvider.get<TestState, TestStore3> { restoredState ->
            TestStore3(restoredState ?: TestState(9999))
        }
        assertNull(result1)
        assertNull(result2)
        assertEquals(store3.state, result3.state)
    }

    @Test
    fun `GIVEN a store is updated after being built WHEN building a new store of the same type THEN reuse the latest state`() {
        val initialState = TestState(23)
        var store = lifecycleOwner.buildPersistentStore(initialState) { Store(it, ::reducer) }.value
        assertEquals(23, store.state.counter)

        store.dispatch(TestAction.IncrementAction)
        val updatedState = initialState.copy(counter = 24)

        lifecycleOwner.lifecycleRegistry.currentState = Lifecycle.State.DESTROYED

        store = lifecycleOwner.buildPersistentStore(initialState) { Store(it, ::reducer) }.value
        assertEquals(updatedState.counter, store.state.counter)
    }
}

private class MockedLifecycleOwner(initialState: Lifecycle.State) : LifecycleOwner, ViewModelStoreOwner {
    val lifecycleRegistry = LifecycleRegistry(this).apply {
        currentState = initialState
    }

    override val lifecycle: Lifecycle = lifecycleRegistry

    override val viewModelStore: ViewModelStore = ViewModelStore()
}

private class TestStore(
    initialState: TestState = TestState(1),
) : Store<TestState, TestAction>(
    initialState = initialState,
    reducer = ::reducer,
    middleware = emptyList(),
)

private class TestStore2(
    initialState: TestState = TestState(2),
) : Store<TestState, TestAction>(
    initialState = initialState,
    reducer = ::reducer,
    middleware = emptyList(),
)

private class TestStore3(
    initialState: TestState = TestState(3),
) : Store<TestState, TestAction>(
    initialState = initialState,
    reducer = ::reducer,
    middleware = emptyList(),
)
