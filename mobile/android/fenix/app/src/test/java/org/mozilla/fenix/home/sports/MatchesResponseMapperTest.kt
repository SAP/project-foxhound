/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.home.sports.api.EventInfoDto
import org.mozilla.fenix.home.sports.api.MatchesResponseDto
import org.mozilla.fenix.home.sports.api.TeamInfoDto
import org.mozilla.fenix.home.sports.api.TeamMatchesResponseDto
import java.time.ZoneId
import java.time.ZonedDateTime

class MatchesResponseMapperTest {

    private val fixedZone = ZoneId.of("America/New_York")
    private lateinit var mapper: MatchesResponseMapper

    @Before
    fun setup() {
        mapper = MatchesResponseMapper(zoneId = fixedZone)
    }

    // region mapAllMatches

    @Test
    fun `GIVEN an empty data array WHEN mapAllMatches THEN returns an empty list`() {
        val result = mapper.mapAllMatches(MatchesResponseDto(data = emptyList()))
        assertTrue(result.isEmpty())
    }

    @Test
    fun `GIVEN a fully populated event WHEN mapAllMatches THEN all fields are mapped correctly`() {
        val dto = fullyPopulatedEvent()
        val result = mapper.mapAllMatches(MatchesResponseDto(data = listOf(dto)))

        assertEquals(1, result.size)
        with(result[0]) {
            assertEquals(42L, globalEventId)
            assertEquals("USA", homeTeam?.key)
            assertEquals("ENG", awayTeam?.key)
            assertEquals(1, homeScore)
            assertEquals(2, awayScore)
            assertEquals(0, homeExtra)
            assertEquals(1, awayExtra)
            assertEquals(5, homePenalty)
            assertEquals(3, awayPenalty)
            assertEquals("45", clock)
            assertEquals("2", period)
            assertEquals(1700000000, updated)
            assertEquals("SoFi Stadium", venue)
        }
    }

    @Test
    fun `GIVEN an event with all nullable fields null WHEN mapAllMatches THEN nullable fields are null`() {
        val result = mapper.mapAllMatches(MatchesResponseDto(data = listOf(minimalEvent())))

        assertEquals(1, result.size)
        with(result[0]) {
            assertNull(homeScore)
            assertNull(awayScore)
            assertNull(homeExtra)
            assertNull(awayExtra)
            assertNull(homePenalty)
            assertNull(awayPenalty)
            assertNull(clock)
            assertNull(period)
            assertNull(updated)
            assertNull(venue)
        }
    }

    @Test
    fun `GIVEN multiple events WHEN mapAllMatches THEN preserves API order`() {
        val events = listOf(
            minimalEvent().copy(globalEventId = 1L),
            minimalEvent().copy(globalEventId = 2L),
            minimalEvent().copy(globalEventId = 3L),
        )
        val result = mapper.mapAllMatches(MatchesResponseDto(data = events))
        assertEquals(listOf(1L, 2L, 3L), result.map { it.globalEventId })
    }

    // endregion

    // region mapTeamMatches

    @Test
    fun `GIVEN all buckets populated WHEN mapTeamMatches THEN each bucket maps independently`() {
        val response = TeamMatchesResponseDto(
            previous = listOf(minimalEvent().copy(globalEventId = 1L)),
            current = listOf(minimalEvent().copy(globalEventId = 2L)),
            next = listOf(minimalEvent().copy(globalEventId = 3L)),
        )
        val result = mapper.mapTeamMatches(response)

        assertEquals(listOf(1L), result.previous.map { it.globalEventId })
        assertEquals(listOf(2L), result.current.map { it.globalEventId })
        assertEquals(listOf(3L), result.next.map { it.globalEventId })
    }

    @Test
    fun `GIVEN all buckets empty WHEN mapTeamMatches THEN all lists are empty`() {
        val result = mapper.mapTeamMatches(
            TeamMatchesResponseDto(previous = emptyList(), current = emptyList(), next = emptyList()),
        )
        assertTrue(result.previous.isEmpty())
        assertTrue(result.current.isEmpty())
        assertTrue(result.next.isEmpty())
    }

    @Test
    fun `GIVEN only previous is populated WHEN mapTeamMatches THEN current and next are empty`() {
        val response = TeamMatchesResponseDto(
            previous = listOf(minimalEvent().copy(globalEventId = 10L)),
            current = emptyList(),
            next = emptyList(),
        )
        val result = mapper.mapTeamMatches(response)

        assertEquals(1, result.previous.size)
        assertTrue(result.current.isEmpty())
        assertTrue(result.next.isEmpty())
    }

    // endregion

    // region Team mapping

    @Test
    fun `GIVEN a fully populated team WHEN mapped THEN all team fields are correct`() {
        val dto = minimalEvent().copy(
            homeTeam = TeamInfoDto(
                key = "USA",
                globalTeamId = 99L,
                name = "United States",
                region = "USA",
                iconUrl = "https://example.com/usa.png",
                group = "Group A",
                eliminated = true,
            ),
        )
        val team = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0].homeTeam!!

        assertEquals("USA", team.key)
        assertEquals(99L, team.globalTeamId)
        assertEquals("United States", team.name)
        assertEquals("USA", team.region)
        assertEquals("https://example.com/usa.png", team.iconUrl)
        assertEquals("Group A", team.group)
        assertEquals(true, team.eliminated)
    }

    @Test
    fun `GIVEN a team with an ISO3 key that has a FIFA alias WHEN mapped THEN key is normalized to FIFA`() {
        val dto = minimalEvent().copy(
            homeTeam = TeamInfoDto(key = "URY"),
            awayTeam = TeamInfoDto(key = "DEU"),
        )
        val match = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]
        assertEquals("URU", match.homeTeam?.key)
        assertEquals("GER", match.awayTeam?.key)
    }

    @Test
    fun `GIVEN a team with a CVI key WHEN mapped THEN key is normalized to FIFA`() {
        val dto = minimalEvent().copy(homeTeam = TeamInfoDto(key = "CVI"))
        val match = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]
        assertEquals("CPV", match.homeTeam?.key)
    }

    @Test
    fun `GIVEN a team key with no alias WHEN mapped THEN key is left untouched`() {
        val dto = minimalEvent().copy(homeTeam = TeamInfoDto(key = "ENG"))
        val match = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]
        assertEquals("ENG", match.homeTeam?.key)
    }

    @Test
    fun `GIVEN a team with null icon and group WHEN mapped THEN iconUrl and group are null`() {
        val dto = minimalEvent().copy(
            homeTeam = TeamInfoDto(key = "USA", iconUrl = null, group = null),
        )
        val team = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0].homeTeam

        assertNull(team?.iconUrl)
        assertNull(team?.group)
    }

    @Test
    fun `GIVEN a blank placeholder team WHEN mapped THEN the team is null`() {
        // Undetermined participant: the feed sends an empty team object.
        val dto = minimalEvent().copy(
            homeTeam = TeamInfoDto(),
            awayTeam = TeamInfoDto(key = "ENG", globalTeamId = 2L),
        )
        val match = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]

        assertNull(match.homeTeam)
        assertEquals("ENG", match.awayTeam?.key)
    }

    @Test
    fun `GIVEN a team with a key but no id WHEN mapped THEN the team is kept`() {
        val dto = minimalEvent().copy(homeTeam = TeamInfoDto(key = "USA", globalTeamId = 0L))
        val match = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]

        assertEquals("USA", match.homeTeam?.key)
    }

    // endregion

    // region Date conversion

    @Test
    fun `GIVEN a UTC date string WHEN mapped THEN date is converted to the target timezone`() {
        val dto = minimalEvent().copy(date = "2026-06-11T18:00:00Z")
        val result = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]

        val expected = ZonedDateTime.parse("2026-06-11T14:00:00-04:00[America/New_York]")
        assertEquals(expected.toInstant(), result.date.toInstant())
        assertEquals(fixedZone, result.date.zone)
    }

    @Test
    fun `GIVEN a malformed date string WHEN mapped THEN falls back without throwing`() {
        val dto = minimalEvent().copy(date = "not-a-date")
        val beforeCall = ZonedDateTime.now(fixedZone)
        val result = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]
        val afterCall = ZonedDateTime.now(fixedZone)

        assertTrue(!result.date.isBefore(beforeCall) || !result.date.isAfter(afterCall))
        assertEquals(fixedZone, result.date.zone)
    }

    @Test
    fun `GIVEN an empty date string WHEN mapped THEN falls back without throwing`() {
        val dto = minimalEvent().copy(date = "")
        val result = mapper.mapAllMatches(MatchesResponseDto(listOf(dto)))[0]
        assertEquals(fixedZone, result.date.zone)
    }

    // endregion

    // region MatchStatus — scheduled

    @Test
    fun `GIVEN status_type scheduled WHEN mapped THEN MatchStatus is Scheduled`() {
        assertStatus(statusType = "scheduled", expected = MatchStatus.Scheduled)
    }

    // endregion

    // region MatchStatus — live

    @Test
    fun `GIVEN status_type live and a regular period WHEN mapped THEN MatchStatus is Live`() {
        val dto = minimalEvent().copy(statusType = "live", period = "1", clock = "37")
        assertEquals(MatchStatus.Live(period = "1", clock = "37"), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and null period and clock WHEN mapped THEN Live has empty period and null clock`() {
        val dto = minimalEvent().copy(statusType = "live", period = null, clock = null)
        assertEquals(MatchStatus.Live(period = "", clock = null), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and status Break WHEN mapped THEN Live is halftime`() {
        val dto = minimalEvent().copy(statusType = "live", status = "Break", period = "1", clock = null)
        assertEquals(
            MatchStatus.Live(period = "1", clock = null, isHalftime = true),
            mapSingle(dto).matchStatus,
        )
    }

    @Test
    fun `GIVEN status_type live and Suspended WHEN mapped THEN MatchStatus is Live (collapsed)`() {
        val dto = minimalEvent().copy(statusType = "live", period = "Suspended", clock = "78")
        assertEquals(MatchStatus.Live(period = "Suspended", clock = "78"), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and period PEN WHEN mapped THEN MatchStatus is Penalties`() {
        val dto = minimalEvent().copy(
            statusType = "live",
            period = "PEN",
            homePenalty = 3,
            awayPenalty = 2,
        )
        assertEquals(MatchStatus.Penalties(homePenalty = 3, awayPenalty = 2), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and period PEN with null penalty scores WHEN mapped THEN Penalties preserves nulls`() {
        val dto = minimalEvent().copy(
            statusType = "live",
            period = "PEN",
            homePenalty = null,
            awayPenalty = null,
        )
        assertEquals(MatchStatus.Penalties(homePenalty = null, awayPenalty = null), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and period PenaltyShootout WHEN mapped THEN MatchStatus is Penalties`() {
        // The documented spelling; matched case-insensitively alongside the "PEN" abbreviation.
        val dto = minimalEvent().copy(
            statusType = "live",
            period = "PenaltyShootout",
            homePenalty = 1,
            awayPenalty = 0,
        )
        assertEquals(MatchStatus.Penalties(homePenalty = 1, awayPenalty = 0), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and period ET WHEN mapped THEN MatchStatus is Live with ET period`() {
        val dto = minimalEvent().copy(statusType = "live", period = "ET", clock = "90+15")
        assertEquals(MatchStatus.Live(period = "ET", clock = "90+15"), mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type live and period HT WHEN mapped THEN MatchStatus is Live with HT period`() {
        val dto = minimalEvent().copy(statusType = "live", period = "HT", clock = "45")
        assertEquals(MatchStatus.Live(period = "HT", clock = "45"), mapSingle(dto).matchStatus)
    }

    // endregion

    // region MatchStatus — past

    @Test
    fun `GIVEN status_type past and period FT WHEN mapped THEN MatchStatus is Final`() {
        val dto = minimalEvent().copy(statusType = "past", period = "FT")
        assertEquals(MatchStatus.Final, mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type past and period AET WHEN mapped THEN MatchStatus is Final`() {
        // After Extra Time still ended without a shootout, so the result is Final.
        val dto = minimalEvent().copy(statusType = "past", period = "AET")
        assertEquals(MatchStatus.Final, mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type past and period PEN WHEN mapped THEN MatchStatus is FinalAfterPenalties`() {
        val dto = minimalEvent().copy(
            statusType = "past",
            period = "PEN",
            homePenalty = 5,
            awayPenalty = 3,
        )
        assertEquals(
            MatchStatus.FinalAfterPenalties(homePenalty = 5, awayPenalty = 3),
            mapSingle(dto).matchStatus,
        )
    }

    @Test
    fun `GIVEN past period PEN with one-sided penalty WHEN mapped THEN FinalAfterPenalties keeps nulls`() {
        val dto = minimalEvent().copy(
            statusType = "past",
            period = "PEN",
            homePenalty = 4,
            awayPenalty = null,
        )
        assertEquals(
            MatchStatus.FinalAfterPenalties(homePenalty = 4, awayPenalty = null),
            mapSingle(dto).matchStatus,
        )
    }

    @Test
    fun `GIVEN a completed shootout with period FT and penalty scores WHEN mapped THEN FinalAfterPenalties`() {
        // Real feed shape for a finished penalty match: the period flips back to "FT" once the
        // game is final, so the shootout is only recoverable from the penalty fields.
        val dto = minimalEvent().copy(
            statusType = "past",
            period = "FT",
            homeScore = 2,
            awayScore = 2,
            homePenalty = 5,
            awayPenalty = 6,
        )
        assertEquals(
            MatchStatus.FinalAfterPenalties(homePenalty = 5, awayPenalty = 6),
            mapSingle(dto).matchStatus,
        )
    }

    @Test
    fun `GIVEN status_type past and empty period WHEN mapped THEN MatchStatus is Final`() {
        // Defensive: when period is missing on a past match, fall back to Final.
        assertStatus(statusType = "past", expected = MatchStatus.Final)
    }

    @Test
    fun `GIVEN status_type past and Awarded match WHEN mapped THEN MatchStatus is Final (decided match)`() {
        // Awarded is a provider-level detail; status_type=past collapses it to Final
        val dto = minimalEvent().copy(statusType = "past", status = "Awarded", homePenalty = null, awayPenalty = null)
        assertEquals(MatchStatus.Final, mapSingle(dto).matchStatus)
    }

    @Test
    fun `GIVEN status_type past and Canceled match WHEN mapped THEN MatchStatus is Final (collapsed)`() {
        val dto = minimalEvent().copy(statusType = "past", status = "Canceled", homePenalty = null, awayPenalty = null)
        assertEquals(MatchStatus.Final, mapSingle(dto).matchStatus)
    }

    // endregion

    // region MatchStatus — unknown

    @Test
    fun `GIVEN status_type unknown WHEN mapped THEN MatchStatus is Unknown`() {
        assertStatus(statusType = "unknown", expected = MatchStatus.Unknown)
    }

    @Test
    fun `GIVEN empty status_type WHEN mapped THEN MatchStatus is Unknown`() {
        assertStatus(statusType = "", expected = MatchStatus.Unknown)
    }

    @Test
    fun `GIVEN unrecognized status_type WHEN mapped THEN MatchStatus is Unknown`() {
        assertStatus(statusType = "foobar", expected = MatchStatus.Unknown)
    }

    // endregion

    // region stage

    @Test
    fun `GIVEN stage group_stage WHEN mapped THEN stage is GROUP_STAGE`() {
        assertStage("group_stage", TournamentRound.GROUP_STAGE)
    }

    @Test
    fun `GIVEN stage round_of_32 WHEN mapped THEN stage is ROUND_OF_32`() {
        assertStage("round_of_32", TournamentRound.ROUND_OF_32)
    }

    @Test
    fun `GIVEN stage round_of_16 WHEN mapped THEN stage is ROUND_OF_16`() {
        assertStage("round_of_16", TournamentRound.ROUND_OF_16)
    }

    @Test
    fun `GIVEN stage quarter_final WHEN mapped THEN stage is QUARTER_FINAL`() {
        assertStage("quarter_final", TournamentRound.QUARTER_FINAL)
    }

    @Test
    fun `GIVEN stage semi_final WHEN mapped THEN stage is SEMI_FINAL`() {
        assertStage("semi_final", TournamentRound.SEMI_FINAL)
    }

    @Test
    fun `GIVEN stage final WHEN mapped THEN stage is FINAL`() {
        assertStage("final", TournamentRound.FINAL)
    }

    @Test
    fun `GIVEN stage third_place_playoff WHEN mapped THEN stage is THIRD_PLACE_PLAYOFF`() {
        assertStage("third_place_playoff", TournamentRound.THIRD_PLACE_PLAYOFF)
    }

    @Test
    fun `GIVEN unrecognized stage WHEN mapped THEN stage defaults to GROUP_STAGE`() {
        assertStage("not_a_real_stage", TournamentRound.GROUP_STAGE)
    }

    @Test
    fun `GIVEN missing stage WHEN mapped THEN stage defaults to GROUP_STAGE`() {
        // DTO default kicks in when the JSON doesn't include "stage".
        assertEquals(TournamentRound.GROUP_STAGE, mapSingle(minimalEvent()).stage)
    }

    @Test
    fun `GIVEN canonical API stage strings WHEN mapped THEN parsed to the correct TournamentRound`() {
        // Exact values the server emits per the spec.
        assertStage("Group Stage", TournamentRound.GROUP_STAGE)
        assertStage("Round of 32", TournamentRound.ROUND_OF_32)
        assertStage("Round of 16", TournamentRound.ROUND_OF_16)
        assertStage("Quarter-Finals", TournamentRound.QUARTER_FINAL)
        assertStage("Semi-Finals", TournamentRound.SEMI_FINAL)
        assertStage("3rd Place", TournamentRound.THIRD_PLACE_PLAYOFF)
        assertStage("Final", TournamentRound.FINAL)
    }

    // endregion

    // region helpers

    private fun mapSingle(dto: EventInfoDto): SportsMatch =
        mapper.mapAllMatches(MatchesResponseDto(data = listOf(dto))).first()

    private fun assertStatus(statusType: String, expected: MatchStatus) {
        val dto = minimalEvent().copy(statusType = statusType)
        assertEquals(expected, mapSingle(dto).matchStatus)
    }

    private fun assertStage(stage: String, expected: TournamentRound) {
        val dto = minimalEvent().copy(stage = stage)
        assertEquals(expected, mapSingle(dto).stage)
    }

    private fun minimalEvent() = EventInfoDto(
        globalEventId = 1L,
        date = "2026-06-11T18:00:00Z",
        homeTeam = TeamInfoDto(key = "USA"),
        awayTeam = TeamInfoDto(key = "ENG"),
        statusType = "scheduled",
        status = "Scheduled",
    )

    private fun fullyPopulatedEvent() = EventInfoDto(
        globalEventId = 42L,
        date = "2026-07-19T20:00:00Z",
        homeTeam = TeamInfoDto(
            key = "USA",
            globalTeamId = 1L,
            name = "United States",
            region = "USA",
            iconUrl = "https://example.com/usa.png",
            group = "Group A",
            eliminated = false,
        ),
        awayTeam = TeamInfoDto(
            key = "ENG",
            globalTeamId = 2L,
            name = "England",
            region = "ENG",
            iconUrl = null,
            group = "Group A",
            eliminated = true,
        ),
        period = "2",
        homeScore = 1,
        awayScore = 2,
        homeExtra = 0,
        awayExtra = 1,
        homePenalty = 5,
        awayPenalty = 3,
        clock = "45",
        updated = 1700000000,
        status = "InProgress",
        statusType = "live",
        venue = "SoFi Stadium",
        query = "USA,ENG",
        sport = "soccer",
    )

    // endregion
}
