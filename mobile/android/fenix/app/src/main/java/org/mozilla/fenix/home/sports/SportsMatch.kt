/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import java.time.ZonedDateTime

/**
 * A participating team as returned by the API, before any client-side enrichment.
 *
 * @property key FIFA team identifier (e.g. "ENG"). Normalized from the feed's ISO 3166-1
 * alpha-3 codes at the mapper boundary so the rest of the app can key teams by a single
 * identity. See [org.mozilla.fenix.home.sports.util.apiKeyToFifa].
 * @property globalTeamId Unique numeric identifier for this team.
 * @property name Long display name (e.g. "England"). This is not localized.
 * @property region ISO3 region code.
 * @property iconUrl Optional URL for the team logo.
 * @property group Group name (e.g. "Group A"), null after the group stage.
 * @property eliminated True once the team is out of the tournament.
 */
data class SportsTeam(
    val key: String,
    val globalTeamId: Long,
    val name: String,
    val region: String,
    val iconUrl: String?,
    val group: String?,
    val eliminated: Boolean,
)

/**
 * A sports event mapped from the API, with the date converted to the device's local timezone.
 *
 * @property globalEventId Stable upstream identifier; the natural cache key.
 * @property date Match start time in the device's local timezone.
 * @property homeTeam Home [SportsTeam]. Null if the match has not been scheduled.
 * @property awayTeam Away [SportsTeam]. Null if the match has not been scheduled.
 * @property matchStatus Current [MatchStatus].
 * @property homeScore Home team score, or null if the match has not started.
 * @property awayScore Away team score, or null if the match has not started.
 * @property homeExtra Home team extra-time score, or null if no extra time was played.
 * @property awayExtra Away team extra-time score, or null if no extra time was played.
 * @property homePenalty Home team penalty shootout score, or null if no shootout occurred.
 * @property awayPenalty Away team penalty shootout score, or null if no shootout occurred.
 * @property clock Minutes of elapsed play time, e.g. "42" or "90+3".
 * @property period Period description string ("1", "2", "Extra", "Penalty", etc.).
 * @property updated Unix timestamp when this event record was last updated by the API.
 * @property venue Venue name for the match.
 * @property stage Tournament round this match belongs to.
 */
data class SportsMatch(
    val globalEventId: Long,
    val date: ZonedDateTime,
    val homeTeam: SportsTeam?,
    val awayTeam: SportsTeam?,
    val matchStatus: MatchStatus,
    val homeScore: Int?,
    val awayScore: Int?,
    val homeExtra: Int?,
    val awayExtra: Int?,
    val homePenalty: Int?,
    val awayPenalty: Int?,
    val clock: String?,
    val period: String?,
    val updated: Int?,
    val venue: String?,
    val stage: TournamentRound,
)

/**
 * Structured result from a team-filtered matches request.
 *
 * @property previous Past matches for the followed team(s).
 * @property current Live or in-progress matches for the followed team(s).
 * @property next Upcoming matches for the followed team(s).
 */
data class TeamMatchesResult(
    val previous: List<SportsMatch>,
    val current: List<SportsMatch>,
    val next: List<SportsMatch>,
)
