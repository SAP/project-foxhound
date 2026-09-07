/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.quicksettings

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import junit.framework.TestCase.assertNotSame
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.action.TrackingProtectionAction.TrackerBlockedAction
import mozilla.components.browser.state.action.TrackingProtectionAction.TrackerLoadedAction
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.content.blocking.TrackerLog
import mozilla.components.feature.session.TrackingProtectionUseCases
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.settings.quicksettings.protections.ProtectionsView
import org.robolectric.RobolectricTestRunner
import kotlin.coroutines.ContinuationInterceptor

@RunWith(RobolectricTestRunner::class)
class QuickSettingsSheetDialogFragmentTest {

    private lateinit var lifecycleOwner: MockedLifecycleOwner
    private lateinit var fragment: QuickSettingsSheetDialogFragment
    private lateinit var store: BrowserStore

    @Before
    fun setup() {
        fragment = spyk(QuickSettingsSheetDialogFragment())
        lifecycleOwner = MockedLifecycleOwner(Lifecycle.State.STARTED)

        store = BrowserStore()
        every { fragment.view } returns mockk(relaxed = true)
        every { fragment.lifecycle } returns lifecycleOwner.lifecycle
        every { fragment.viewLifecycleOwner } returns lifecycleOwner
        every { fragment.activity } returns mockk(relaxed = true)
    }

    @Test
    fun `WHEN a tracker is loaded THEN trackers view is updated`() = runTest {
        val tab = createTab("mozilla.org")

        every { fragment.provideTabId() } returns tab.id
        every { fragment.updateTrackers(any()) } just Runs

        fragment.observeTrackersChange(
            store,
            coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        )

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
        val tab = createTab("mozilla.org")

        every { fragment.provideTabId() } returns tab.id
        every { fragment.updateTrackers(any()) } just Runs

        fragment.observeTrackersChange(
            store,
            coroutineContext[ContinuationInterceptor] as CoroutineDispatcher,
        )

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
            fragment.updateTrackers(updatedTab)
        }
    }

    @Test
    fun `GIVEN no trackers WHEN calling updateTrackers THEN hide the details section`() {
        val tab = createTab("mozilla.org")
        val trackingProtectionUseCases: TrackingProtectionUseCases = mockk(relaxed = true)
        val protectionsView: ProtectionsView = mockk(relaxed = true)

        val onComplete = slot<(List<TrackerLog>) -> Unit>()

        every { fragment.protectionsView } returns protectionsView

        every {
            trackingProtectionUseCases.fetchTrackingLogs.invoke(
                any(),
                capture(onComplete),
                any(),
            )
        }.answers { onComplete.captured.invoke(emptyList()) }

        every { fragment.provideTrackingProtectionUseCases() } returns trackingProtectionUseCases

        fragment.updateTrackers(tab)

        verify {
            protectionsView.updateDetailsSection(false)
        }
    }

    @Test
    fun `GIVEN trackers WHEN calling updateTrackers THEN show the details section`() {
        val tab = createTab("mozilla.org")
        val trackingProtectionUseCases: TrackingProtectionUseCases = mockk(relaxed = true)
        val protectionsView: ProtectionsView = mockk(relaxed = true)

        val onComplete = slot<(List<TrackerLog>) -> Unit>()

        every { fragment.protectionsView } returns protectionsView

        every {
            trackingProtectionUseCases.fetchTrackingLogs.invoke(
                any(),
                capture(onComplete),
                any(),
            )
        }.answers { onComplete.captured.invoke(listOf(TrackerLog(""))) }

        every { fragment.provideTrackingProtectionUseCases() } returns trackingProtectionUseCases

        fragment.updateTrackers(tab)

        verify {
            protectionsView.updateDetailsSection(true)
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
