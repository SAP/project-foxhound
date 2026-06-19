/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.SportsWidgetAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.sports.SportsWidgetState
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class SportsWidgetMiddlewareTest {

    private val zone = ZoneId.of("America/New_York")

    @Test
    fun `GIVEN FetchMatches WHEN repo succeeds THEN dispatches MatchCardStateUpdated`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(1, repo.fetchCount)
        assertTrue(store.state.sportsWidgetState.matchCardStates.isNotEmpty())
    }

    @Test
    fun `GIVEN FetchMatches WHEN repo fails THEN dispatches FetchFailed`() = runTest {
        val repo = StubRepository(Result.failure(RuntimeException("boom")))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(SportCardErrorState.LoadFailed, store.state.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN device is offline WHEN FetchMatches THEN repo is not called and ConnectionInterrupted is dispatched`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo, connectivityManager = offlineConnectivityManager())

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(0, repo.fetchCount)
        assertEquals(SportCardErrorState.ConnectionInterrupted, store.state.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN prior errorState WHEN FetchMatches succeeds THEN errorState is cleared`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(
            repo,
            SportsWidgetState(errorState = SportCardErrorState.ConnectionInterrupted),
        )

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(null, store.state.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN prior errorState and cached matches WHEN CountriesSelected uses cache THEN errorState is preserved`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        // Seed an error after the cache is warm, then re-derive via CountriesSelected.
        store.dispatch(SportsWidgetAction.FetchFailed(SportCardErrorState.LoadFailed))
        dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("USA")))

        assertEquals(1, repo.fetchCount)
        assertEquals(SportCardErrorState.LoadFailed, store.state.sportsWidgetState.errorState)
    }

    @Test
    fun `GIVEN no cache WHEN CountriesSelected dispatched THEN fetches fresh`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("USA")))

        assertEquals(1, repo.fetchCount)
    }

    @Test
    fun `GIVEN cache present WHEN CountriesSelected dispatched THEN reuses cache without fetching`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        val baselineFetches = repo.fetchCount
        dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("MEX")))

        assertEquals(baselineFetches, repo.fetchCount)
        assertTrue(store.state.sportsWidgetState.matchCardStates.isNotEmpty())
    }

    @Test
    fun `GIVEN cache present WHEN CountriesSelected with unrelated team THEN cards filtered to empty`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("JPN")))

        // No matches in our fixture involve JPN, so buildForTeam yields zero cards.
        assertEquals(0, store.state.sportsWidgetState.matchCardStates.size)
    }

    @Test
    fun `WHEN OneWeekToWorldCupOverrideUpdated dispatched THEN triggers a fetch`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(
            store,
            SportsWidgetAction.OneWeekToWorldCupOverrideUpdated(isOneWeekToWorldCupOverride = true),
        )

        assertEquals(1, repo.fetchCount)
        assertTrue(store.state.sportsWidgetState.matchCardStates.isNotEmpty())
    }

    @Test
    fun `WHEN WorldCupStartedOverrideUpdated dispatched THEN triggers a fetch`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(
            store,
            SportsWidgetAction.WorldCupStartedOverrideUpdated(hasWorldCupStartedOverride = true),
        )

        assertEquals(1, repo.fetchCount)
    }

    @Test
    fun `GIVEN a decided final not involving the followed team THEN the celebration card survives the team filter`() =
        runTest {
            // CAN beats AUS in the final; user follows JPN (not in the final).
            val can = SportsTeam("CAN", 10L, "Canada", "CAN", null, null, false)
            val aus = SportsTeam("AUS", 11L, "Australia", "AUS", null, null, true)
            val finalMatch = SportsMatch(
                globalEventId = 99L,
                date = ZonedDateTime.of(2026, 7, 19, 14, 0, 0, 0, zone),
                homeTeam = can,
                awayTeam = aus,
                matchStatus = MatchStatus.FinalAfterPenalties(homePenalty = 4, awayPenalty = 3),
                homeScore = 1,
                awayScore = 1,
                homeExtra = null,
                awayExtra = null,
                homePenalty = 4,
                awayPenalty = 3,
                clock = null,
                period = null,
                updated = null,
                venue = null,
                stage = TournamentRound.FINAL,
            )
            val repo = StubRepository(
                Result.success(
                    TeamMatchesResult(
                        previous = listOf(finalMatch),
                        current = emptyList(),
                        next = emptyList(),
                    ),
                ),
            )
            val store = appStore(repo)

            dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
            dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("JPN")))

            val cards = store.state.sportsWidgetState.matchCardStates
            assertEquals(1, cards.size)
            assertEquals(TournamentRound.FINAL, cards[0].round)
            val outcome = cards[0].viewerOutcome
            assertIs<FollowedTeamOutcome.TournamentWinner>(outcome)
            assertEquals("CAN", outcome.winner.key)
        }

    @Test
    fun `GIVEN followed team is eliminated WHEN fetch succeeds THEN renders the generic experience`() = runTest {
        // MEX (followed) is eliminated; RSA is still in. The R32 match is between two
        // unrelated teams. The expectation: cards reflect the bracket-wide view
        // (R32 match present) rather than MEX-only cards (which would otherwise produce
        // a single group-stage card for the followed team).
        val mex = SportsTeam("MEX", 1L, "Mexico", "MEX", null, null, eliminated = true)
        val rsa = SportsTeam("RSA", 2L, "South Africa", "RSA", null, null, false)
        val can = SportsTeam("CAN", 3L, "Canada", "CAN", null, null, false)
        val aus = SportsTeam("AUS", 4L, "Australia", "AUS", null, null, false)
        val groupMatch = SportsMatch(
            globalEventId = 1L,
            date = ZonedDateTime.of(2026, 6, 11, 14, 0, 0, 0, zone),
            homeTeam = mex, awayTeam = rsa,
            matchStatus = MatchStatus.Final,
            homeScore = 0, awayScore = 2,
            homeExtra = null, awayExtra = null, homePenalty = null, awayPenalty = null,
            clock = null, period = null, updated = null, venue = null,
            stage = TournamentRound.GROUP_STAGE,
        )
        val r32Match = SportsMatch(
            globalEventId = 2L,
            date = ZonedDateTime.of(2026, 6, 28, 14, 0, 0, 0, zone),
            homeTeam = can, awayTeam = aus,
            matchStatus = MatchStatus.Final,
            homeScore = 1, awayScore = 0,
            homeExtra = null, awayExtra = null, homePenalty = null, awayPenalty = null,
            clock = null, period = null, updated = null, venue = null,
            stage = TournamentRound.ROUND_OF_32,
        )
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(groupMatch, r32Match),
                    current = emptyList(),
                    next = emptyList(),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("MEX")))

        val cards = store.state.sportsWidgetState.matchCardStates
        // The R32 match — not involving the followed team — surfaces in the generic
        // bracket-wide view, confirming we routed through buildForNoTeam.
        val anyR32 = cards.any { card ->
            card.round == TournamentRound.ROUND_OF_32 ||
                card.matches.any { it.home?.key == "CAN" || it.away?.key == "CAN" } ||
                card.relatedMatches.any { it.home?.key == "CAN" || it.away?.key == "CAN" }
        }
        assertTrue(anyR32)
    }

    @Test
    fun `GIVEN response includes eliminated teams WHEN fetch succeeds THEN eliminatedCountries reflects them`() = runTest {
        val mex = SportsTeam("MEX", 1L, "Mexico", "MEX", null, null, eliminated = true)
        val rsa = SportsTeam("RSA", 2L, "South Africa", "RSA", null, null, eliminated = false)
        val can = SportsTeam("CAN", 3L, "Canada", "CAN", null, null, eliminated = true)
        val aus = SportsTeam("AUS", 4L, "Australia", "AUS", null, null, eliminated = false)
        val groupMatch = SportsMatch(
            globalEventId = 1L,
            date = ZonedDateTime.of(2026, 6, 11, 14, 0, 0, 0, zone),
            homeTeam = mex, awayTeam = rsa,
            matchStatus = MatchStatus.Final,
            homeScore = 0, awayScore = 2,
            homeExtra = null, awayExtra = null, homePenalty = null, awayPenalty = null,
            clock = null, period = null, updated = null, venue = null,
            stage = TournamentRound.GROUP_STAGE,
        )
        val r32Match = SportsMatch(
            globalEventId = 2L,
            date = ZonedDateTime.of(2026, 6, 28, 14, 0, 0, 0, zone),
            homeTeam = can, awayTeam = aus,
            matchStatus = MatchStatus.Scheduled,
            homeScore = null, awayScore = null,
            homeExtra = null, awayExtra = null, homePenalty = null, awayPenalty = null,
            clock = null, period = null, updated = null, venue = null,
            stage = TournamentRound.ROUND_OF_32,
        )
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(groupMatch),
                    current = emptyList(),
                    next = listOf(r32Match),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(setOf("MEX", "CAN"), store.state.sportsWidgetState.eliminatedCountries)
    }

    @Test
    fun `GIVEN no eliminated teams in response WHEN fetch succeeds THEN eliminatedCountries is empty`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertTrue(store.state.sportsWidgetState.eliminatedCountries.isEmpty())
    }

    @Test
    fun `GIVEN followed team is not eliminated WHEN fetch succeeds THEN keeps the team-specific view`() = runTest {
        val mex = SportsTeam("MEX", 1L, "Mexico", "MEX", null, null, eliminated = false)
        val rsa = SportsTeam("RSA", 2L, "South Africa", "RSA", null, null, false)
        val match = SportsMatch(
            globalEventId = 1L,
            date = ZonedDateTime.of(2026, 6, 11, 14, 0, 0, 0, zone),
            homeTeam = mex, awayTeam = rsa,
            matchStatus = MatchStatus.Scheduled,
            homeScore = null, awayScore = null,
            homeExtra = null, awayExtra = null, homePenalty = null, awayPenalty = null,
            clock = null, period = null, updated = null, venue = null,
            stage = TournamentRound.GROUP_STAGE,
        )
        val repo = StubRepository(
            Result.success(TeamMatchesResult(emptyList(), emptyList(), listOf(match))),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        dispatchAndAwait(store, SportsWidgetAction.CountriesSelected(setOf("MEX")))

        val cards = store.state.sportsWidgetState.matchCardStates
        // Standard team-followed path: at least one card includes MEX.
        val anyMex = cards.any { card ->
            (card.matches + card.relatedMatches).any { it.home?.key == "MEX" || it.away?.key == "MEX" }
        }
        assertTrue(anyMex)
    }

    @Test
    fun `GIVEN no team WHEN first R32 game has kicked off THEN group stage is filtered out`() = runTest {
        // Group stage fully played; R32 day 1 also finished but nothing live right now —
        // the exact case where the -10-day window keeps surfacing prior-round matches.
        val groupDone = match(1L, day = 18, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Final)
        val r32Done = match(2L, day = 28, stage = TournamentRound.ROUND_OF_32, status = MatchStatus.Final)
        val r32Next = match(3L, day = 29, stage = TournamentRound.ROUND_OF_32, status = MatchStatus.Scheduled)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(groupDone, r32Done),
                    current = emptyList(),
                    next = listOf(r32Next),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(setOf(2L, 3L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN a live group-stage match exists THEN that round wins over any played R32`() = runTest {
        // Defensive case — the contract says one stage per day, so this shouldn't happen,
        // but if a live game and a past higher-round match coexist, the live game's round
        // takes priority for the active round (rule 1 beats rule 2): group stage is active.
        // R32 is then its (decided) next round, so it also surfaces via the next-round reveal.
        val groupLive = match(
            id = 1L,
            day = 28,
            stage = TournamentRound.GROUP_STAGE,
            status = MatchStatus.Live(period = "2", clock = "60"),
        )
        val r32Done = match(2L, day = 28, stage = TournamentRound.ROUND_OF_32, status = MatchStatus.Final)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(r32Done),
                    current = listOf(groupLive),
                    next = emptyList(),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(setOf(1L, 2L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN R16 has begun THEN R32 and group stage drop away`() = runTest {
        // QF, SF, FINAL still upcoming; max ordinal among played stages is R16. The QF fixture
        // is still fully undetermined (its teams depend on R16 results), so the next-round
        // reveal doesn't surface it yet — only the active R16 shows.
        val groupDone = match(1L, day = 18, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Final)
        val r32Done = match(2L, day = 28, stage = TournamentRound.ROUND_OF_32, status = MatchStatus.Final)
        val r16Done = match(3L, day = 4, stage = TournamentRound.ROUND_OF_16, status = MatchStatus.Final)
        val qfNext = match(
            id = 4L,
            day = 8,
            stage = TournamentRound.QUARTER_FINAL,
            status = MatchStatus.Scheduled,
            homeTeam = null,
            awayTeam = null,
        )
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(groupDone, r32Done, r16Done),
                    current = emptyList(),
                    next = listOf(qfNext),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(listOf(3L), matches.map { it.globalEventId })
    }

    @Test
    fun `GIVEN no team WHEN no match has been played yet THEN the soonest upcoming round wins`() = runTest {
        // Pre-tournament: nothing live, nothing finished. Fall back to the soonest match's stage.
        val firstGroup = match(1L, day = 11, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Scheduled)
        val laterGroup = match(2L, day = 12, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Scheduled)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = emptyList(),
                    current = emptyList(),
                    next = listOf(firstGroup, laterGroup),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val cards = store.state.sportsWidgetState.matchCardStates
        assertTrue(cards.isNotEmpty())
        cards.forEach { assertEquals(TournamentRound.GROUP_STAGE, it.round) }
    }

    @Test
    fun `GIVEN no team WHEN third place is decided and the final is upcoming THEN both surface`() = runTest {
        // Active round is the third-place playoff (max played ordinal), but the upcoming
        // final is pinned alongside it so its schedule stays visible; the past semi-final
        // drops away.
        val sfDone = match(1L, day = 15, stage = TournamentRound.SEMI_FINAL, status = MatchStatus.Final, month = 7)
        val thirdPlaceDone =
            match(2L, day = 18, stage = TournamentRound.THIRD_PLACE_PLAYOFF, status = MatchStatus.Final, month = 7)
        val finalNext = match(3L, day = 19, stage = TournamentRound.FINAL, status = MatchStatus.Scheduled, month = 7)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(sfDone, thirdPlaceDone),
                    current = emptyList(),
                    next = listOf(finalNext),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(setOf(2L, 3L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN the final is decided THEN the final and third place both surface`() = runTest {
        // Active round is the final, and the third-place playoff is pinned alongside it —
        // mirroring the followed-team path's bracket-finishing inclusion.
        val thirdPlaceDone =
            match(1L, day = 18, stage = TournamentRound.THIRD_PLACE_PLAYOFF, status = MatchStatus.Final, month = 7)
        val finalDone = match(2L, day = 19, stage = TournamentRound.FINAL, status = MatchStatus.Final, month = 7)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(thirdPlaceDone, finalDone),
                    current = emptyList(),
                    next = emptyList(),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(setOf(1L, 2L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN a next-round fixture has one side decided THEN it surfaces alongside the active round`() =
        runTest {
            // Group stage is active (its game is the most-recently played). The next round (R32)
            // has started to fill in: one fixture has a single team set (the other still TBD),
            // and another is fully undetermined. The decided-one-side fixture surfaces; the
            // fully-TBD one does not.
            val groupDone = match(1L, day = 18, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Final)
            val r32OneSide = match(
                id = 2L,
                day = 28,
                stage = TournamentRound.ROUND_OF_32,
                status = MatchStatus.Scheduled,
                awayTeam = null,
            )
            val r32FullyTbd = match(
                id = 3L,
                day = 29,
                stage = TournamentRound.ROUND_OF_32,
                status = MatchStatus.Scheduled,
                homeTeam = null,
                awayTeam = null,
            )
            val repo = StubRepository(
                Result.success(
                    TeamMatchesResult(
                        previous = listOf(groupDone),
                        current = emptyList(),
                        next = listOf(r32OneSide, r32FullyTbd),
                    ),
                ),
            )
            val store = appStore(repo)

            dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

            val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
            assertEquals(setOf(1L, 2L), matches.map { it.globalEventId }.toSet())
            // The surfaced next-round fixture renders with its undecided side absent (shown as TBD).
            val revealed = matches.first { it.globalEventId == 2L }
            assertEquals("MEX", revealed.home?.key)
            assertEquals(null, revealed.away)
        }

    @Test
    fun `GIVEN no team WHEN every next-round fixture is fully TBD THEN the next round is withheld`() = runTest {
        // R32 exists in the response but neither fixture has a team yet, so nothing from it
        // should leak into the pager — only the active group stage shows.
        val groupDone = match(1L, day = 18, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Final)
        val r32TbdA = match(
            id = 2L,
            day = 28,
            stage = TournamentRound.ROUND_OF_32,
            status = MatchStatus.Scheduled,
            homeTeam = null,
            awayTeam = null,
        )
        val r32TbdB = match(
            id = 3L,
            day = 29,
            stage = TournamentRound.ROUND_OF_32,
            status = MatchStatus.Scheduled,
            homeTeam = null,
            awayTeam = null,
        )
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(groupDone),
                    current = emptyList(),
                    next = listOf(r32TbdA, r32TbdB),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(setOf(1L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN a decided fixture is two rounds ahead THEN only the immediate next round is revealed`() =
        runTest {
            // Only the round immediately after the active one is surfaced. A decided R16 fixture
            // (two rounds ahead of the active group stage) stays hidden; the R32 one does not.
            val groupDone = match(1L, day = 18, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Final)
            val r32OneSide = match(
                id = 2L,
                day = 28,
                stage = TournamentRound.ROUND_OF_32,
                status = MatchStatus.Scheduled,
                awayTeam = null,
            )
            val r16OneSide = match(
                id = 3L,
                day = 5,
                month = 7,
                stage = TournamentRound.ROUND_OF_16,
                status = MatchStatus.Scheduled,
                awayTeam = null,
            )
            val repo = StubRepository(
                Result.success(
                    TeamMatchesResult(
                        previous = listOf(groupDone),
                        current = emptyList(),
                        next = listOf(r32OneSide, r16OneSide),
                    ),
                ),
            )
            val store = appStore(repo)

            dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

            val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
            assertEquals(setOf(1L, 2L), matches.map { it.globalEventId }.toSet())
        }

    @Test
    fun `GIVEN no team WHEN a group-stage and a next-round match fall on the same day THEN each round gets its own card`() =
        runTest {
            // Bug 2046721: the last group-stage games and the first revealed Round of 32 fixtures
            // can fall on the same day. Grouping by day alone merged them into one card labelled
            // GROUP_STAGE; each round must get its own card so R32 isn't shown under a group heading.
            val groupDone = match(1L, day = 28, stage = TournamentRound.GROUP_STAGE, status = MatchStatus.Final)
            val r32SameDay = match(2L, day = 28, stage = TournamentRound.ROUND_OF_32, status = MatchStatus.Scheduled)
            val repo = StubRepository(
                Result.success(
                    TeamMatchesResult(
                        previous = listOf(groupDone),
                        current = emptyList(),
                        next = listOf(r32SameDay),
                    ),
                ),
            )
            val store = appStore(repo)

            dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

            val cards = store.state.sportsWidgetState.matchCardStates
            assertEquals(
                setOf(TournamentRound.GROUP_STAGE, TournamentRound.ROUND_OF_32),
                cards.map { it.round }.toSet(),
            )
            val r32Card = cards.first { it.round == TournamentRound.ROUND_OF_32 }
            assertEquals(listOf(2L), (r32Card.matches + r32Card.relatedMatches).map { it.globalEventId })
            val groupCard = cards.first { it.round == TournamentRound.GROUP_STAGE }
            assertEquals(listOf(1L), (groupCard.matches + groupCard.relatedMatches).map { it.globalEventId })
        }

    @Test
    fun `GIVEN no team WHEN the quarter-final is live THEN the full remaining bracket including a fully-TBD semi-final shows`() =
        runTest {
            // From QF onward the run-in is locked in, so show every later round the response carries
            // — even a not-yet-determined semi-final — and drop the finished Round of 16.
            val r16Done = match(1L, day = 4, month = 7, stage = TournamentRound.ROUND_OF_16, status = MatchStatus.Final)
            val qfLive = match(
                id = 2L,
                day = 8,
                month = 7,
                stage = TournamentRound.QUARTER_FINAL,
                status = MatchStatus.Live(period = "1", clock = "20"),
            )
            val sfTbd = match(
                id = 3L,
                day = 14,
                month = 7,
                stage = TournamentRound.SEMI_FINAL,
                status = MatchStatus.Scheduled,
                homeTeam = null,
                awayTeam = null,
            )
            val tpp = match(4L, day = 18, month = 7, stage = TournamentRound.THIRD_PLACE_PLAYOFF, status = MatchStatus.Scheduled)
            val finalMatch = match(5L, day = 19, month = 7, stage = TournamentRound.FINAL, status = MatchStatus.Scheduled)
            val repo = StubRepository(
                Result.success(
                    TeamMatchesResult(
                        previous = listOf(r16Done),
                        current = listOf(qfLive),
                        next = listOf(sfTbd, tpp, finalMatch),
                    ),
                ),
            )
            val store = appStore(repo)

            dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

            val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
            // QF (active) + SF (fully TBD) + TPP + Final; the finished R16 drops away.
            assertEquals(setOf(2L, 3L, 4L, 5L), matches.map { it.globalEventId }.toSet())
        }

    @Test
    fun `GIVEN no team WHEN round of 16 is active THEN a fully-TBD quarter-final is still withheld`() = runTest {
        // Before the endgame the decided-only next-round rule still applies: a one-sided QF fixture
        // surfaces, but a fully-TBD QF (and the further-out SF) do not.
        val r16Done = match(1L, day = 4, month = 7, stage = TournamentRound.ROUND_OF_16, status = MatchStatus.Final)
        val qfDecided = match(
            id = 2L,
            day = 8,
            month = 7,
            stage = TournamentRound.QUARTER_FINAL,
            status = MatchStatus.Scheduled,
            awayTeam = null,
        )
        val qfTbd = match(
            id = 3L,
            day = 9,
            month = 7,
            stage = TournamentRound.QUARTER_FINAL,
            status = MatchStatus.Scheduled,
            homeTeam = null,
            awayTeam = null,
        )
        val sfTbd = match(
            id = 4L,
            day = 14,
            month = 7,
            stage = TournamentRound.SEMI_FINAL,
            status = MatchStatus.Scheduled,
            homeTeam = null,
            awayTeam = null,
        )
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(r16Done),
                    current = emptyList(),
                    next = listOf(qfDecided, qfTbd, sfTbd),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        // Active R16 + the decided QF fixture only; fully-TBD QF and the two-rounds-out SF are withheld.
        assertEquals(setOf(1L, 2L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN the semi-final is live THEN quarter-finals drop and TPP and final show`() = runTest {
        val qfDone = match(1L, day = 8, month = 7, stage = TournamentRound.QUARTER_FINAL, status = MatchStatus.Final)
        val sfLive = match(
            id = 2L,
            day = 14,
            month = 7,
            stage = TournamentRound.SEMI_FINAL,
            status = MatchStatus.Live(period = "2", clock = "70"),
        )
        val tpp = match(3L, day = 18, month = 7, stage = TournamentRound.THIRD_PLACE_PLAYOFF, status = MatchStatus.Scheduled)
        val finalMatch = match(4L, day = 19, month = 7, stage = TournamentRound.FINAL, status = MatchStatus.Scheduled)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(qfDone),
                    current = listOf(sfLive),
                    next = listOf(tpp, finalMatch),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        assertEquals(setOf(2L, 3L, 4L), matches.map { it.globalEventId }.toSet())
    }

    @Test
    fun `GIVEN no team WHEN before the quarter-finals THEN the final and third place are not pinned`() = runTest {
        // The always-pinned bracket-finishers were removed: until QF starts, only the active round
        // and the next round's decided fixtures show — the final / third-place don't appear even
        // when the response already carries them.
        val r16Done = match(1L, day = 4, month = 7, stage = TournamentRound.ROUND_OF_16, status = MatchStatus.Final)
        val qfDecided = match(
            id = 2L,
            day = 8,
            month = 7,
            stage = TournamentRound.QUARTER_FINAL,
            status = MatchStatus.Scheduled,
            awayTeam = null,
        )
        val tpp = match(3L, day = 18, month = 7, stage = TournamentRound.THIRD_PLACE_PLAYOFF, status = MatchStatus.Scheduled)
        val finalMatch = match(4L, day = 19, month = 7, stage = TournamentRound.FINAL, status = MatchStatus.Scheduled)
        val repo = StubRepository(
            Result.success(
                TeamMatchesResult(
                    previous = listOf(r16Done),
                    current = emptyList(),
                    next = listOf(qfDecided, tpp, finalMatch),
                ),
            ),
        )
        val store = appStore(repo)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        val matches = store.state.sportsWidgetState.matchCardStates.flatMap { it.matches + it.relatedMatches }
        // Active R16 + the decided QF fixture only; the final and third-place stay hidden until QF.
        assertEquals(setOf(1L, 2L), matches.map { it.globalEventId }.toSet())
    }

    // region fetch throttle / in-flight dedup

    @Test
    fun `fetch throttle GIVEN two dispatches within the interval THEN repository is called once`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        var nowMs = 0L
        val store = appStore(repo, clock = { nowMs })

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        nowMs = 30_000L
        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(1, repo.fetchCount)
    }

    @Test
    fun `fetch throttle GIVEN second dispatch after the interval THEN repository is called again`() = runTest {
        val repo = StubRepository(Result.success(resultWithMatches()))
        var nowMs = 0L
        val store = appStore(repo, clock = { nowMs })

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        nowMs = 60_000L
        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(2, repo.fetchCount)
    }

    @Test
    fun `fetch throttle GIVEN previous fetch failed THEN retry within interval is still throttled`() = runTest {
        // A failing endpoint must not be hammered by retries; the throttle is stamped on
        // attempt, not on success.
        val repo = StubRepository(Result.failure(RuntimeException("boom")))
        var nowMs = 0L
        val store = appStore(repo, clock = { nowMs })

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        nowMs = 10_000L
        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(1, repo.fetchCount)
    }

    @Test
    fun `fetch throttle GIVEN a custom Nimbus interval THEN the configured value is honored`() = runTest {
        // The throttle is wired in from the Nimbus `fetch-throttle-seconds` flag at
        // construction time; the middleware itself just respects whatever interval it's
        // handed. Verify that a smaller-than-default value lets a second dispatch
        // through that the default would have blocked.
        val repo = StubRepository(Result.success(resultWithMatches()))
        var nowMs = 0L
        val store = appStore(repo, clock = { nowMs }, fetchMinIntervalSeconds = 5)

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        nowMs = 10_000L // would be throttled at the 60s default; allowed at 5s.
        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(2, repo.fetchCount)
    }

    @Test
    fun `fetch throttle GIVEN bypassThrottle is true THEN repeat dispatches fetch immediately`() = runTest {
        // Mock-server / debug-drawer case: QA flips the bypass and expects refresh,
        // Home onResume, and "Apply session" to fire fetches without waiting on the
        // 60 s timer.
        val repo = StubRepository(Result.success(resultWithMatches()))
        var nowMs = 0L
        val store = appStore(repo, clock = { nowMs }, bypassThrottle = { true })

        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        nowMs = 1_000L // well inside the default throttle window
        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)
        nowMs = 2_000L
        dispatchAndAwait(store, SportsWidgetAction.FetchMatches)

        assertEquals(3, repo.fetchCount)
    }

    @Test
    fun `fetch dedup GIVEN bypassThrottle is true THEN in-flight guard still blocks concurrent dispatch`() = runTest {
        // The bypass turns off rate-limiting, not the dedup; we never want two
        // concurrent network calls hitting the same endpoint even in debug mode.
        val repo = GatedStubRepository(Result.success(resultWithMatches()))
        val store = appStore(repo, bypassThrottle = { true })

        store.dispatch(SportsWidgetAction.FetchMatches)
        testScheduler.runCurrent()
        store.dispatch(SportsWidgetAction.FetchMatches)
        testScheduler.runCurrent()

        assertEquals(1, repo.fetchCount)

        repo.gate.complete(Unit)
        testScheduler.advanceUntilIdle()
        assertEquals(1, repo.fetchCount)
    }

    @Test
    fun `fetch dedup GIVEN a fetch is in flight THEN a concurrent dispatch is dropped`() = runTest {
        val repo = GatedStubRepository(Result.success(resultWithMatches()))
        // Use distinct clock values so the throttle alone would let the second dispatch
        // through — leaving the in-flight guard as the only thing that can stop it.
        var nowMs = 0L
        val store = appStore(repo, clock = { nowMs })

        store.dispatch(SportsWidgetAction.FetchMatches)
        testScheduler.runCurrent()
        assertEquals(1, repo.fetchCount)

        nowMs = 120_000L // well past the throttle window
        store.dispatch(SportsWidgetAction.FetchMatches)
        testScheduler.runCurrent()
        assertEquals(1, repo.fetchCount)

        repo.gate.complete(Unit)
        testScheduler.advanceUntilIdle()
        assertEquals(1, repo.fetchCount)
    }

    // endregion

    // region helpers

    private val teamA = SportsTeam("MEX", 1L, "Mexico", "MEX", null, null, false)
    private val teamB = SportsTeam("RSA", 2L, "South Africa", "RSA", null, null, false)

    private fun match(
        id: Long,
        day: Int,
        stage: TournamentRound,
        status: MatchStatus,
        month: Int = 6,
        homeTeam: SportsTeam? = teamA,
        awayTeam: SportsTeam? = teamB,
    ): SportsMatch = SportsMatch(
        globalEventId = id,
        date = ZonedDateTime.of(2026, month, day, 14, 0, 0, 0, zone),
        homeTeam = homeTeam,
        awayTeam = awayTeam,
        matchStatus = status,
        homeScore = null,
        awayScore = null,
        homeExtra = null,
        awayExtra = null,
        homePenalty = null,
        awayPenalty = null,
        clock = null,
        period = null,
        updated = null,
        venue = null,
        stage = stage,
    )

    private fun resultWithMatches(): TeamMatchesResult {
        val mex = SportsTeam("MEX", 1L, "Mexico", "MEX", null, null, false)
        val rsa = SportsTeam("RSA", 2L, "South Africa", "RSA", null, null, false)
        val match = SportsMatch(
            globalEventId = 1L,
            date = ZonedDateTime.of(2026, 6, 11, 14, 0, 0, 0, zone),
            homeTeam = mex,
            awayTeam = rsa,
            matchStatus = MatchStatus.Scheduled,
            homeScore = null,
            awayScore = null,
            homeExtra = null,
            awayExtra = null,
            homePenalty = null,
            awayPenalty = null,
            clock = null,
            period = null,
            updated = null,
            venue = null,
            stage = TournamentRound.GROUP_STAGE,
        )
        return TeamMatchesResult(previous = emptyList(), current = emptyList(), next = listOf(match))
    }

    private fun TestScope.appStore(
        repo: SportsRepository,
        sportsWidgetState: SportsWidgetState = SportsWidgetState(),
        connectivityManager: ConnectivityManager = onlineConnectivityManager(),
        clock: () -> Long = { 0L },
        fetchMinIntervalSeconds: Int = 60,
        bypassThrottle: () -> Boolean = { false },
    ): AppStore {
        val middleware = SportsWidgetMiddleware(
            sportsRepository = repo,
            connectivityManager = connectivityManager,
            coroutineScope = CoroutineScope(UnconfinedTestDispatcher(testScheduler)),
            clock = clock,
            fetchMinIntervalSeconds = fetchMinIntervalSeconds,
            bypassThrottle = bypassThrottle,
        )
        return AppStore(
            initialState = AppState(sportsWidgetState = sportsWidgetState),
            middlewares = listOf(middleware),
        )
    }

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

    private fun TestScope.dispatchAndAwait(store: AppStore, action: SportsWidgetAction) {
        store.dispatch(action)
        // Drain the middleware's launched coroutine before assertions.
        testScheduler.advanceUntilIdle()
    }

    private class StubRepository(private val response: Result<TeamMatchesResult>) : SportsRepository {
        var fetchCount: Int = 0
            private set

        override suspend fun fetchMatches(): Result<TeamMatchesResult> {
            fetchCount += 1
            return response
        }
    }

    // Lets the test pause a fetch mid-flight via [gate] so a second dispatch can race
    // it; required to observe the in-flight dedup guard in [SportsWidgetMiddleware.fetchAndBuild]
    // (the default test dispatcher otherwise runs each launched coroutine to completion
    // before control returns to the test).
    private class GatedStubRepository(
        private val response: Result<TeamMatchesResult>,
    ) : SportsRepository {
        var fetchCount: Int = 0
            private set
        val gate: kotlinx.coroutines.CompletableDeferred<Unit> = kotlinx.coroutines.CompletableDeferred()

        override suspend fun fetchMatches(): Result<TeamMatchesResult> {
            fetchCount += 1
            gate.await()
            return response
        }
    }
}
