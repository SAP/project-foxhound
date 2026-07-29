/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import junit.framework.TestCase.assertNotSame
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.action.TrackingProtectionAction.TrackerBlockedAction
import mozilla.components.browser.state.action.TrackingProtectionAction.TrackerLoadedAction
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import kotlin.coroutines.ContinuationInterceptor

@RunWith(RobolectricTestRunner::class)
class TrackingProtectionPanelDialogFragmentTest {

    private lateinit var lifecycleOwner: MockedLifecycleOwner
    private lateinit var fragment: TrackingProtectionPanelDialogFragment
    private lateinit var store: BrowserStore

    @Before
    fun setup() {
        fragment = spyk(TrackingProtectionPanelDialogFragment())
        lifecycleOwner = MockedLifecycleOwner(Lifecycle.State.STARTED)

        store = BrowserStore()
        every { fragment.view } returns mockk(relaxed = true)
        every { fragment.lifecycle } returns lifecycleOwner.lifecycle
        every { fragment.viewLifecycleOwner } returns lifecycleOwner
        every { fragment.activity } returns mockk(relaxed = true)
    }

    @Test
    fun `WHEN the url is updated THEN the url view is updated`() = runTest {
        val protectionsStore: ProtectionsStore = mockk(relaxed = true)
        val tab = createTab("mozilla.org")

        every { fragment.protectionsStore } returns protectionsStore
        every { fragment.provideCurrentTabId() } returns tab.id

        fragment.observeUrlChange(store, coroutineContext[ContinuationInterceptor] as CoroutineDispatcher)
        testScheduler.advanceUntilIdle()

        addAndSelectTab(tab)
        testScheduler.advanceUntilIdle()

        verify(exactly = 1) {
            protectionsStore.dispatch(ProtectionsAction.UrlChange("mozilla.org"))
        }

        store.dispatch(ContentAction.UpdateUrlAction(tab.id, "wikipedia.org"))
        testScheduler.advanceUntilIdle()

        verify(exactly = 1) {
            protectionsStore.dispatch(ProtectionsAction.UrlChange("wikipedia.org"))
        }
    }

    @Test
    fun `WHEN a tracker is loaded THEN trackers view is updated`() = runTest {
        val protectionsStore: ProtectionsStore = mockk(relaxed = true)
        val tab = createTab("mozilla.org")

        every { fragment.protectionsStore } returns protectionsStore
        every { fragment.provideCurrentTabId() } returns tab.id
        every { fragment.updateTrackers(any()) } just Runs

        fragment.observeTrackersChange(store, coroutineContext[ContinuationInterceptor] as CoroutineDispatcher)
        testScheduler.advanceUntilIdle()

        addAndSelectTab(tab)
        testScheduler.advanceUntilIdle()

        verify(exactly = 1) {
            fragment.updateTrackers(tab)
        }

        store.dispatch(TrackerLoadedAction(tab.id, mockk()))
        testScheduler.advanceUntilIdle()

        val updatedTab = store.state.findTab(tab.id)!!

        assertNotSame(updatedTab, tab)

        verify(exactly = 1) {
            fragment.updateTrackers(updatedTab)
        }
    }

    @Test
    fun `WHEN a tracker is blocked THEN trackers view is updated`() = runTest {
        val protectionsStore: ProtectionsStore = mockk(relaxed = true)
        val tab = createTab("mozilla.org")

        every { fragment.protectionsStore } returns protectionsStore
        every { fragment.provideCurrentTabId() } returns tab.id
        every { fragment.updateTrackers(any()) } just Runs

        fragment.observeTrackersChange(store, coroutineContext[ContinuationInterceptor] as CoroutineDispatcher)
        testScheduler.advanceUntilIdle()

        addAndSelectTab(tab)
        testScheduler.advanceUntilIdle()

        verify(exactly = 1) {
            fragment.updateTrackers(tab)
        }

        store.dispatch(TrackerBlockedAction(tab.id, mockk()))
        testScheduler.advanceUntilIdle()

        val updatedTab = store.state.findTab(tab.id)!!

        assertNotSame(updatedTab, tab)

        verify(exactly = 1) {
            fragment.updateTrackers(tab)
        }
    }

    private fun addAndSelectTab(tab: TabSessionState) {
        store.dispatch(TabListAction.AddTabAction(tab))
        store.dispatch(TabListAction.SelectTabAction(tab.id))
    }

    internal class MockedLifecycleOwner(initialState: Lifecycle.State) : LifecycleOwner {
        override val lifecycle: Lifecycle = LifecycleRegistry(this).apply {
            currentState = initialState
        }
    }
}
