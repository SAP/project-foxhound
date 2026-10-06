/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.sports

import org.mozilla.fenix.components.appstate.AppAction.SportsWidgetAction
import org.mozilla.fenix.components.appstate.AppState

/**
 * [AppState] reducer for [SportsWidgetAction].
 */
internal object SportsWidgetReducer {
    fun reduce(state: AppState, action: SportsWidgetAction): AppState = when (action) {
        is SportsWidgetAction.CountriesSelected -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                countriesSelected = action.countryCodes,
            ),
        )

        SportsWidgetAction.FollowTeamSkipped -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                hasSkippedFollowTeam = true,
            ),
        )

        is SportsWidgetAction.VisibilityChanged -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                isVisible = action.isVisible,
            ),
        )

        is SportsWidgetAction.CountdownVisibilityChanged -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                isCountdownWidgetVisible = action.isCountdownVisible,
            ),
        )

        is SportsWidgetAction.MatchCardStateUpdated -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                matchCardStates = action.matchCardStates,
            ),
        )

        is SportsWidgetAction.EliminatedCountriesUpdated -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                eliminatedCountries = action.countryCodes,
            ),
        )

        is SportsWidgetAction.DebugToolVisibilityChanged -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                isDebugToolVisible = action.visible,
            ),
        )

        is SportsWidgetAction.WorldCupStartedOverrideUpdated -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                hasWorldCupStartedOverride = action.hasWorldCupStartedOverride,
                // The two debug overrides are mutually exclusive: turning "World Cup has
                // started" ON forces "One week to World Cup" OFF (and vice versa below).
                // Setting the other to an explicit `false` (not null) ensures the natural
                // date check and the Nimbus force flag both get overridden too.
                isOneWeekToWorldCupOverride = if (action.hasWorldCupStartedOverride) {
                    false
                } else {
                    state.sportsWidgetState.isOneWeekToWorldCupOverride
                },
            ),
        )

        is SportsWidgetAction.SkipFollowTeamUpdated -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                hasSkippedFollowTeam = action.hasSkippedFollowTeam,
            ),
        )

        SportsWidgetAction.FetchMatches -> state

        is SportsWidgetAction.FetchFailed -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                errorState = action.error,
            ),
        )

        SportsWidgetAction.ErrorStateCleared -> if (state.sportsWidgetState.errorState == null) {
            state
        } else {
            state.copy(sportsWidgetState = state.sportsWidgetState.copy(errorState = null))
        }

        is SportsWidgetAction.OneWeekToWorldCupOverrideUpdated -> state.copy(
            sportsWidgetState = state.sportsWidgetState.copy(
                isOneWeekToWorldCupOverride = action.isOneWeekToWorldCupOverride,
                // Mutually exclusive with the WorldCupStarted override (see comment above).
                hasWorldCupStartedOverride = if (action.isOneWeekToWorldCupOverride) {
                    false
                } else {
                    state.sportsWidgetState.hasWorldCupStartedOverride
                },
            ),
        )
    }
}
