/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.tabs.toolbar

import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.state.recover.RecoverableTab
import mozilla.components.browser.state.state.recover.TabState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.menu.MenuController
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.whenever
import mozilla.components.ui.tabcounter.TabCounterMenu
import mozilla.components.ui.tabcounter.TabCounterView
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.anyInt
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.eq
import org.mockito.Mockito.spy
import org.mockito.Mockito.verify
import kotlin.coroutines.ContinuationInterceptor
import mozilla.components.ui.tabcounter.R as tabcounterR

@RunWith(AndroidJUnit4::class)
class TabCounterToolbarButtonTest {
    private val showTabs: () -> Unit = mock()
    private val tabCounterMenu: TabCounterMenu = mock()
    private val menuController: MenuController = mock()

    private lateinit var lifecycleOwner: MockedLifecycleOwner

    internal class MockedLifecycleOwner(initialState: Lifecycle.State) : LifecycleOwner {
        override val lifecycle: Lifecycle = LifecycleRegistry(this).apply {
            currentState = initialState
        }
    }

    @Before
    fun setUp() {
        whenever(tabCounterMenu.menuController).thenReturn(menuController)
        lifecycleOwner = MockedLifecycleOwner(Lifecycle.State.STARTED)
    }

    @Test
    fun `WHEN tab counter is created THEN count is 0`() = runTest {
        val button = TabCounterToolbarButton(
            lifecycleOwner = lifecycleOwner,
            countBasedOnSelectedTabType = false,
            showTabs = showTabs,
            store = BrowserStore(),
            menu = tabCounterMenu,
            mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        )

        val view = button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        val counterText: TextView = view.findViewById(tabcounterR.id.counter_text)
        assertEquals("0", counterText.text)
    }

    @Test
    fun `GIVEN showMaskInPrivateMode is false WHEN tab counter is created THEN badge is not visible`() = runTest {
        val button = TabCounterToolbarButton(
            lifecycleOwner = lifecycleOwner,
            countBasedOnSelectedTabType = false,
            showTabs = showTabs,
            store = BrowserStore(),
            menu = tabCounterMenu,
            showMaskInPrivateMode = false,
            mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        )

        val view = button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        val counterMask: View = view.findViewById(tabcounterR.id.counter_mask)
        assertFalse(counterMask.isVisible)
    }

    @Test
    fun `GIVEN showMaskInPrivateMode is true WHEN tab counter is created THEN badge is visible`() = runTest {
        val tab = createTab("https://www.mozilla.org", true, "test-id")
        val store = BrowserStore(BrowserState(tabs = listOf(tab), selectedTabId = "test-id"))
        val button = TabCounterToolbarButton(
            lifecycleOwner = lifecycleOwner,
            countBasedOnSelectedTabType = false,
            showTabs = showTabs,
            store = store,
            menu = tabCounterMenu,
            showMaskInPrivateMode = true,
            mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        )

        val view = button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        val counterMask: View = view.findViewById(tabcounterR.id.counter_mask)
        assertTrue(counterMask.isVisible)
    }

    @Test
    fun `WHEN tab is added THEN tab count is updated`() = runTest {
        val store = BrowserStore()
        val button = spy(
            TabCounterToolbarButton(
                lifecycleOwner = lifecycleOwner,
                countBasedOnSelectedTabType = false,
                showTabs = showTabs,
                store = store,
                menu = tabCounterMenu,
                mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
            ),
        )

        whenever(button.updateCount(anyInt())).then { }
        button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        store.dispatch(
            TabListAction.AddTabAction(createTab("https://www.mozilla.org")),
        )
        testScheduler.advanceUntilIdle()

        verify(button).updateCount(eq(1))
    }

    @Test
    fun `WHEN tab is restored THEN tab count is updated`() = runTest {
        val store = BrowserStore()
        val button = spy(
            TabCounterToolbarButton(
                lifecycleOwner = lifecycleOwner,
                countBasedOnSelectedTabType = false,
                showTabs = showTabs,
                store = store,
                menu = tabCounterMenu,
                mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
            ),
        )

        whenever(button.updateCount(anyInt())).then { }
        button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        store.dispatch(
            TabListAction.RestoreAction(
                listOf(
                    RecoverableTab(
                        engineSessionState = null,
                        state = TabState("a", "https://www.mozilla.org"),
                    ),
                ),
                restoreLocation = TabListAction.RestoreAction.RestoreLocation.BEGINNING,
            ),
        )
        testScheduler.advanceUntilIdle()

        verify(button).updateCount(eq(1))
    }

    @Test
    fun `WHEN tab is removed THEN tab count is updated`() = runTest {
        val tab = createTab("https://www.mozilla.org")
        val store = BrowserStore(BrowserState(tabs = listOf(tab)))
        val button = spy(
            TabCounterToolbarButton(
                lifecycleOwner = lifecycleOwner,
                countBasedOnSelectedTabType = false,
                showTabs = showTabs,
                store = store,
                menu = tabCounterMenu,
                mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
            ),
        )

        whenever(button.updateCount(anyInt())).then { }
        button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        store.dispatch(TabListAction.RemoveTabAction(tab.id))
        testScheduler.advanceUntilIdle()

        verify(button).updateCount(eq(0))
    }

    @Test
    fun `WHEN private tab is added THEN tab count is updated`() = runTest {
        val store = BrowserStore()
        val button = spy(
            TabCounterToolbarButton(
                lifecycleOwner = lifecycleOwner,
                countBasedOnSelectedTabType = false,
                showTabs = showTabs,
                store = store,
                menu = tabCounterMenu,
                mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
            ),
        )

        whenever(button.updateCount(anyInt())).then { }
        whenever(button.isPrivate(store)).then { true }

        button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        store.dispatch(
            TabListAction.AddTabAction(createTab("https://www.mozilla.org", private = true)),
        )
        testScheduler.advanceUntilIdle()

        verify(button).updateCount(eq(1))
    }

    @Test
    fun `WHEN private tab is removed THEN tab count is updated`() = runTest {
        val tab = createTab("https://www.mozilla.org", private = true)
        val store = BrowserStore(BrowserState(tabs = listOf(tab)))
        val button = spy(
            TabCounterToolbarButton(
                lifecycleOwner = lifecycleOwner,
                countBasedOnSelectedTabType = false,
                showTabs = showTabs,
                store = store,
                menu = tabCounterMenu,
                mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
            ),
        )

        whenever(button.updateCount(anyInt())).then { }
        whenever(button.isPrivate(store)).then { true }

        button.createView(LinearLayout(testContext) as ViewGroup) as TabCounterView
        testScheduler.advanceUntilIdle()

        store.dispatch(TabListAction.RemoveTabAction(tab.id))
        testScheduler.advanceUntilIdle()

        verify(button).updateCount(eq(0))
    }

    @Test
    fun `WHEN tab counter is clicked THEN showTabs function is invoked`() = runTest {
        var callbackInvoked = false
        val store = BrowserStore(BrowserState(tabs = listOf()))
        val button = TabCounterToolbarButton(
            lifecycleOwner = lifecycleOwner,
            countBasedOnSelectedTabType = false,
            showTabs = {
                callbackInvoked = true
            },
            store = store,
            menu = tabCounterMenu,
            mainDispatcher = coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        )

        val parent = spy(LinearLayout(testContext))
        doReturn(true).`when`(parent).isAttachedToWindow

        val view = button.createView(parent) as TabCounterView
        testScheduler.advanceUntilIdle()

        view.performClick()
        assertTrue(callbackInvoked)
    }

    @Test
    fun `WHEN tabs button is created THEN it is visible by default`() = runTest {
        val button = TabCounterToolbarButton(
            lifecycleOwner = lifecycleOwner,
            countBasedOnSelectedTabType = false,
            showTabs = showTabs,
            store = BrowserStore(),
            menu = tabCounterMenu,
        )

        assertEquals(true, button.visible())
    }
}
