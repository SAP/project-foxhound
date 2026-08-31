/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.sports

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.AppStoreReducer
import org.mozilla.fenix.home.sports.SportCardErrorState
import org.mozilla.fenix.home.sports.TournamentRound
import org.mozilla.fenix.home.sports.fake.FakeMatchCardScenario

class SportsWidgetReducerTest {

    @Test
    fun `GIVEN no countries selected WHEN CountriesSelected is dispatched with countries THEN countriesSelected is updated`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountriesSelected(countryCodes = setOf("US", "JP")),
        )

        assertEquals(
            setOf("US", "JP"),
            finalState.sportsWidgetState.countriesSelected,
        )
    }

    @Test
    fun `GIVEN countries already selected WHEN CountriesSelected is dispatched THEN countriesSelected is replaced`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(countriesSelected = setOf("US")),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountriesSelected(countryCodes = setOf("JP", "BR")),
        )

        assertEquals(
            setOf("JP", "BR"),
            finalState.sportsWidgetState.countriesSelected,
        )
    }

    @Test
    fun `GIVEN countries selected WHEN CountriesSelected is dispatched with empty set THEN countriesSelected is cleared`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(countriesSelected = setOf("US")),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountriesSelected(countryCodes = emptySet()),
        )

        assertEquals(
            emptySet<String>(),
            finalState.sportsWidgetState.countriesSelected,
        )
    }

    @Test
    fun `GIVEN default state WHEN CountriesSelected is dispatched THEN countriesSelected is updated`() {
        val initialState = AppState()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountriesSelected(countryCodes = setOf("DE")),
        )

        assertEquals(
            setOf("DE"),
            finalState.sportsWidgetState.countriesSelected,
        )
    }

    @Test
    fun `GIVEN hasSkippedFollowTeam is false WHEN SkippedFollowTeam is dispatched THEN hasSkippedFollowTeam is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(hasSkippedFollowTeam = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.FollowTeamSkipped,
        )

        assertTrue(finalState.sportsWidgetState.hasSkippedFollowTeam)
    }

    @Test
    fun `GIVEN hasSkippedFollowTeam is true WHEN SkippedFollowTeam is dispatched THEN hasSkippedFollowTeam remains true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(hasSkippedFollowTeam = true),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.FollowTeamSkipped,
        )

        assertTrue(finalState.sportsWidgetState.hasSkippedFollowTeam)
    }

    @Test
    fun `GIVEN countries already selected WHEN SkippedFollowTeam is dispatched THEN countriesSelected is preserved`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(countriesSelected = setOf("US")),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.FollowTeamSkipped,
        )

        assertEquals(setOf("US"), finalState.sportsWidgetState.countriesSelected)
        assertEquals(true, finalState.sportsWidgetState.hasSkippedFollowTeam)
    }

    @Test
    fun `GIVEN isVisible is true WHEN VisibilityChanged is dispatched with false THEN isVisible is false`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isVisible = true),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.VisibilityChanged(isVisible = false),
        )

        assertFalse(finalState.sportsWidgetState.isVisible)
    }

    @Test
    fun `GIVEN isVisible is false WHEN VisibilityChanged is dispatched with true THEN isVisible is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isVisible = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.VisibilityChanged(isVisible = true),
        )

        assertTrue(finalState.sportsWidgetState.isVisible)
    }

    @Test
    fun `GIVEN isVisible is false WHEN VisibilityChanged is dispatched with false THEN isVisible remains false`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isVisible = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.VisibilityChanged(isVisible = false),
        )

        assertFalse(finalState.sportsWidgetState.isVisible)
    }

    @Test
    fun `GIVEN countries and skip state WHEN VisibilityChanged is dispatched THEN other fields are preserved`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                countriesSelected = setOf("US"),
                hasSkippedFollowTeam = true,
                isVisible = true,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.VisibilityChanged(isVisible = false),
        )

        assertEquals(setOf("US"), finalState.sportsWidgetState.countriesSelected)
        assertTrue(finalState.sportsWidgetState.hasSkippedFollowTeam)
        assertFalse(finalState.sportsWidgetState.isVisible)
    }

    @Test
    fun `GIVEN isCountdownWidgetVisible is true WHEN CountdownVisibilityChanged is dispatched with false THEN isCountdownWidgetVisible is false`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isCountdownWidgetVisible = true),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountdownVisibilityChanged(isCountdownVisible = false),
        )

        assertFalse(finalState.sportsWidgetState.isCountdownWidgetVisible)
    }

    @Test
    fun `GIVEN isCountdownWidgetVisible is false WHEN CountdownVisibilityChanged is dispatched with true THEN isCountdownWidgetVisible is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isCountdownWidgetVisible = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountdownVisibilityChanged(isCountdownVisible = true),
        )

        assertTrue(finalState.sportsWidgetState.isCountdownWidgetVisible)
    }

    @Test
    fun `GIVEN isCountdownWidgetVisible is false WHEN CountdownVisibilityChanged is dispatched with false THEN isCountdownWidgetVisible remains false`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isCountdownWidgetVisible = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountdownVisibilityChanged(isCountdownVisible = false),
        )

        assertFalse(finalState.sportsWidgetState.isCountdownWidgetVisible)
    }

    @Test
    fun `GIVEN countries and skip state WHEN CountdownVisibilityChanged is dispatched THEN other fields are preserved`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                countriesSelected = setOf("US"),
                hasSkippedFollowTeam = true,
                isVisible = true,
                isCountdownWidgetVisible = true,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.CountdownVisibilityChanged(isCountdownVisible = false),
        )

        assertEquals(setOf("US"), finalState.sportsWidgetState.countriesSelected)
        assertTrue(finalState.sportsWidgetState.hasSkippedFollowTeam)
        assertTrue(finalState.sportsWidgetState.isVisible)
        assertFalse(finalState.sportsWidgetState.isCountdownWidgetVisible)
    }

    @Test
    fun `GIVEN matchCardStates is empty WHEN MatchCardStateUpdated is dispatched with a card THEN matchCardStates is set`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(matchCardStates = emptyList()),
        )
        val matchCardStates = FakeMatchCardScenario.Live.build()

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.MatchCardStateUpdated(matchCardStates = matchCardStates),
        )

        assertEquals(matchCardStates, finalState.sportsWidgetState.matchCardStates)
    }

    @Test
    fun `GIVEN matchCardStates is set WHEN MatchCardStateUpdated is dispatched with an empty list THEN matchCardStates is cleared`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(matchCardStates = FakeMatchCardScenario.Live.build()),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.MatchCardStateUpdated(matchCardStates = emptyList()),
        )

        assertTrue(finalState.sportsWidgetState.matchCardStates.isEmpty())
    }

    @Test
    fun `GIVEN matchCardStates is set WHEN MatchCardStateUpdated is dispatched with a different card THEN matchCardStates is replaced`() {
        val original = FakeMatchCardScenario.Live.build()
        val replacement = original.first().copy(round = TournamentRound.QUARTER_FINAL)
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(matchCardStates = original),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.MatchCardStateUpdated(matchCardStates = listOf(replacement)),
        )

        assertEquals(listOf(replacement), finalState.sportsWidgetState.matchCardStates)
    }

    @Test
    fun `GIVEN errorState is set WHEN MatchCardStateUpdated is dispatched THEN errorState is preserved`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                matchCardStates = emptyList(),
                errorState = SportCardErrorState.LoadFailed,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.MatchCardStateUpdated(
                matchCardStates = FakeMatchCardScenario.Live.build(),
            ),
        )

        assertEquals(SportCardErrorState.LoadFailed, finalState.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN errorState is set WHEN ErrorStateCleared is dispatched THEN errorState is cleared`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                errorState = SportCardErrorState.ConnectionInterrupted,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.ErrorStateCleared,
        )

        assertNull(finalState.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN errorState is set and matchCardStates populated WHEN ErrorStateCleared is dispatched THEN matchCardStates are preserved`() {
        val cards = FakeMatchCardScenario.Live.build()
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                matchCardStates = cards,
                errorState = SportCardErrorState.LoadFailed,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.ErrorStateCleared,
        )

        assertNull(finalState.sportsWidgetState.errorState)
        assertEquals(cards, finalState.sportsWidgetState.matchCardStates)
    }

    @Test
    fun `GIVEN errorState is already null WHEN ErrorStateCleared is dispatched THEN state is unchanged`() {
        val initialState = AppState(sportsWidgetState = SportsWidgetState(errorState = null))

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.ErrorStateCleared,
        )

        assertSame(initialState, finalState)
    }

    @Test
    fun `GIVEN errorState is set WHEN MatchCardStateUpdated is dispatched with an empty list THEN errorState is preserved`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                matchCardStates = FakeMatchCardScenario.Live.build(),
                errorState = SportCardErrorState.ConnectionInterrupted,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.MatchCardStateUpdated(matchCardStates = emptyList()),
        )

        assertEquals(SportCardErrorState.ConnectionInterrupted, finalState.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN unrelated fields are set WHEN MatchCardStateUpdated is dispatched THEN other fields are preserved`() {
        val matchCardStates = FakeMatchCardScenario.Live.build()
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                countriesSelected = setOf("US"),
                hasSkippedFollowTeam = true,
                isVisible = true,
                isFeatureEnabled = true,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.MatchCardStateUpdated(matchCardStates = matchCardStates),
        )

        assertEquals(setOf("US"), finalState.sportsWidgetState.countriesSelected)
        assertTrue(finalState.sportsWidgetState.hasSkippedFollowTeam)
        assertTrue(finalState.sportsWidgetState.isVisible)
        assertTrue(finalState.sportsWidgetState.isFeatureEnabled)
        assertEquals(matchCardStates, finalState.sportsWidgetState.matchCardStates)
    }

    @Test
    fun `GIVEN no eliminated countries WHEN EliminatedCountriesUpdated is dispatched THEN eliminatedCountries is set`() {
        val initialState = AppState(sportsWidgetState = SportsWidgetState())

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.EliminatedCountriesUpdated(countryCodes = setOf("MEX", "RSA")),
        )

        assertEquals(setOf("MEX", "RSA"), finalState.sportsWidgetState.eliminatedCountries)
    }

    @Test
    fun `GIVEN eliminated countries set WHEN EliminatedCountriesUpdated is dispatched with empty set THEN eliminatedCountries is cleared`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(eliminatedCountries = setOf("MEX")),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.EliminatedCountriesUpdated(countryCodes = emptySet()),
        )

        assertTrue(finalState.sportsWidgetState.eliminatedCountries.isEmpty())
    }

    @Test
    fun `GIVEN isDebugToolVisible is false WHEN DebugToolVisibilityChanged is dispatched with true THEN isDebugToolVisible is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isDebugToolVisible = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.DebugToolVisibilityChanged(visible = true),
        )

        assertTrue(finalState.sportsWidgetState.isDebugToolVisible)
    }

    @Test
    fun `GIVEN hasWorldCupStartedOverride is false WHEN WorldCupStartedUpdated is dispatched with true THEN hasWorldCupStarted is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(hasWorldCupStartedOverride = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.WorldCupStartedOverrideUpdated(hasWorldCupStartedOverride = true),
        )

        assertTrue(finalState.sportsWidgetState.hasWorldCupStarted)
    }

    @Test
    fun `GIVEN hasSkippedFollowTeam is false WHEN SkipFollowTeamUpdated is dispatched with true THEN hasSkippedFollowTeam is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(hasSkippedFollowTeam = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.SkipFollowTeamUpdated(hasSkippedFollowTeam = true),
        )

        assertTrue(finalState.sportsWidgetState.hasSkippedFollowTeam)
    }

    @Test
    fun `GIVEN isOneWeekToWorldCupOverride is false WHEN WorldCupStartedUpdated is dispatched with true THEN isOneWeekToWorldCup is true`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(isOneWeekToWorldCupOverride = false),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.OneWeekToWorldCupOverrideUpdated(isOneWeekToWorldCupOverride = true),
        )

        assertTrue(finalState.sportsWidgetState.isOneWeekToWorldCup)
    }

    @Test
    fun `WHEN WorldCupStarted override turned ON THEN OneWeek override is forced off`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                hasWorldCupStartedOverride = false,
                isOneWeekToWorldCupOverride = true,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.WorldCupStartedOverrideUpdated(hasWorldCupStartedOverride = true),
        )

        assertTrue(finalState.sportsWidgetState.hasWorldCupStarted)
        assertFalse(finalState.sportsWidgetState.isOneWeekToWorldCup)
    }

    @Test
    fun `WHEN OneWeek override turned ON THEN WorldCupStarted override is forced off`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                hasWorldCupStartedOverride = true,
                isOneWeekToWorldCupOverride = false,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.OneWeekToWorldCupOverrideUpdated(isOneWeekToWorldCupOverride = true),
        )

        assertTrue(finalState.sportsWidgetState.isOneWeekToWorldCup)
        assertFalse(finalState.sportsWidgetState.hasWorldCupStarted)
    }

    @Test
    fun `WHEN OneWeek override turned OFF THEN WorldCupStarted override is preserved`() {
        val initialState = AppState(
            sportsWidgetState = SportsWidgetState(
                hasWorldCupStartedOverride = true,
                isOneWeekToWorldCupOverride = false,
            ),
        )

        val finalState = AppStoreReducer.reduce(
            initialState,
            AppAction.SportsWidgetAction.OneWeekToWorldCupOverrideUpdated(isOneWeekToWorldCupOverride = false),
        )

        // Toggling one OFF doesn't touch the other.
        assertTrue(finalState.sportsWidgetState.hasWorldCupStarted)
        assertFalse(finalState.sportsWidgetState.isOneWeekToWorldCup)
    }
}
