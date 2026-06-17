/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.home.sports.Match
import org.mozilla.fenix.home.sports.MatchCard
import org.mozilla.fenix.home.sports.MatchStatus
import org.mozilla.fenix.home.sports.SportCardErrorState
import org.mozilla.fenix.home.sports.SportsCardType
import org.mozilla.fenix.home.sports.Team
import org.mozilla.fenix.home.sports.fake.FakeMatchCardScenario

class SportsWidgetTest {

    // --- Phase 2 (isOneWeekToWorldCup) error suppression ---

    @Test
    fun `GIVEN phase 2 and cached matches WHEN error is set THEN error is suppressed and pager keeps cached schedule`() {
        val cached = FakeMatchCardScenario.Scheduled.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = true,
            isFollowTeamsCardShown = true,
            matchCardStates = cached,
            errorState = SportCardErrorState.ConnectionInterrupted,
        )

        // Promo page + the cached match cards; the error must not surface.
        assertEquals(cached.size + 1, result.pages.size)
        assertTrue(result.errorPageIndices.isEmpty())
    }

    @Test
    fun `GIVEN phase 2 and cached matches WHEN error is set with LoadFailed THEN error is suppressed`() {
        val cached = FakeMatchCardScenario.Scheduled.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = true,
            isFollowTeamsCardShown = true,
            matchCardStates = cached,
            errorState = SportCardErrorState.LoadFailed,
        )

        assertTrue(result.errorPageIndices.isEmpty())
        assertEquals(cached.size + 1, result.pages.size)
    }

    @Test
    fun `GIVEN phase 2 and empty cache WHEN error is set THEN pager collapses to a single error card`() {
        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = true,
            isFollowTeamsCardShown = true,
            matchCardStates = emptyList(),
            errorState = SportCardErrorState.ConnectionInterrupted,
        )

        assertEquals(setOf(0), result.errorPageIndices)
        assertEquals(1, result.pages.size)
    }

    // --- Regression guards for the unchanged paths ---

    @Test
    fun `GIVEN world cup started with cached matches and no live match WHEN error is set THEN pager still collapses`() {
        // hasWorldCupStarted == true is modelled by isOneWeekToWorldCup == false in the
        // sportsCardPages signature; the phase 2 short-circuit must not fire here.
        val cached = FakeMatchCardScenario.Scheduled.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = cached,
            errorState = SportCardErrorState.LoadFailed,
        )

        assertEquals(setOf(0), result.errorPageIndices)
        assertEquals(1, result.pages.size)
    }

    @Test
    fun `GIVEN world cup started with a live match WHEN error is set THEN pager keeps match cards for in-line swap`() {
        val live = FakeMatchCardScenario.Live.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = live,
            errorState = SportCardErrorState.LoadFailed,
        )

        // No collapse — the live MatchCard handles the in-line error swap and the
        // surrounding pages keep their normal content.
        assertTrue(result.errorPageIndices.isEmpty())
        assertEquals(live.size, result.pages.size)
    }

    @Test
    fun `GIVEN phase 2 with cached matches WHEN no error THEN pager renders promo plus match cards normally`() {
        val cached = FakeMatchCardScenario.Scheduled.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = true,
            isFollowTeamsCardShown = true,
            matchCardStates = cached,
            errorState = null,
        )

        assertTrue(result.errorPageIndices.isEmpty())
        assertEquals(cached.size + 1, result.pages.size)
    }

    // --- "Keep tabs on the World Cup" promo suppression when a champions card is present ---

    @Test
    fun `GIVEN follow-team promo eligible and a champions card present THEN the keep-tabs promo is suppressed`() {
        val champions = FakeMatchCardScenario.SingleChampionCard.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = true,
            matchCardStates = champions,
            errorState = null,
        )

        assertTrue(result.pages.none { it.type == SportsCardType.FOLLOW_TEAM_PROMO })
        // Only the champions card(s) remain; no leading promo page is prepended.
        assertEquals(champions.size, result.pages.size)
        assertTrue(result.championsPageIndices.isNotEmpty())
    }

    @Test
    fun `GIVEN follow-team promo eligible and no champions card THEN the keep-tabs promo is shown`() {
        val scheduled = FakeMatchCardScenario.Scheduled.build()

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = true,
            matchCardStates = scheduled,
            errorState = null,
        )

        assertTrue(result.pages.any { it.type == SportsCardType.FOLLOW_TEAM_PROMO })
        assertEquals(scheduled.size + 1, result.pages.size)
    }

    // --- initialPage: the page the pager opens on (live -> next upcoming -> last) ---

    @Test
    fun `GIVEN a live card THEN initialPage is the live card`() {
        val cards = listOf(
            card(1L, MatchStatus.Final),
            card(2L, MatchStatus.Live(period = "2", clock = "60")),
            card(3L, MatchStatus.Scheduled),
        )

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = cards,
            errorState = null,
        )

        assertEquals(1, result.initialPage)
    }

    @Test
    fun `GIVEN no live card THEN initialPage is the first upcoming card`() {
        val cards = listOf(
            card(1L, MatchStatus.Final),
            card(2L, MatchStatus.Scheduled),
            card(3L, MatchStatus.Scheduled),
        )

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = cards,
            errorState = null,
        )

        assertEquals(1, result.initialPage)
    }

    @Test
    fun `GIVEN only past cards THEN initialPage is the last card`() {
        val cards = listOf(
            card(1L, MatchStatus.Final),
            card(2L, MatchStatus.Final),
        )

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = cards,
            errorState = null,
        )

        assertEquals(1, result.initialPage)
    }

    @Test
    fun `GIVEN a leading promo page THEN initialPage accounts for the promo offset`() {
        val cards = listOf(
            card(1L, MatchStatus.Final),
            card(2L, MatchStatus.Live(period = "2", clock = "60")),
            card(3L, MatchStatus.Scheduled),
        )

        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = true, // prepends a FOLLOW_TEAM_PROMO page
            matchCardStates = cards,
            errorState = null,
        )

        assertEquals(SportsCardType.FOLLOW_TEAM_PROMO, result.pages.first().type)
        // The live card sits at match index 1, shifted to page 2 by the leading promo page.
        assertEquals(2, result.initialPage)
    }

    // --- page keys: card identity the pager uses to restore position across rebuilds ---

    @Test
    fun `GIVEN match cards THEN each page key is derived from its match ids`() {
        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = listOf(
                card(10L, MatchStatus.Live(period = "1", clock = "5")),
                card(20L, MatchStatus.Scheduled),
            ),
            errorState = null,
        )

        assertEquals(listOf("match:10", "match:20"), result.pages.map { it.key })
    }

    @Test
    fun `GIVEN a promo page precedes match cards THEN the promo key is type-based`() {
        val result = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = true, // prepends a FOLLOW_TEAM_PROMO page
            matchCardStates = listOf(card(10L, MatchStatus.Scheduled)),
            errorState = null,
        )

        assertEquals("type:FOLLOW_TEAM_PROMO", result.pages.first().key)
        assertEquals("match:10", result.pages.last().key)
    }

    @Test
    fun `GIVEN the featured and related matches swap THEN the card key stays stable`() {
        // A group/day card's featured match changes as live status changes across refreshes, but
        // its membership does not. The key must stay stable so the user is not re-landed.
        val live = matchOf(1L, MatchStatus.Live(period = "1", clock = "5"))
        val scheduled = matchOf(2L, MatchStatus.Scheduled)

        val featuredLive = MatchCard(matches = listOf(live), relatedMatches = listOf(scheduled))
        val featuredScheduled = MatchCard(matches = listOf(scheduled), relatedMatches = listOf(live))

        val keyBefore = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = listOf(featuredLive),
            errorState = null,
        ).pages.single().key
        val keyAfter = invokeSportsCardPages(
            isOneWeekToWorldCup = false,
            isFollowTeamsCardShown = false,
            matchCardStates = listOf(featuredScheduled),
            errorState = null,
        ).pages.single().key

        assertEquals(keyBefore, keyAfter)
        assertEquals("match:1,2", keyBefore)
    }

    private fun matchOf(id: Long, status: MatchStatus): Match = Match(
        globalEventId = id,
        date = "Jun 13",
        time = "5:00 PM",
        home = Team(key = "MEX", flagResId = 0),
        away = Team(key = "RSA", flagResId = 0),
        matchStatus = status,
    )

    private fun card(id: Long, status: MatchStatus): MatchCard =
        MatchCard(matches = listOf(matchOf(id, status)), relatedMatches = emptyList())

    private fun invokeSportsCardPages(
        isOneWeekToWorldCup: Boolean,
        isFollowTeamsCardShown: Boolean,
        matchCardStates: List<MatchCard>,
        errorState: SportCardErrorState?,
        selectedTeam: Team? = null,
    ): SportsCardPagesResult = sportsCardPages(
        isOneWeekToWorldCup = isOneWeekToWorldCup,
        isFollowTeamsCardShown = isFollowTeamsCardShown,
        selectedTeam = selectedTeam,
        matchCardStates = matchCardStates,
        errorState = errorState,
        onFollowTeam = {},
        onGetCustomWallpaper = {},
        onShare = {},
        onRemove = {},
        onRefresh = {},
        onMatchClicked = { _, _, _ -> },
    )
}
