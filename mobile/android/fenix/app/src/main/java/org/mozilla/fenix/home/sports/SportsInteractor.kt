/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

/**
 * Interface for sports widget user interactions on the homepage.
 */
interface SportsInteractor {

    /**
     * Called when the user selects countries in the sports widget country selector.
     *
     * @param countryCodes Set of ISO codes of the selected countries.
     */
    fun onCountriesSelected(countryCodes: Set<String>)

    /**
     * Called when the user dismisses the "Follow your team" card via the "Skip" action.
     */
    fun onSkippedFollowTeam()

    /**
     * Called when the user dismisses the sports widget.
     */
    fun onSportsWidgetDismissed()

    /**
     * Called when the user dismisses the countdown widget.
     */
    fun onCountdownWidgetDismissed()

    /**
     * Called when the user clicks the "View Schedule" button.
     */
    fun onViewScheduleClicked()

    /**
     * Called when the user taps the reload button to manually refresh match data.
     */
    fun onRefreshClicked(source: LiveMatchRefreshSource)

    /**
     * Called when the user clicks the "Get custom wallpaper" menu item.
     */
    fun onGetCustomWallpaperClicked()

    /**
     * Called when the user clicks the "Share" menu item.
     */
    fun onSportsWidgetShareClicked()

    /**
     * Called when the user clicks a Match.
     */
    fun onMatchClicked(homeTeam: String?, awayTeam: String?, date: String?)

    /**
     * Called when a sports widget card is shown — either as the initial impression
     * or after a swipe within the pager.
     */
    fun onSportsWidgetCardShown(cardType: SportsCardType, source: SportsCardImpressionSource)

    /**
     * Called when the country selector bottom sheet is displayed.
     */
    fun onCountrySelectorShown(source: CountrySelectorSource)
}

/**
 * Default implementation of [SportsInteractor] that delegates to a [SportsController].
 *
 * @param controller The [SportsController] to delegate interactions to.
 */
class DefaultSportsInteractor(
    private val controller: SportsController,
) : SportsInteractor {

    override fun onCountriesSelected(countryCodes: Set<String>) {
        controller.handleCountriesSelected(countryCodes = countryCodes)
    }

    override fun onSkippedFollowTeam() {
        controller.handleSkippedFollowTeam()
    }

    override fun onSportsWidgetDismissed() {
        controller.handleSportsWidgetDismissed()
    }

    override fun onCountdownWidgetDismissed() {
        controller.handleCountdownWidgetDismissed()
    }

    override fun onViewScheduleClicked() {
        controller.handleViewScheduleClicked()
    }

    override fun onRefreshClicked(source: LiveMatchRefreshSource) {
        controller.handleRefreshClicked(source)
    }

    override fun onGetCustomWallpaperClicked() {
        controller.handleOnGetCustomWallpaperClicked()
    }

    override fun onSportsWidgetShareClicked() {
        controller.handleSportsWidgetShareClicked()
    }

    override fun onMatchClicked(homeTeam: String?, awayTeam: String?, date: String?) {
        controller.handleMatchClicked(homeTeam = homeTeam, awayTeam = awayTeam, date = date)
    }

    override fun onSportsWidgetCardShown(cardType: SportsCardType, source: SportsCardImpressionSource) {
        controller.handleSportsWidgetCardShown(cardType = cardType, source = source)
    }

    override fun onCountrySelectorShown(source: CountrySelectorSource) {
        controller.handleCountrySelectorShown(source)
    }
}
