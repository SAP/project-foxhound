/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites

import android.content.res.Resources
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.SerializationException
import mozilla.components.browser.state.action.SearchAction
import mozilla.components.browser.state.search.RegionState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.top.sites.DefaultTopSitesStorage
import mozilla.components.lib.crash.CrashReporter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.utils.Settings
import java.io.ByteArrayInputStream

@RunWith(AndroidJUnit4::class)
class DefaultTopSitesBindingTest {

    private lateinit var browserStore: BrowserStore
    private lateinit var topSitesStorage: DefaultTopSitesStorage
    private lateinit var settings: Settings
    private lateinit var resources: Resources
    private lateinit var crashReporter: CrashReporter

    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        topSitesStorage = mockk(relaxed = true)
        settings = mockk(relaxed = true)
        resources = mockk(relaxed = true)
        crashReporter = mockk(relaxed = true)

        browserStore = BrowserStore()

        every { resources.openRawResource(R.raw.initial_shortcuts) } answers {
            this.javaClass.classLoader!!.getResourceAsStream("raw/test_initial_shortcuts.json")!!
        }

        every { settings.showFirefoxJpGuideDefaultSite } returns true
    }

    @Test
    fun `GIVEN build is in the release channel WHEN region is set to the default THEN do nothing`() =
        runTest(dispatcher) {
            every { settings.defaultTopSitesAdded } returns false

            val binding = createBinding()
            binding.start()

            browserStore.dispatch(
                SearchAction.SetRegionAction(RegionState.Default),
            )

            verify(exactly = 0) {
                topSitesStorage.addTopSites(topSites = any(), isDefault = any())
                settings.defaultTopSitesAdded = any()
            }
        }

    @Test
    fun `GIVEN debug build WHEN region is set to the default THEN add the default sites to storage`() =
        runTest(dispatcher) {
            every { settings.defaultTopSitesAdded } returns false

            val binding = createBinding(isReleased = false)
            binding.start()

            browserStore.dispatch(
                SearchAction.SetRegionAction(RegionState.Default),
            )

            val topSites = binding.getTopSites(region = "XX")
            dispatcher.scheduler.advanceUntilIdle()

            verify {
                topSitesStorage.addTopSites(topSites = topSites, isDefault = true)
                settings.defaultTopSitesAdded = true
            }
        }

    @Test
    fun `WHEN region is set to a non-default value THEN add the sites for that region to storage`() =
        runTest(dispatcher) {
            every { settings.defaultTopSitesAdded } returns false

            val region = "CA"
            val binding = createBinding()
            binding.start()

            browserStore.dispatch(
                SearchAction.SetRegionAction(RegionState(home = region, current = region)),
            )

            val topSites = binding.getTopSites(region = region)
            dispatcher.scheduler.advanceUntilIdle()

            verify {
                topSitesStorage.addTopSites(topSites = topSites, isDefault = true)
                settings.defaultTopSitesAdded = true
            }
        }

    @Test
    fun `GIVEN default top sites have already been added WHEN region is set to a non-default value THEN do nothing`() =
        runTest(dispatcher) {
            every { settings.defaultTopSitesAdded } returns true

            val region = "CA"
            val binding = createBinding()
            binding.start()

            browserStore.dispatch(
                SearchAction.SetRegionAction(RegionState(home = region, current = region)),
            )

            verify(exactly = 0) {
                topSitesStorage.addTopSites(topSites = any(), isDefault = any())
                settings.defaultTopSitesAdded = any()
            }
        }

    @Test
    fun `GIVEN region is in an included region WHEN getTopSites is called THEN the sites for that region are returned`() =
        runTest(dispatcher) {
            val binding = createBinding()
            val topSites = binding.getTopSites(region = "US")

            assertEquals(7, topSites.size)
            assertEquals("US Region Site", topSites[0].first)
            assertEquals("https://www.example1.com/", topSites[0].second)
            assertEquals("CA Excluded Region Site", topSites[1].first)
            assertEquals("https://www.example2.com/", topSites[1].second)
            assertEquals("All Region Site", topSites[2].first)
            assertEquals("https://www.example3.com/", topSites[2].second)
            assertEquals("www.example4.com", topSites[3].first)
            assertEquals("https://www.example4.com/", topSites[3].second)
            assertEquals("www.example5.com", topSites[4].first)
            assertEquals("https://www.example5.com/", topSites[4].second)
            assertEquals("www.example6.com", topSites[5].first)
            assertEquals("https://www.example6.com/", topSites[5].second)
            assertEquals("www.example7.com", topSites[6].first)
            assertEquals("https://www.example7.com/", topSites[6].second)
        }

    @Test
    fun `GIVEN region is in an included region and Japan default site experiment is turned off WHEN getTopSites is called THEN the sites for that region are returned`() =
        runTest(dispatcher) {
            every { settings.showFirefoxJpGuideDefaultSite } returns false

            val binding = createBinding()
            val topSites = binding.getTopSites(region = "US")

            assertEquals(6, topSites.size)
            assertEquals("US Region Site", topSites[0].first)
            assertEquals("https://www.example1.com/", topSites[0].second)
            assertEquals("CA Excluded Region Site", topSites[1].first)
            assertEquals("https://www.example2.com/", topSites[1].second)
            assertEquals("All Region Site", topSites[2].first)
            assertEquals("https://www.example3.com/", topSites[2].second)
            assertEquals("www.example4.com", topSites[3].first)
            assertEquals("https://www.example4.com/", topSites[3].second)
            assertEquals("www.example5.com", topSites[4].first)
            assertEquals("https://www.example5.com/", topSites[4].second)
            assertEquals("www.example7.com", topSites[5].first)
            assertEquals("https://www.example7.com/", topSites[5].second)
        }

    @Test
    fun `GIVEN region is in an excluded region WHEN getTopSites is called THEN the sites for that region are not returned`() =
        runTest(dispatcher) {
            val binding = createBinding()
            val topSites = binding.getTopSites(region = "CA")

            assertEquals(5, topSites.size)
            assertEquals("All Region Site", topSites[0].first)
            assertEquals("https://www.example3.com/", topSites[0].second)
            assertEquals("www.example4.com", topSites[1].first)
            assertEquals("https://www.example4.com/", topSites[1].second)
            assertEquals("www.example5.com", topSites[2].first)
            assertEquals("https://www.example5.com/", topSites[2].second)
            assertEquals("www.example6.com", topSites[3].first)
            assertEquals("https://www.example6.com/", topSites[3].second)
            assertEquals("www.example7.com", topSites[4].first)
            assertEquals("https://www.example7.com/", topSites[4].second)
        }

    @Test
    fun `GIVEN the default region region WHEN getTopSites is called THEN the sites for that region are returned`() =
        runTest(dispatcher) {
            val binding = createBinding()
            val topSites = binding.getTopSites(region = "XX")

            assertEquals(6, topSites.size)
            assertEquals("CA Excluded Region Site", topSites[0].first)
            assertEquals("https://www.example2.com/", topSites[0].second)
            assertEquals("All Region Site", topSites[1].first)
            assertEquals("https://www.example3.com/", topSites[1].second)
            assertEquals("www.example4.com", topSites[2].first)
            assertEquals("https://www.example4.com/", topSites[2].second)
            assertEquals("www.example5.com", topSites[3].first)
            assertEquals("https://www.example5.com/", topSites[3].second)
            assertEquals("www.example6.com", topSites[4].first)
            assertEquals("https://www.example6.com/", topSites[4].second)
            assertEquals("www.example7.com", topSites[5].first)
            assertEquals("https://www.example7.com/", topSites[5].second)
        }

    @Test
    fun `GIVEN invalid json WHEN getTopSites is called THEN return empty list and report crash`() =
        runTest(dispatcher) {
            val malformedJson =
                "{\"data\": [{\"url\": \"https://example.com\", \"title\": \"Valid\"}, {\"id\": \"invalid\"}]}"
            every { resources.openRawResource(R.raw.initial_shortcuts) } returns ByteArrayInputStream(
                malformedJson.toByteArray(),
            )

            val binding = createBinding()
            val topSites = binding.getTopSites(region = "XX")

            assertTrue(topSites.isEmpty())
            verify {
                crashReporter.recordCrashBreadcrumb(any())
                crashReporter.submitCaughtException(any<SerializationException>())
            }
            verify(exactly = 0) {
                topSitesStorage.addTopSites(topSites = any(), isDefault = any())
                settings.defaultTopSitesAdded = any()
            }
        }

    @Test
    fun `GIVEN malformed json WHEN getTopSites is called THEN return empty list and report crash for illegal argument`() =
        runTest(dispatcher) {
            val malformedJson = "this is not a valid json"
            every { resources.openRawResource(R.raw.initial_shortcuts) } returns ByteArrayInputStream(
                malformedJson.toByteArray(),
            )

            val binding = createBinding()
            val topSites = binding.getTopSites(region = "XX")

            assertTrue(topSites.isEmpty())
            verify {
                crashReporter.recordCrashBreadcrumb(any())
                crashReporter.submitCaughtException(any<SerializationException>())
            }
            verify(exactly = 0) {
                topSitesStorage.addTopSites(topSites = any(), isDefault = any())
                settings.defaultTopSitesAdded = any()
            }
        }

    private fun createBinding(
        isReleased: Boolean = true,
    ) = DefaultTopSitesBinding(
        browserStore = browserStore,
        topSitesStorage = topSitesStorage,
        settings = settings,
        resources = resources,
        crashReporter = crashReporter,
        isReleased = isReleased,
        mainDispatcher = dispatcher,
        ioDispatcher = dispatcher,
    )
}
