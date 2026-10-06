/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.search.region

import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.SearchAction
import mozilla.components.browser.state.action.SearchAction.RefreshSearchEnginesAction
import mozilla.components.browser.state.action.UpdateDistribution
import mozilla.components.browser.state.search.RegionState
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.service.location.LocationService
import mozilla.components.support.test.fakes.FakeClock
import mozilla.components.support.test.fakes.android.FakeContext
import mozilla.components.support.test.fakes.android.FakeSharedPreferences
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.`when`

class RegionMiddlewareTest {
    private val testDispatcher = StandardTestDispatcher()

    private lateinit var locationService: FakeLocationService
    private lateinit var clock: FakeClock
    private lateinit var regionManager: RegionManager

    @Before
    fun setUp() {
        clock = FakeClock()
        locationService = FakeLocationService()
        regionManager = RegionManager(
            context = FakeContext(),
            locationService = locationService,
            currentTime = clock::time,
            preferences = lazy { FakeSharedPreferences() },
        )
    }

    @Test
    fun `GIVEN a locale is already selected WHEN the locale changes THEN update region on RefreshSearchEngines`() = runTest {
        val middleware = RegionMiddleware(FakeContext(), locationService, testDispatcher)
        middleware.regionManager = regionManager

        locationService.region = LocationService.Region("FR", "France")
        regionManager.update()

        val store = BrowserStore(
            middleware = listOf(middleware),
        )

        middleware.invoke(
            store,
            {},
            UpdateDistribution("testId"),
        )
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("FR", store.state.search.region!!.home)
        assertEquals("FR", store.state.search.region!!.current)

        locationService.region = LocationService.Region("DE", "Germany")
        regionManager.update()

        store.dispatch(RefreshSearchEnginesAction)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals("FR", store.state.search.region!!.home)
        assertEquals("DE", store.state.search.region!!.current)
    }

    @Test
    fun `WHEN the UpdateDistribution action is received THEN the distribution is updated`() = runTest {
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val middleware = RegionMiddleware(FakeContext(), locationService, testDispatcher)
        val regionManager: RegionManager = mock()
        middleware.regionManager = regionManager
        val store = BrowserStore(middleware = listOf(captureActionsMiddleware))

        // null RegionState
        `when`(regionManager.region()).thenReturn(null)

        middleware.invoke(
            store,
            {},
            UpdateDistribution("testId"),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(SearchAction.SetRegionAction::class) { action ->
            assertEquals(RegionState.Default, action.regionState)
            assertEquals("testId", action.distribution)
        }

        // non null RegionState
        `when`(regionManager.region()).thenReturn(RegionState("US", "US"))

        middleware.invoke(
            store,
            {},
            UpdateDistribution("testId"),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(SearchAction.SetRegionAction::class) { action ->
            assertEquals(RegionState("US", "US"), action.regionState)
            assertEquals("testId", action.distribution)
        }

        // region manager update has a new RegionState
        `when`(regionManager.region()).thenReturn(null)
        `when`(regionManager.update()).thenReturn(RegionState("DE", "DE"))

        middleware.invoke(
            store,
            {},
            UpdateDistribution("testId"),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(SearchAction.SetRegionAction::class) { action ->
            assertEquals(RegionState("DE", "DE"), action.regionState)
            assertEquals("testId", action.distribution)
        }
    }

    @Test
    fun `WHEN the RefreshSearchEngines action is received THEN the distribution is updated`() = runTest {
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val middleware = RegionMiddleware(FakeContext(), locationService, testDispatcher)
        val regionManager: RegionManager = mock()
        middleware.regionManager = regionManager
        val store = BrowserStore(
            BrowserState(distributionId = "testId"),
            middleware = listOf(captureActionsMiddleware),
        )

        // null RegionState
        `when`(regionManager.region()).thenReturn(null)

        middleware.invoke(
            store,
            {},
            RefreshSearchEnginesAction,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertFirstAction(SearchAction.SetRegionAction::class) { action ->
            assertEquals(RegionState.Default, action.regionState)
            assertEquals("testId", action.distribution)
        }

        // non null RegionState
        `when`(regionManager.region()).thenReturn(RegionState("US", "US"))

        middleware.invoke(
            store,
            {},
            RefreshSearchEnginesAction,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(SearchAction.SetRegionAction::class) { action ->
            assertEquals(RegionState("US", "US"), action.regionState)
            assertEquals("testId", action.distribution)
        }

        // region manager update has a new RegionState
        `when`(regionManager.region()).thenReturn(null)
        `when`(regionManager.update()).thenReturn(RegionState("DE", "DE"))

        middleware.invoke(
            store,
            {},
            RefreshSearchEnginesAction,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        captureActionsMiddleware.assertLastAction(SearchAction.SetRegionAction::class) { action ->
            assertEquals(RegionState("DE", "DE"), action.regionState)
            assertEquals("testId", action.distribution)
        }
    }
}
