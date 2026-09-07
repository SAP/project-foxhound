/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * API response for GET /api/v1/worldcup/matches without a `teams` filter.
 */
@Serializable
data class MatchesResponseDto(
    val data: List<EventInfoDto> = emptyList(),
)

/**
 * API response for GET /api/v1/worldcup/matches with a `teams` filter.
 */
@Serializable
data class TeamMatchesResponseDto(
    val previous: List<EventInfoDto> = emptyList(),
    val current: List<EventInfoDto> = emptyList(),
    val next: List<EventInfoDto> = emptyList(),
)

/**
 * A single sports event returned by the API.
 */
@Serializable
data class EventInfoDto(
    val date: String = "",
    @SerialName("global_event_id") val globalEventId: Long = 0L,
    @SerialName("home_team") val homeTeam: TeamInfoDto? = null,
    @SerialName("away_team") val awayTeam: TeamInfoDto? = null,
    val period: String? = null,
    @SerialName("home_score") val homeScore: Int? = null,
    @SerialName("away_score") val awayScore: Int? = null,
    @SerialName("home_extra") val homeExtra: Int? = null,
    @SerialName("away_extra") val awayExtra: Int? = null,
    @SerialName("home_penalty") val homePenalty: Int? = null,
    @SerialName("away_penalty") val awayPenalty: Int? = null,
    val clock: String? = null,
    val updated: Int? = null,
    val status: String = "",
    @SerialName("status_type") val statusType: String = "",
    val venue: String? = null,
    val query: String? = null,
    val sport: String? = null,
    val stage: String = "group_stage",
)

/**
 * Team information returned inside an [EventInfoDto].
 */
@Serializable
data class TeamInfoDto(
    val key: String = "",
    @SerialName("global_team_id") val globalTeamId: Long = 0L,
    val name: String = "",
    val region: String = "",
    @SerialName("icon_url") val iconUrl: String? = null,
    val group: String? = null,
    val eliminated: Boolean = false,
)
