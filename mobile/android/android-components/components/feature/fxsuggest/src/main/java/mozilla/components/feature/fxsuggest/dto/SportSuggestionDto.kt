/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Top-level response payload from the Sports suggestion API.
 */
@Serializable
data class SportsPayloadDto(
    val values: List<SportEventDto> = emptyList(),
)

/**
 * A single sport entry returned by the Sports API.
 *
 * @property sport The name of the sport (e.g. "NBA").
 * @property sportCategory The category of the sport (e.g. "basketball")
 * @property query The search query that produced this result.
 * @property date The start date of the sport event.
 * @property homeTeam The home team's information.
 * @property awayTeam The away team's information.
 * @property status The current long form status of the sport event (e.g. "Scheduled", "Delayed").
 * @property statusType This is simplified event status (e.g. "past", "live", "scheduled")
 * @property touched It is the UTC timestamp of the last time a given record was updated.
 */
@Serializable
data class SportEventDto(
    val sport: String,
    @SerialName("sport_category") val sportCategory: String,
    val query: String,
    val date: String,
    @SerialName("home_team") val homeTeam: TeamDto,
    @SerialName("away_team") val awayTeam: TeamDto,
    val status: String,
    @SerialName("status_type") val statusType: String,
    val touched: String,
)

/**
 * A single sport team data returned by the Sports API.
 *
 * @property key Sport unique 2-4 character key (e.g. "TOR" for "Toronto Maple Leafs").
 * @property name Official name of the team (e.g. Toronto Maple Leafs)
 * @property colors Primary to Quaternary team colors.
 * @property score Score of the home/away team. (Value is "null" if the game has not yet begun.)
 */
@Serializable
data class TeamDto(
    val key: String,
    val name: String,
    val colors: List<String> = emptyList(),
    val score: Int? = null,
    val icon: String? = null,
)
