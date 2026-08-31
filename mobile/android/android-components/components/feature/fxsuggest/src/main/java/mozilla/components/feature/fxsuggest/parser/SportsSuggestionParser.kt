/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.parser

import mozilla.components.concept.awesomebar.AwesomeBar.SportItem
import mozilla.components.feature.fxsuggest.dto.SportEventDto
import mozilla.components.feature.fxsuggest.dto.SportsPayloadDto
import mozilla.components.feature.fxsuggest.dto.TeamDto

internal class SportsSuggestionParser {
    fun parse(payload: SportsPayloadDto): List<SportItem> {
        return payload.values.map { sport ->
            sport.toSportItem()
        }
    }

    companion object {
        const val PROVIDER_NAME = "sports"
    }
}

private fun SportEventDto.toSportItem(): SportItem {
    return SportItem(
        sport = sport,
        sportCategory = sportCategory,
        query = query,
        date = date,
        homeTeam = homeTeam.toTeamSportItem(),
        awayTeam = awayTeam.toTeamSportItem(),
        status = status,
        statusType = statusType,
        touched = touched,
    )
}

private fun TeamDto.toTeamSportItem(): SportItem.Team {
    return SportItem.Team(
        key = key,
        name = name,
        colors = colors,
        score = score,
        icon = icon,
    )
}
