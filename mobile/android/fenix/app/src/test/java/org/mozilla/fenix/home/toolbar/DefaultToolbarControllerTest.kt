/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.toolbar

import androidx.navigation.NavController
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SearchState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.experiments.nimbus.NimbusEventStore
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.NimbusComponents
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.usecases.FenixBrowserUseCases
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class) // For gleanTestRule
class DefaultToolbarControllerTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val appStore: AppStore = mockk(relaxed = true)
    private val navController: NavController = mockk(relaxed = true)
    private val settings: Settings = mockk(relaxed = true)
    private val fenixBrowserUseCases: FenixBrowserUseCases = mockk(relaxed = true)

    val nimbusEventsStore: NimbusEventStore = mockk {
        every { recordEvent(any()) } just Runs
    }
    private val nimbusComponents: NimbusComponents = mockk {
        every { events } returns nimbusEventsStore
    }

    private val searchEngine = SearchEngine(
        id = "test",
        name = "Test Engine",
        icon = mockk(relaxed = true),
        type = SearchEngine.Type.BUNDLED,
        resultUrls = listOf("https://example.org/?q={searchTerms}"),
    )

    private lateinit var store: BrowserStore

    @Before
    fun setup() {
        store = BrowserStore(
            initialState = BrowserState(
                search = SearchState(
                    regionSearchEngines = listOf(searchEngine),
                ),
            ),
        )

        every { appStore.state } returns AppState()

        every { navController.currentDestination } returns mockk {
            every { id } returns R.id.homeFragment
        }
    }

    @Test
    fun `WHEN Paste & Go toolbar menu is clicked THEN open the browser with the clipboard text as the search term`() {
        assertNull(Events.enteredUrl.testGetValue())
        assertNull(Events.performedSearch.testGetValue())

        var clipboardText = "text"
        createController().handlePasteAndGo(clipboardText)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = clipboardText,
                newTab = true,
                private = false,
                searchEngine = searchEngine,
            )
        }

        assertNotNull(Events.performedSearch.testGetValue())

        clipboardText = "https://mozilla.org"
        createController().handlePasteAndGo(clipboardText)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = clipboardText,
                newTab = true,
                private = false,
                searchEngine = searchEngine,
            )
        }

        assertNotNull(Events.enteredUrl.testGetValue())
    }

    @Test
    fun `GIVEN homepage as a new tab is enabled WHEN Paste & Go toolbar menu is clicked THEN open the browser with the clipboard text as the search term`() {
        every { settings.enableHomepageAsNewTab } returns true

        assertNull(Events.enteredUrl.testGetValue())
        assertNull(Events.performedSearch.testGetValue())

        var clipboardText = "text"
        createController().handlePasteAndGo(clipboardText)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = clipboardText,
                newTab = false,
                private = false,
                searchEngine = searchEngine,
            )
        }

        assertNotNull(Events.performedSearch.testGetValue())

        clipboardText = "https://mozilla.org"
        createController().handlePasteAndGo(clipboardText)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = clipboardText,
                newTab = false,
                private = false,
                searchEngine = searchEngine,
            )
        }

        assertNotNull(Events.enteredUrl.testGetValue())
    }

    @Test
    fun `WHEN Paste toolbar menu is clicked THEN navigate to the search dialog`() {
        createController().handlePaste("text")

        verify {
            navController.navigate(
                match<NavDirections> { it.actionId == R.id.action_global_search_dialog },
                null,
            )
        }
    }

    @Test
    fun `WHEN the toolbar is tapped THEN navigate to the search dialog`() {
        assertNull(Events.searchBarTapped.testGetValue())

        createController().handleNavigateSearch()

        assertNotNull(Events.searchBarTapped.testGetValue())

        val recordedEvents = Events.searchBarTapped.testGetValue()!!
        assertEquals(1, recordedEvents.size)
        assertEquals("HOME", recordedEvents.single().extra?.getValue("source"))

        verify {
            navController.navigate(
                match<NavDirections> { it.actionId == R.id.action_global_search_dialog },
                any<NavOptions>(),
            )
        }
    }

    private fun createController() = DefaultToolbarController(
        appStore = appStore,
        browserStore = store,
        nimbusComponents = nimbusComponents,
        navController = navController,
        settings = settings,
        fenixBrowserUseCases = fenixBrowserUseCases,
    )
}
