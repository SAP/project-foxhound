/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import org.mozilla.fenix.home.sports.api.EventInfoDto
import org.mozilla.fenix.home.sports.api.MatchesResponseDto
import org.mozilla.fenix.home.sports.api.TeamInfoDto
import org.mozilla.fenix.home.sports.api.TeamMatchesResponseDto
import org.mozilla.fenix.home.sports.util.apiKeyToFifa
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * Maps API response DTOs into [SportsMatch] / [SportsTeam] domain models.
 *
 * Status bucketing uses `status_type` only ("scheduled", "live", "past"). Provider-level
 * detail statuses (Suspended, Awarded, etc.) are intentionally collapsed: anything
 * in-progress or interrupted maps to [MatchStatus.Live]; anything decided maps to
 * [MatchStatus.Final] or [MatchStatus.FinalAfterPenalties]. The one detail status that
 * survives is `Break`, which surfaces as halftime on the live status.
 *
 * UTC date strings are converted to [zoneId] (defaults to the device's local zone).
 *
 * @param zoneId Target timezone for date conversion.
 */
class MatchesResponseMapper(
    private val zoneId: ZoneId = ZoneId.systemDefault(),
) {

    /**
     * Maps the flat event list returned when no team filter is applied.
     */
    fun mapAllMatches(response: MatchesResponseDto): List<SportsMatch> =
        response.data.map { mapEvent(it) }

    /**
     * Maps the bucketed response returned when a team filter is applied.
     */
    fun mapTeamMatches(response: TeamMatchesResponseDto): TeamMatchesResult = TeamMatchesResult(
        previous = response.previous.map { mapEvent(it) },
        current = response.current.map { mapEvent(it) },
        next = response.next.map { mapEvent(it) },
    )

    private fun mapEvent(dto: EventInfoDto) = SportsMatch(
        globalEventId = dto.globalEventId,
        date = parseDate(dto.date),
        homeTeam = mapTeam(dto.homeTeam),
        awayTeam = mapTeam(dto.awayTeam),
        matchStatus = mapMatchStatus(dto),
        homeScore = dto.homeScore,
        awayScore = dto.awayScore,
        homeExtra = dto.homeExtra,
        awayExtra = dto.awayExtra,
        homePenalty = dto.homePenalty,
        awayPenalty = dto.awayPenalty,
        clock = dto.clock,
        period = dto.period,
        updated = dto.updated,
        venue = dto.venue,
        stage = mapStage(dto.stage),
    )

    // Unscheduled teams arrive either as an explicit null or as a blank placeholder.
    // Map both to null so the card builder and UI can render an empty team slot.
    //
    // The feed uses ISO 3166-1 alpha-3; normalize to the
    // FIFA codes that the rest of the app keys teams by, so downstream filtering
    // and lookups have a single identity to work against.
    private fun mapTeam(dto: TeamInfoDto?): SportsTeam? {
        if (dto == null) return null
        // The team object exists but has no numeric team ID and no team key string. There's nothing to key on, so it's
        //  treated the same as a missing team and mapped to null,
        //  letting the UI render an empty slot rather than a fake team with name = "", region = "", etc.
        if (dto.globalTeamId == 0L && dto.key.isBlank()) return null
        return SportsTeam(
            key = apiKeyToFifa[dto.key] ?: dto.key,
            globalTeamId = dto.globalTeamId,
            name = dto.name,
            region = dto.region,
            iconUrl = dto.iconUrl,
            group = dto.group,
            eliminated = dto.eliminated,
        )
    }

    private fun parseDate(utcDate: String): ZonedDateTime = try {
        ZonedDateTime.parse(utcDate, DateTimeFormatter.ISO_DATE_TIME)
            .withZoneSameInstant(zoneId)
    } catch (e: DateTimeParseException) {
        ZonedDateTime.now(zoneId)
    }

    private fun mapMatchStatus(dto: EventInfoDto): MatchStatus = when (dto.statusType) {
        STATUS_TYPE_SCHEDULED -> MatchStatus.Scheduled
        STATUS_TYPE_LIVE -> mapLiveStatus(dto)
        STATUS_TYPE_PAST -> mapPastStatus(dto)
        else -> MatchStatus.Unknown
    }

    private fun mapLiveStatus(dto: EventInfoDto): MatchStatus =
        if (dto.isPenaltyShootout()) {
            MatchStatus.Penalties(homePenalty = dto.homePenalty, awayPenalty = dto.awayPenalty)
        } else {
            MatchStatus.Live(
                period = dto.period.orEmpty(),
                clock = dto.clock,
                isHalftime = dto.status.equals(STATUS_HALFTIME, ignoreCase = true),
            )
        }

    // Past matches: a penalty-shootout finish surfaces the shootout score; "FT" (regulation)
    // and "AET" (after extra time) both end without a shootout and collapse to Final.
    private fun mapPastStatus(dto: EventInfoDto): MatchStatus =
        if (dto.isPenaltyShootout()) {
            MatchStatus.FinalAfterPenalties(
                homePenalty = dto.homePenalty,
                awayPenalty = dto.awayPenalty,
            )
        } else {
            MatchStatus.Final
        }

    // A penalty shootout shows up two ways in the feed: while live the period is "PEN"
    // (documented as "PenaltyShootout"), but once the match is final the period flips back to
    // "FT" and the shootout survives only in the penalty fields. So detect either a penalty
    // period (matched exactly, case-insensitively — a substring match would wrongly catch
    // "Suspended") or populated penalty scores; the feed only fills those on a shootout. Per
    // the upstream guidance, never infer penalties from the regulation scores being level.
    private fun EventInfoDto.isPenaltyShootout(): Boolean =
        period?.lowercase() in PENALTY_SHOOTOUT_PERIODS ||
            homePenalty != null ||
            awayPenalty != null

    private fun mapStage(stage: String): TournamentRound {
        val normalized = stage.lowercase().filter { it.isLetterOrDigit() }
        return when (normalized) {
            "groupstage" -> TournamentRound.GROUP_STAGE
            "roundof32" -> TournamentRound.ROUND_OF_32
            "roundof16" -> TournamentRound.ROUND_OF_16
            "quarterfinal", "quarterfinals" -> TournamentRound.QUARTER_FINAL
            "semifinal", "semifinals" -> TournamentRound.SEMI_FINAL
            "final" -> TournamentRound.FINAL
            "3rdplace", "thirdplace", "3rdplaceplayoff", "thirdplaceplayoff",
            -> TournamentRound.THIRD_PLACE_PLAYOFF

            else -> TournamentRound.GROUP_STAGE
        }
    }

    private companion object {
        const val STATUS_TYPE_LIVE = "live"
        const val STATUS_TYPE_SCHEDULED = "scheduled"
        const val STATUS_TYPE_PAST = "past"
        const val STATUS_HALFTIME = "Break"

        val PENALTY_SHOOTOUT_PERIODS = setOf("pen", "penaltyshootout")
    }
}
