/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import android.net.ConnectivityManager
import androidx.navigation.NavController
import mozilla.components.browser.state.state.selectedOrDefaultSearchEngine
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.prompt.ShareData
import mozilla.components.feature.search.ext.buildSearchUrl
import org.mozilla.fenix.GleanMetrics.WorldCup
import org.mozilla.fenix.R
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.share.ShareSource
import org.mozilla.fenix.components.usecases.FenixBrowserUseCases
import org.mozilla.fenix.components.usecases.ShareUseCases
import org.mozilla.fenix.ext.isOnline
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.ext.openToBrowser
import org.mozilla.fenix.home.HomeFragmentDirections
import org.mozilla.fenix.home.sports.util.localizedCountryName
import org.mozilla.fenix.utils.Settings

/**
 * Controller for handling sports widget interactions on the homepage.
 */
interface SportsController {

    /**
     * Handles the user selecting countries in the sports widget country selector.
     *
     * @param countryCodes Set of country codes for the selected countries.
     */
    fun handleCountriesSelected(countryCodes: Set<String>)

    /**
     * Handles the user skipping the "Follow your team" card.
     */
    fun handleSkippedFollowTeam()

    /**
     * Handles the user dismissing the sports widget from the homepage.
     */
    fun handleSportsWidgetDismissed()

    /**
     * Handles the user dismissing the countdown widget from the homepage.
     */
    fun handleCountdownWidgetDismissed()

    /**
     * Handles the user clicking the "View Schedule" button.
     */
    fun handleViewScheduleClicked()

    /**
     * Handles the user tapping the reload button to manually refresh match data.
     */
    fun handleRefreshClicked(source: LiveMatchRefreshSource)

    /**
     * Handles the user clicking the "Get custom wallpaper" menu item.
     */
    fun handleOnGetCustomWallpaperClicked()

    /**
     * Handles the user clicking the "Share" menu item to share the World Cup schedule.
     */
    fun handleSportsWidgetShareClicked()

    /**
     * Called when the user clicks a Match.
     */
    fun handleMatchClicked(homeTeam: String?, awayTeam: String?, date: String?)

    /**
     * Called when a sports widget card is shown to the user, either as the initial impression or
     * after the user swipes to a new page in the pager.
     */
    fun handleSportsWidgetCardShown(cardType: SportsCardType, source: SportsCardImpressionSource)

    /**
     * Called when the country selector bottom sheet is displayed.
     */
    fun handleCountrySelectorShown(source: CountrySelectorSource)
}

/**
 * Default implementation of [SportsController] that dispatches actions to the [AppStore].
 *
 * @param appStore The [AppStore] to dispatch actions to.
 * @param browserStore [BrowserStore] to sync from.
 * @param settings [Settings] used to persist sports widget preferences.
 * @param navController [NavController] used to navigate to a new browser fragment.
 * @param fenixBrowserUseCases [FenixBrowserUseCases] used to load the sports schedule.
 * @param shareUseCases [ShareUseCases] used to share the World Cup schedule.
 * @param worldCupLabel Localized "World Cup" label used as the base of the share search query.
 * @param shareCardTitle Localized card title used as the base of the share title.
 * @param connectivityManager [ConnectivityManager] used to short-circuit refresh requests when the device is offline.
 */
@Suppress("LongParameterList")
class DefaultSportsController(
    private val appStore: AppStore,
    private val browserStore: BrowserStore,
    private val settings: Settings,
    private val navController: NavController,
    private val fenixBrowserUseCases: FenixBrowserUseCases,
    private val shareUseCases: ShareUseCases,
    private val worldCupLabel: String,
    private val shareCardTitle: String,
    private val connectivityManager: ConnectivityManager?,
) : SportsController {

    override fun handleCountriesSelected(countryCodes: Set<String>) {
        settings.sportsSelectedCountries = countryCodes
        appStore.dispatch(AppAction.SportsWidgetAction.CountriesSelected(countryCodes = countryCodes))
        if (countryCodes.isNotEmpty()) {
            WorldCup.countrySelected.record()
        }
    }

    override fun handleSkippedFollowTeam() {
        settings.hasSkippedSportsFollowTeam = true
        appStore.dispatch(AppAction.SportsWidgetAction.FollowTeamSkipped)
        WorldCup.skipFollowTeamClicked.record()
    }

    override fun handleSportsWidgetDismissed() {
        settings.showHomepageSportsWidget = false
        appStore.dispatch(AppAction.SportsWidgetAction.VisibilityChanged(isVisible = false))
        WorldCup.sportsWidgetDismissed.record()
    }

    override fun handleCountdownWidgetDismissed() {
        settings.showHomepageCountdownWidget = false
        appStore.dispatch(AppAction.SportsWidgetAction.CountdownVisibilityChanged(isCountdownVisible = false))
        WorldCup.countdownCrossActionClicked.record()
    }

    override fun handleRefreshClicked(source: LiveMatchRefreshSource) {
        val action = if (connectivityManager?.isOnline() == true) {
            AppAction.SportsWidgetAction.FetchMatches
        } else {
            AppAction.SportsWidgetAction.FetchFailed(SportCardErrorState.ConnectionInterrupted)
        }
        appStore.dispatch(action)
        WorldCup.refreshClicked.record(
            extra = WorldCup.RefreshClickedExtra(source = source.value),
        )
    }

    override fun handleViewScheduleClicked() {
        navController.openToBrowser()

        fenixBrowserUseCases.loadUrlOrSearch(
            searchTermOrURL = SPORT_SCHEDULE_URL,
            private = appStore.state.mode.isPrivate,
            newTab = true,
        )
        WorldCup.viewScheduleOnCountdownClicked.record()
    }

    override fun handleOnGetCustomWallpaperClicked() {
        navController.navigate(R.id.wallpaperSettingsFragment)
        WorldCup.getCustomWallpaperClicked.record()
    }

    override fun handleSportsWidgetShareClicked() {
        val searchEngine = appStore.state.searchState.selectedSearchEngine?.searchEngine
            ?: browserStore.state.search.selectedOrDefaultSearchEngine
        val query = worldCupLabel + SCHEDULE_QUERY_SUFFIX
        val scheduleUrl = searchEngine?.buildSearchUrl(query) ?: return
        val shareTitle = shareCardTitle + SHARE_TITLE_EMOJI_SUFFIX

        shareUseCases.shareUrl(
            id = null,
            url = scheduleUrl,
            title = shareTitle,
            source = ShareSource.HOME,
            isPrivate = appStore.state.mode.isPrivate,
            navigateToShareFragment = {
                val directions = HomeFragmentDirections.actionGlobalShareFragment(
                    shareSubject = shareTitle,
                    data = arrayOf(ShareData(url = scheduleUrl, title = shareTitle)),
                )
                navController.nav(R.id.homeFragment, directions)
            },
        )

        WorldCup.sportsWidgetShared.record()
    }

    override fun handleMatchClicked(homeTeam: String?, awayTeam: String?, date: String?) {
        navController.openToBrowser()

        val homeName = homeTeam?.let { localizedCountryName(it) }
        val awayName = awayTeam?.let { localizedCountryName(it) }
        val searchTerm = when {
            homeName != null && awayName != null -> "$homeName vs $awayName"
            homeName != null -> "$date $homeName vs"
            awayName != null -> "$date $awayName vs"
            else -> date.orEmpty()
        }

        fenixBrowserUseCases.loadUrlOrSearch(
            searchTermOrURL = searchTerm,
            newTab = true,
            private = appStore.state.mode.isPrivate,
            searchEngine = appStore.state.searchState.selectedSearchEngine?.searchEngine
                ?: browserStore.state.search.selectedOrDefaultSearchEngine,
        )

        WorldCup.matchClicked.record()
    }

    override fun handleSportsWidgetCardShown(cardType: SportsCardType, source: SportsCardImpressionSource) {
        WorldCup.sportsWidgetCardShown.record(
            extra = WorldCup.SportsWidgetCardShownExtra(
                source = source.value,
                cardType = cardType.value,
            ),
        )
    }

    override fun handleCountrySelectorShown(source: CountrySelectorSource) {
        WorldCup.countrySelectorDisplayed.record(extra = WorldCup.CountrySelectorDisplayedExtra(source = source.value))
    }

    companion object {
        const val SPORT_SCHEDULE_URL =
            "https://www.fifa.com/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"

        // Appended (in English) to the localized "World Cup" label to form the search query
        internal const val SCHEDULE_QUERY_SUFFIX = " schedule"

        // Fox + soccer ball appended to the share title
        internal const val SHARE_TITLE_EMOJI_SUFFIX = " \uD83E\uDD8A\u26BD\uFE0F"
    }
}
