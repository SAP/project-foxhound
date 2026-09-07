/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.home.sports.api.TeamMatchesResponseDto
import org.mozilla.fenix.home.sports.client.AppServicesWorldCupMatchesClient
import org.mozilla.fenix.home.sports.client.WorldCupMatchesClient

/**
 * [SportsRepository] backed by the Merino WCS endpoint via app-services.
 *
 * Fetches the entire bucketed [TeamMatchesResult] without a team filter on the
 * server side. The middleware is expected to cache this result and re-derive
 * [MatchCard]s locally when the selected team changes.
 *
 * Any exception during fetch, deserialization, or mapping — as well as a null body
 * from the client (which the client returns for caught network / API exceptions,
 * including 5xx responses) — is captured into a failed [Result] so the middleware
 * surfaces the error to the UI instead of silently rendering as an empty schedule.
 *
 * @param client Fetches raw JSON from the Merino WCS endpoint.
 * @param mapper Converts response DTOs into the [SportsMatch] domain model.
 * @param json [Json] decoder; defaults to one that tolerates unknown keys.
 */
class WorldCupMatchesRepository(
    private val client: WorldCupMatchesClient = AppServicesWorldCupMatchesClient(),
    private val mapper: MatchesResponseMapper = MatchesResponseMapper(),
    private val json: Json = Json { ignoreUnknownKeys = true },
) : SportsRepository {

    private val logger = Logger("WorldCupMatchesRepository")

    override suspend fun fetchMatches(): Result<TeamMatchesResult> =
        withContext(Dispatchers.IO) {
            runCatching {
                val body = client.fetchMatches(teams = emptySet())
                    ?: error("World Cup matches request returned no body")
                val response = json.decodeFromString<TeamMatchesResponseDto>(body)
                mapper.mapTeamMatches(response)
            }.onFailure { logger.error("Failed to fetch World Cup matches", it) }
        }
}
