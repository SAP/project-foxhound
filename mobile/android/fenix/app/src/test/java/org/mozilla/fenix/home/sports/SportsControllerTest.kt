/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.navigation.NavController
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.SearchState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.search.ext.buildSearchUrl
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.WorldCup
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.share.ShareSource
import org.mozilla.fenix.components.usecases.FenixBrowserUseCases
import org.mozilla.fenix.components.usecases.ShareUseCases
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner
import java.util.Locale

@RunWith(RobolectricTestRunner::class)
class SportsControllerTest {
    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val appStore: AppStore = mockk(relaxed = true)
    private val settings: Settings = mockk(relaxed = true)
    private val navController: NavController = mockk(relaxed = true)
    private val fenixBrowserUseCases: FenixBrowserUseCases = mockk(relaxed = true)
    private val shareUseCases: ShareUseCases = mockk(relaxed = true)
    private var connectivityManager: ConnectivityManager = onlineConnectivityManager()

    private lateinit var browserStore: BrowserStore

    private lateinit var controller: SportsController

    private val originalLocale: Locale = Locale.getDefault()

    @Before
    fun setup() {
        Locale.setDefault(Locale.ENGLISH)
        browserStore = BrowserStore()
        every { appStore.state } returns AppState()

        controller = buildController()
    }

    private fun buildController(): SportsController = DefaultSportsController(
        appStore = appStore,
        browserStore = browserStore,
        settings = settings,
        navController = navController,
        fenixBrowserUseCases = fenixBrowserUseCases,
        shareUseCases = shareUseCases,
        worldCupLabel = testContext.getString(R.string.customize_toggle_world_cup),
        shareCardTitle = testContext.getString(R.string.sports_widget_card_title),
        connectivityManager = connectivityManager,
    )

    private fun onlineConnectivityManager(): ConnectivityManager = connectivityManager(isOnline = true)

    private fun offlineConnectivityManager(): ConnectivityManager = connectivityManager(isOnline = false)

    private fun connectivityManager(isOnline: Boolean): ConnectivityManager {
        val capabilities = mockk<NetworkCapabilities> {
            every { hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) } returns isOnline
            every { hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) } returns isOnline
        }
        return mockk(relaxed = true) {
            every { getNetworkCapabilities(any()) } returns capabilities
            every { activeNetwork } returns mockk(relaxed = true)
        }
    }

    @Test
    fun `GIVEN a set of country codes WHEN countries are selected THEN the selection is persisted, action is dispatched and telemetry is recorded`() {
        val countryCodes = setOf("USA", "JPN", "BRA")
        assertNull(WorldCup.countrySelected.testGetValue())

        controller.handleCountriesSelected(countryCodes)

        verify {
            settings.sportsSelectedCountries = countryCodes
            appStore.dispatch(
                AppAction.SportsWidgetAction.CountriesSelected(countryCodes = countryCodes),
            )
        }
        val snapshot = WorldCup.countrySelected.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("country_selected", snapshot.single().name)
    }

    @Test
    fun `GIVEN an empty set WHEN countries are selected THEN the selection is cleared, action is dispatched and telemetry is not recorded`() {
        val countryCodes = emptySet<String>()
        assertNull(WorldCup.countrySelected.testGetValue())

        controller.handleCountriesSelected(countryCodes)

        verify {
            settings.sportsSelectedCountries = countryCodes
            appStore.dispatch(
                AppAction.SportsWidgetAction.CountriesSelected(countryCodes = countryCodes),
            )
        }
        assertNull(WorldCup.countrySelected.testGetValue())
    }

    @Test
    fun `GIVEN a single country WHEN countries are selected THEN the selection is persisted, action is dispatched and telemetry is recorded`() {
        val countryCodes = setOf("USA")
        assertNull(WorldCup.countrySelected.testGetValue())

        controller.handleCountriesSelected(countryCodes)

        verify {
            settings.sportsSelectedCountries = countryCodes
            appStore.dispatch(
                AppAction.SportsWidgetAction.CountriesSelected(countryCodes = countryCodes),
            )
        }
        val snapshot = WorldCup.countrySelected.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("country_selected", snapshot.single().name)
    }

    @Test
    fun `WHEN the follow team flow is skipped THEN the preference is persisted, action is dispatched and telemetry is recorded`() {
        assertNull(WorldCup.skipFollowTeamClicked.testGetValue())

        controller.handleSkippedFollowTeam()

        verify {
            settings.hasSkippedSportsFollowTeam = true
            appStore.dispatch(AppAction.SportsWidgetAction.FollowTeamSkipped)
        }
        val snapshot = WorldCup.skipFollowTeamClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("skip_follow_team_clicked", snapshot.single().name)
    }

    @Test
    fun `WHEN the sports widget is dismissed THEN the visibility preference is set to false, action is dispatched and telemetry is recorded`() {
        assertNull(WorldCup.sportsWidgetDismissed.testGetValue())

        controller.handleSportsWidgetDismissed()

        verify {
            settings.showHomepageSportsWidget = false
            appStore.dispatch(AppAction.SportsWidgetAction.VisibilityChanged(isVisible = false))
        }
        val snapshot = WorldCup.sportsWidgetDismissed.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("sports_widget_dismissed", snapshot.single().name)
    }

    @Test
    fun `WHEN the countdown widget is dismissed THEN the visibility preference is set to false and the action is dispatched`() {
        controller.handleCountdownWidgetDismissed()

        verify {
            settings.showHomepageCountdownWidget = false
            appStore.dispatch(AppAction.SportsWidgetAction.CountdownVisibilityChanged(isCountdownVisible = false))
        }
    }

    @Test
    fun `GIVEN the live match header source WHEN refresh is clicked THEN matches are fetched and telemetry is recorded with the source`() {
        assertNull(WorldCup.refreshClicked.testGetValue())

        controller.handleRefreshClicked(LiveMatchRefreshSource.LIVE_MATCH_HEADER)

        verify {
            appStore.dispatch(AppAction.SportsWidgetAction.FetchMatches)
        }
        val snapshot = WorldCup.refreshClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("refresh_clicked", snapshot.single().name)
        assertEquals(
            LiveMatchRefreshSource.LIVE_MATCH_HEADER.value,
            snapshot.single().extra!!["source"],
        )
    }

    @Test
    fun `GIVEN device is offline WHEN refresh is clicked THEN ConnectionInterrupted is dispatched and telemetry is still recorded`() {
        connectivityManager = offlineConnectivityManager()
        controller = buildController()
        assertNull(WorldCup.refreshClicked.testGetValue())

        controller.handleRefreshClicked(LiveMatchRefreshSource.LIVE_MATCH_HEADER)

        verify {
            appStore.dispatch(
                AppAction.SportsWidgetAction.FetchFailed(SportCardErrorState.ConnectionInterrupted),
            )
        }
        val snapshot = WorldCup.refreshClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
    }

    @Test
    fun `GIVEN the live match card error button source WHEN refresh is clicked THEN matches are fetched and telemetry is recorded with the source`() {
        assertNull(WorldCup.refreshClicked.testGetValue())

        controller.handleRefreshClicked(LiveMatchRefreshSource.LIVE_MATCH_CARD_ERROR_BUTTON)

        verify {
            appStore.dispatch(AppAction.SportsWidgetAction.FetchMatches)
        }
        val snapshot = WorldCup.refreshClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("refresh_clicked", snapshot.single().name)
        assertEquals(
            LiveMatchRefreshSource.LIVE_MATCH_CARD_ERROR_BUTTON.value,
            snapshot.single().extra!!["source"],
        )
    }

    @Test
    fun `GIVEN the sports widget card error button source WHEN refresh is clicked THEN matches are fetched and telemetry is recorded with the source`() {
        assertNull(WorldCup.refreshClicked.testGetValue())

        controller.handleRefreshClicked(LiveMatchRefreshSource.SPORTS_WIDGET_CARD_ERROR_BUTTON)

        verify {
            appStore.dispatch(AppAction.SportsWidgetAction.FetchMatches)
        }
        val snapshot = WorldCup.refreshClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("refresh_clicked", snapshot.single().name)
        assertEquals(
            LiveMatchRefreshSource.SPORTS_WIDGET_CARD_ERROR_BUTTON.value,
            snapshot.single().extra!!["source"],
        )
    }

    @Test
    fun `WHEN the get custom wallpaper menu item is clicked THEN the Wallpaper Settings fragment is opened and telemetry is recorded`() {
        assertNull(WorldCup.getCustomWallpaperClicked.testGetValue())

        controller.handleOnGetCustomWallpaperClicked()

        verify {
            navController.navigate(R.id.wallpaperSettingsFragment)
        }
        val snapshot = WorldCup.getCustomWallpaperClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("get_custom_wallpaper_clicked", snapshot.single().name)
    }

    @Test
    fun `WHEN the share menu item is clicked THEN the World Cup schedule SERP is shared and telemetry is recorded`() {
        val searchEngine = SearchEngine(
            id = "test",
            name = "Test Engine",
            icon = mockk(relaxed = true),
            type = SearchEngine.Type.BUNDLED,
            resultUrls = listOf("https://example.org/?q={searchTerms}"),
        )
        browserStore = BrowserStore(BrowserState(search = SearchState(regionSearchEngines = listOf(searchEngine))))
        controller = buildController()
        assertNull(WorldCup.sportsWidgetShared.testGetValue())

        controller.handleSportsWidgetShareClicked()

        val expectedQuery = testContext.getString(R.string.customize_toggle_world_cup) +
            DefaultSportsController.SCHEDULE_QUERY_SUFFIX
        val expectedUrl = searchEngine.buildSearchUrl(expectedQuery)
        val expectedTitle = testContext.getString(R.string.sports_widget_card_title) +
            DefaultSportsController.SHARE_TITLE_EMOJI_SUFFIX

        verify {
            shareUseCases.shareUrl(
                id = null,
                url = expectedUrl,
                title = expectedTitle,
                source = ShareSource.HOME,
                isPrivate = false,
                navigateToShareFragment = any(),
            )
        }

        val snapshot = WorldCup.sportsWidgetShared.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("sports_widget_shared", snapshot.single().name)
    }

    @Test
    fun `GIVEN valid ISO3 region codes WHEN a match is clicked THEN the browser is opened, a search is performed with the localized country names and telemetry is recorded`() {
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = "USA", awayTeam = "FRA", date = null)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "United States vs France",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `GIVEN an unknown region code WHEN a match is clicked THEN the browser is opened, the original code is used as the fallback in the search term and telemetry is recorded`() {
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = "ZZZ", awayTeam = "FRA", date = null)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "ZZZ vs France",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `GIVEN a malformed region code WHEN a match is clicked THEN the browser is opened, the original code is used as the fallback in the search term and telemetry is recorded`() {
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = "USA", awayTeam = "!!", date = null)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "United States vs !!",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `GIVEN a non-English default locale WHEN a match is clicked THEN the search term uses country names localized to that locale and telemetry is recorded`() {
        Locale.setDefault(Locale.FRENCH)
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = "USA", awayTeam = "FRA", date = null)

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "États-Unis vs France",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `GIVEN a null away team WHEN a match is clicked THEN the search term contains the date and the localized home team and telemetry is recorded`() {
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = "USA", awayTeam = null, date = "2026-06-12")

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "2026-06-12 United States vs",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `GIVEN a null home team WHEN a match is clicked THEN the search term contains the date and the localized away team and telemetry is recorded`() {
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = null, awayTeam = "FRA", date = "2026-06-12")

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "2026-06-12 France vs",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `GIVEN a null home team and a non-English default locale WHEN a match is clicked THEN the search term contains the localized away team and telemetry is recorded`() {
        Locale.setDefault(Locale.FRENCH)
        assertNull(WorldCup.matchClicked.testGetValue())

        controller.handleMatchClicked(homeTeam = null, awayTeam = "USA", date = "2026-06-12")

        verify {
            navController.navigate(R.id.browserFragment)
            fenixBrowserUseCases.loadUrlOrSearch(
                searchTermOrURL = "2026-06-12 États-Unis vs",
                newTab = true,
                private = false,
                searchEngine = any(),
            )
        }
        val snapshot = WorldCup.matchClicked.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("match_clicked", snapshot.single().name)
    }

    @Test
    fun `WHEN a sports widget card impression is recorded THEN telemetry carries the card type and impression source`() {
        assertNull(WorldCup.sportsWidgetCardShown.testGetValue())

        controller.handleSportsWidgetCardShown(
            cardType = SportsCardType.MATCH_GROUP_STAGE,
            source = SportsCardImpressionSource.IMPRESSION,
        )

        val snapshot = WorldCup.sportsWidgetCardShown.testGetValue()!!
        assertEquals(1, snapshot.size)
        val event = snapshot.single()
        assertEquals("sports_widget_card_shown", event.name)
        assertEquals(SportsCardImpressionSource.IMPRESSION.value, event.extra!!["source"])
        assertEquals(SportsCardType.MATCH_GROUP_STAGE.value, event.extra!!["card_type"])
    }

    @Test
    fun `WHEN a sports widget card swipe is recorded THEN telemetry carries the card type and swipe source`() {
        assertNull(WorldCup.sportsWidgetCardShown.testGetValue())

        controller.handleSportsWidgetCardShown(
            cardType = SportsCardType.ERROR_CONNECTION_INTERRUPTED,
            source = SportsCardImpressionSource.SWIPE,
        )

        val snapshot = WorldCup.sportsWidgetCardShown.testGetValue()!!
        assertEquals(1, snapshot.size)
        val event = snapshot.single()
        assertEquals("sports_widget_card_shown", event.name)
        assertEquals(SportsCardImpressionSource.SWIPE.value, event.extra!!["source"])
        assertEquals(SportsCardType.ERROR_CONNECTION_INTERRUPTED.value, event.extra!!["card_type"])
    }

    @Test
    fun `GIVEN a load-failed error WHEN the error card is recorded as a card shown THEN the error type is preserved in the extra`() {
        assertNull(WorldCup.sportsWidgetCardShown.testGetValue())

        controller.handleSportsWidgetCardShown(
            cardType = SportsCardType.fromError(SportCardErrorState.LoadFailed),
            source = SportsCardImpressionSource.IMPRESSION,
        )

        val event = WorldCup.sportsWidgetCardShown.testGetValue()!!.single()
        assertEquals(SportsCardType.ERROR_LOAD_FAILED.value, event.extra!!["card_type"])
    }

    @Test
    fun `GIVEN the sports logo source WHEN the country selector is shown THEN telemetry is recorded with the source`() {
        assertNull(WorldCup.countrySelectorDisplayed.testGetValue())

        controller.handleCountrySelectorShown(CountrySelectorSource.SPORTS_LOGO)

        val snapshot = WorldCup.countrySelectorDisplayed.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("country_selector_displayed", snapshot.single().name)
        assertEquals(
            CountrySelectorSource.SPORTS_LOGO.value,
            snapshot.single().extra!!["source"],
        )
    }

    @Test
    fun `GIVEN the sports widget menu source WHEN the country selector is shown THEN telemetry is recorded with the source`() {
        assertNull(WorldCup.countrySelectorDisplayed.testGetValue())

        controller.handleCountrySelectorShown(CountrySelectorSource.SPORTS_WIDGET_MENU)

        val snapshot = WorldCup.countrySelectorDisplayed.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("country_selector_displayed", snapshot.single().name)
        assertEquals(
            CountrySelectorSource.SPORTS_WIDGET_MENU.value,
            snapshot.single().extra!!["source"],
        )
    }

    @Test
    fun `GIVEN the countdown card follow team button source WHEN the country selector is shown THEN telemetry is recorded with the source`() {
        assertNull(WorldCup.countrySelectorDisplayed.testGetValue())

        controller.handleCountrySelectorShown(CountrySelectorSource.COUNTDOWN_CARD_FOLLOW_TEAM_BUTTON)

        val snapshot = WorldCup.countrySelectorDisplayed.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("country_selector_displayed", snapshot.single().name)
        assertEquals(
            CountrySelectorSource.COUNTDOWN_CARD_FOLLOW_TEAM_BUTTON.value,
            snapshot.single().extra!!["source"],
        )
    }

    @Test
    fun `GIVEN the keep tabs card follow team button source WHEN the country selector is shown THEN telemetry is recorded with the source`() {
        assertNull(WorldCup.countrySelectorDisplayed.testGetValue())

        controller.handleCountrySelectorShown(CountrySelectorSource.KEEP_TABS_CARD_FOLLOW_TEAM_BUTTON)

        val snapshot = WorldCup.countrySelectorDisplayed.testGetValue()!!
        assertEquals(1, snapshot.size)
        assertEquals("country_selector_displayed", snapshot.single().name)
        assertEquals(
            CountrySelectorSource.KEEP_TABS_CARD_FOLLOW_TEAM_BUTTON.value,
            snapshot.single().extra!!["source"],
        )
    }

    @After
    fun tearDown() {
        Locale.setDefault(originalLocale)
    }
}
