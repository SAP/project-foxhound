/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import android.os.Looper
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.TrackingProtectionAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.content.blocking.Tracker
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.BOUNCETRACKERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.CRYPTOMINERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.FINGERPRINTERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.OTHER_COOKIES_BLOCKED
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.SOCIAL
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.SUSPICIOUS_FINGERPRINTERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.TRACKERS
import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent.Companion.TRACKING_COOKIES
import mozilla.components.feature.session.TrackingProtectionUseCases
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateEarliestTrackingDate
import org.mozilla.fenix.components.appstate.AppAction.BlockedTrackersAction.UpdateTrackersBlockedThisWeek
import org.mozilla.fenix.components.appstate.AppState
import org.robolectric.Shadows.shadowOf
import java.util.concurrent.TimeUnit
import mozilla.components.ui.icons.R as iconsR

@RunWith(AndroidJUnit4::class)
class TrackersBlockedFeatureTest {
    private val testDispatcher = StandardTestDispatcher()

    private val trackingProtectionUseCases: TrackingProtectionUseCases = mockk()

    private lateinit var browserStore: BrowserStore
    private lateinit var appStore: AppStore
    private lateinit var appActionsCaptorMiddleware: CaptureActionsMiddleware<AppState, AppAction>

    private val fetchEventsOnSuccess = slot<(List<TrackingProtectionEvent>) -> Unit>()
    private val fetchEventsOnError = slot<(Throwable) -> Unit>()
    private val fetchEventsDateFrom = slot<Long>()
    private val fetchEventsDateTo = slot<Long>()
    private val fetchTotalOnSuccess = slot<(Int) -> Unit>()
    private val fetchTotalOnError = slot<(Throwable) -> Unit>()
    private val fetchDateOnSuccess = slot<(Long?) -> Unit>()
    private val fetchDateOnError = slot<(Throwable) -> Unit>()

    @Before
    fun setup() {
        every {
            trackingProtectionUseCases.fetchTrackingEvents.invoke(
                dateFrom = capture(fetchEventsDateFrom),
                dateTo = capture(fetchEventsDateTo),
                onSuccess = capture(fetchEventsOnSuccess),
                onError = capture(fetchEventsOnError),
            )
        } answers { }

        every {
            trackingProtectionUseCases.fetchTotalTrackersBlocked.invoke(
                onSuccess = capture(fetchTotalOnSuccess),
                onError = capture(fetchTotalOnError),
            )
        } answers { }

        every {
            trackingProtectionUseCases.fetchEarliestTrackingDate.invoke(
                onSuccess = capture(fetchDateOnSuccess),
                onError = capture(fetchDateOnError),
            )
        } answers { }

        browserStore = BrowserStore(
            BrowserState(
                tabs = listOf(createTab(url = "https://mozilla.org", id = "tab1")),
                selectedTabId = "tab1",
            ),
        )
        appActionsCaptorMiddleware = CaptureActionsMiddleware()
        appStore = AppStore(middlewares = listOf(appActionsCaptorMiddleware))
    }

    @After
    fun teardown() {
        appActionsCaptorMiddleware.reset()
    }

    @Test
    fun `GIVEN feature started WHEN there is no tracker blocked event for the current tab THEN fetch trackers blocked information`() = runTest(testDispatcher) {
        startFeature()
        shadowOf(Looper.getMainLooper()).idle()

        verify {
            trackingProtectionUseCases.fetchTotalTrackersBlocked(any(), any())
            trackingProtectionUseCases.fetchTrackingEvents.invoke(any(), any(), any(), any())
            trackingProtectionUseCases.fetchEarliestTrackingDate.invoke(any(), any())
        }
        val windowMs = fetchEventsDateTo.captured - fetchEventsDateFrom.captured
        assertEquals(TimeUnit.DAYS.toMillis(7), windowMs)
    }

    @Test
    fun `GIVEN feature started WHEN a tracker is blocked THEN fetch the total trackers blocked and trackers blocked this week but not earliest date also`() = runTest(testDispatcher) {
        startFeature()
        shadowOf(Looper.getMainLooper()).idle()

        // Verify the initial sync
        verify(exactly = 1) {
            trackingProtectionUseCases.fetchTotalTrackersBlocked(any(), any())
            trackingProtectionUseCases.fetchTrackingEvents.invoke(any(), any(), any(), any())
            trackingProtectionUseCases.fetchEarliestTrackingDate.invoke(any(), any())
        }
        val windowMs = fetchEventsDateTo.captured - fetchEventsDateFrom.captured
        assertEquals(TimeUnit.DAYS.toMillis(7), windowMs)

        // Verify a new sync following trackers blocked events
        blockNewTracker()
        testDispatcher.scheduler.advanceUntilIdle()
        shadowOf(Looper.getMainLooper()).idle()
        verify(exactly = 2) {
            trackingProtectionUseCases.fetchTotalTrackersBlocked(any(), any())
            trackingProtectionUseCases.fetchTrackingEvents.invoke(
                dateFrom = any(),
                dateTo = any(),
                onSuccess = any(),
                onError = any(),
            )
        }
        // Verify that new tracker blocked events don't cause refetching the earliest date of tracking events.
        verify(exactly = 1) {
            trackingProtectionUseCases.fetchEarliestTrackingDate.invoke(any(), any())
        }
        assertEquals(TimeUnit.DAYS.toMillis(7), windowMs)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun `GIVEN multiple trackers are blocked in quick succession THEN sync is debounced`() = runTest(testDispatcher) {
        startFeature()
        shadowOf(Looper.getMainLooper()).idle()

        verify(exactly = 1) {
            trackingProtectionUseCases.fetchTotalTrackersBlocked(any(), any())
        }

        // Block multiple trackers within the debounce window (500ms intervals)
        blockNewTracker(url = "https://tracker1.test")
        testDispatcher.scheduler.advanceTimeBy(500)
        blockNewTracker(url = "https://tracker2.test")
        testDispatcher.scheduler.advanceTimeBy(500)
        blockNewTracker(url = "https://tracker3.test")

        // At this point, no additional sync should have happened because of debounce(1s)
        shadowOf(Looper.getMainLooper()).idle()
        verify(exactly = 1) {
            trackingProtectionUseCases.fetchTotalTrackersBlocked(any(), any())
        }

        // Advance time past the debounce period (1s)
        testDispatcher.scheduler.advanceTimeBy(1001)
        shadowOf(Looper.getMainLooper()).idle()

        verify(exactly = 2) {
            trackingProtectionUseCases.fetchTotalTrackersBlocked(any(), any())
        }
    }

    @Test
    fun `GIVEN a successful response for fetching blocked tracker events THEN dispatch a category for each tracker category with summed counts`() = runTest(testDispatcher) {
        startFeature()

        blockNewTracker()
        fetchEventsOnSuccess.captured.invoke(
            listOf(
                blockedTrackerEvent(type = TRACKING_COOKIES, count = 3),
                blockedTrackerEvent(type = SOCIAL, count = 7),
                blockedTrackerEvent(type = FINGERPRINTERS, count = 4),
                blockedTrackerEvent(type = TRACKERS, count = 11),
            ),
        )

        appActionsCaptorMiddleware.assertLastAction(UpdateTrackersBlockedThisWeek::class) { action ->
            val byName = action.blockedTrackerCategories.associateBy { it.name }
            assertEquals(
                3,
                byName.getValue(R.plurals.trackers_blocked_panel_num_cross_site_cookies).count,
            )
            assertEquals(
                7,
                byName.getValue(R.plurals.trackers_blocked_panel_num_social_media_trackers).count,
            )
            assertEquals(
                4,
                byName.getValue(R.plurals.trackers_blocked_panel_num_fingerprinters).count,
            )
            assertEquals(
                11,
                byName.getValue(R.plurals.trackers_blocked_panel_num_trackers_2).count,
            )
        }
    }

    @Test
    fun `GIVEN a successful response for fetching blocked tracker events THEN sum fingerprint events into the Fingerprinters bucket`() = runTest(testDispatcher) {
        startFeature()

        blockNewTracker()
        fetchEventsOnSuccess.captured.invoke(
            listOf(
                blockedTrackerEvent(type = FINGERPRINTERS, count = 2),
                blockedTrackerEvent(type = SUSPICIOUS_FINGERPRINTERS, count = 5),
            ),
        )

        appActionsCaptorMiddleware.assertLastAction(UpdateTrackersBlockedThisWeek::class) { action ->
            val fingerprinters = action.blockedTrackerCategories
                .single { it.name == R.plurals.trackers_blocked_panel_num_fingerprinters }
            assertEquals(7, fingerprinters.count)
            assertEquals(iconsR.drawable.mozac_ic_fingerprinter_24, fingerprinters.icon)
        }
    }

    @Test
    fun `GIVEN a successful response for fetching blocked tracker events WHEN some events are unrecognized THEN those are excluded`() = runTest(testDispatcher) {
        startFeature()

        blockNewTracker()
        fetchEventsOnSuccess.captured.invoke(
            listOf(
                blockedTrackerEvent(type = OTHER_COOKIES_BLOCKED, count = 9),
                blockedTrackerEvent(type = CRYPTOMINERS, count = 6),
                blockedTrackerEvent(type = BOUNCETRACKERS, count = 4),
                blockedTrackerEvent(type = TRACKING_COOKIES, count = 1),
            ),
        )

        appActionsCaptorMiddleware.assertLastAction(UpdateTrackersBlockedThisWeek::class) { action ->
            val total = action.blockedTrackerCategories.sumOf { it.count }
            assertEquals(1, total)
        }
    }

    @Test
    fun `GIVEN a successful response for fetching blocked tracker events WHEN the response is empty THEN update the state with no blocked tracker`() = runTest(testDispatcher) {
        startFeature()

        blockNewTracker()
        fetchEventsOnSuccess.captured.invoke(emptyList())

        appActionsCaptorMiddleware.assertLastAction(UpdateTrackersBlockedThisWeek::class) { action ->
            assertEquals(4, action.blockedTrackerCategories.size)
            assertTrue(action.blockedTrackerCategories.all { it.count == 0 })
        }
    }

    @Test
    fun `GIVEN a successful response for fetching the earliest date of blocked trackers THEN update the state with this date`() = runTest(testDispatcher) {
        startFeature()

        blockNewTracker()
        fetchDateOnSuccess.captured.invoke(431L)

        appActionsCaptorMiddleware.assertLastAction(UpdateEarliestTrackingDate::class) { action ->
            assertEquals(431L, action.date)
        }
    }

    private fun startFeature() {
        val feature = TrackersBlockedFeature(
            browserStore = browserStore,
            appStore = appStore,
            currentSessionId = browserStore.state.selectedTabId,
            trackingProtectionUseCases = trackingProtectionUseCases,
            ioDispatcher = testDispatcher,
        )
        feature.start()
        testDispatcher.scheduler.advanceUntilIdle()
    }

    private fun blockNewTracker(tabId: String = "tab1", url: String = "https://tracker.test/") {
        browserStore.dispatch(
            TrackingProtectionAction.TrackerBlockedAction(
                tabId = tabId,
                tracker = Tracker(url = url),
            ),
        )
        shadowOf(Looper.getMainLooper()).idle()
    }

    private fun blockedTrackerEvent(type: Int, count: Int) =
        TrackingProtectionEvent(type = type, count = count, date = null)
}
