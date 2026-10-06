/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.sports

import org.mozilla.fenix.home.sports.MatchCard
import org.mozilla.fenix.home.sports.SportCardErrorState
import org.mozilla.fenix.home.sports.hasWorldCupEnded
import org.mozilla.fenix.home.sports.hasWorldCupStarted
import org.mozilla.fenix.home.sports.isOneWeekToWorldCup

/**
 * State of the sports widget on the homepage.
 *
 * @property countriesSelected Set of ISO codes of the selected countries, empty if none.
 * @property eliminatedCountries Set of ISO codes of teams that have been eliminated from the
 * tournament, empty if none. Derived from match data.
 * @property hasSkippedFollowTeam Whether the user skipped the "Follow your team" card.
 * @property isVisible Whether the sports widget is visible on the homepage.
 * @property isFeatureEnabled Whether the Homepage Sports Widget feature is enabled.
 * @property isCountdownWidgetVisible Whether the Homepage Countdown Widget feature is enabled.
 * @property matchCardStates The list of [MatchCard]s to render on the homepage, or empty when no match
 * data is available.
 * @property isDebugToolVisible Whether the debug tool for adjusting [SportsWidgetState]
 * is currently displayed on the homepage.
 * @property hasWorldCupStartedOverride Debug-only override for [hasWorldCupStarted].
 * @property errorState The [SportCardErrorState] if the last fetch failed, null otherwise.
 * @property isOneWeekToWorldCupOverride Debug-only override for [isOneWeekToWorldCup].
 * @property forceOneWeekToWorldCup Nimbus-controlled flag that forces [isOneWeekToWorldCup]
 * to true regardless of the device date. The natural date check still applies when this is
 * false; the debug override still wins over both.
 */
data class SportsWidgetState(
    val countriesSelected: Set<String> = emptySet(),
    val eliminatedCountries: Set<String> = emptySet(),
    val hasSkippedFollowTeam: Boolean = false,
    val isVisible: Boolean = true,
    val isFeatureEnabled: Boolean = false,
    val isCountdownWidgetVisible: Boolean = true,
    val matchCardStates: List<MatchCard> = emptyList(),
    val isDebugToolVisible: Boolean = false,
    val hasWorldCupStartedOverride: Boolean? = null,
    val errorState: SportCardErrorState? = null,
    val isOneWeekToWorldCupOverride: Boolean? = null,
    val forceOneWeekToWorldCup: Boolean = false,
) {
    /**
     * Whether the sports widget should be rendered on the homepage: true only when the feature
     * is enabled, the user has not dismissed the widget, and the World Cup hasn't ended yet.
     * After [hasWorldCupEnded] the widget is retired for everyone regardless of the feature flag.
     */
    val isShown: Boolean
        get() = isFeatureEnabled && isVisible && !hasWorldCupEnded()

    val hasWorldCupStarted: Boolean
        get() = hasWorldCupStartedOverride ?: hasWorldCupStarted()

    val isOneWeekToWorldCup: Boolean
        get() = isOneWeekToWorldCupOverride ?: (forceOneWeekToWorldCup || isOneWeekToWorldCup())

    val isCountdownShown: Boolean
        get() = !hasWorldCupStarted && !isOneWeekToWorldCup && isCountdownWidgetVisible

    val isFollowTeamsCardShown: Boolean
        get() = !hasSkippedFollowTeam && countriesSelected.isEmpty()
}
