/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.client

import androidx.annotation.VisibleForTesting
import mozilla.appservices.merino.MerinoWorldCupApiException
import mozilla.appservices.merino.WorldCupClient
import mozilla.appservices.merino.WorldCupConfig
import mozilla.appservices.merino.WorldCupOptions
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.fenix.home.sports.WORLD_CUP_KICKOFF
import java.time.LocalDate

/**
 * Picks the `date` value sent to the Merino WCS endpoint, which returns matches within
 * ±10 days of the requested date. Before kickoff we pin to the kickoff date so the first
 * batch of fixtures is in range; once the tournament is underway we use [today].
 *
 * Returned in ISO-8601 `yyyy-MM-dd` (the format the API expects), via [LocalDate.toString].
 */
@VisibleForTesting
internal fun apiRequestDate(today: LocalDate): String {
    val target = if (today.isBefore(WORLD_CUP_KICKOFF)) WORLD_CUP_KICKOFF else today
    return target.toString()
}

@VisibleForTesting
internal const val MOCK_WORLD_CUP_SERVER_BASE_URL = "https://worldcup-mock-894454592292.us-east1.run.app"

/**
 * Builds the mock World Cup server host for the given [session] (e.g. `"jolly-narwhal-39"`).
 * Returns `null` when the session is blank, so callers can fall through to production.
 */
internal fun mockWorldCupBaseHost(session: String): String? =
    session.trim().takeIf { it.isNotEmpty() }?.let { "$MOCK_WORLD_CUP_SERVER_BASE_URL/$it" }

/**
 * [WorldCupMatchesClient] implementation that delegates to the Application Services
 * [WorldCupClient]. The WCS endpoint does not require OHTTP, so no channel
 * configuration is performed here (unlike Merino suggest).
 *
 * The endpoint returns matches within ±10 days of the requested `date`. Before
 * the tournament starts we pin the request to the kickoff date so the first
 * batch of fixtures is in range; once the tournament is underway we let the
 * device's "today" drive the window.
 *
 * The underlying [WorldCupClient] is constructed lazily and rebuilt whenever
 * [baseHostProvider] returns a different host than the last fetch. This lets
 * QA flip between prod Merino and the mock server at runtime (via the debug
 * drawer) without restarting the app.
 *
 * Network and unexpected errors are caught, logged, and surfaced as `null` so the
 * repository layer can treat them uniformly as "no data".
 *
 * @param baseHostProvider Returns the override base host (e.g. `"https://.../jolly-narwhal-39"`)
 * or `null` to use the production Merino default. Read on every [fetchMatches] call so a
 * settings change is reflected on the next refresh.
 * @param clock Source of the current local date; defaults to [LocalDate.now].
 * Injected for testability of the pre-/in-tournament date selection.
 */
class AppServicesWorldCupMatchesClient(
    private val baseHostProvider: () -> String? = { null },
    private val clock: () -> LocalDate = LocalDate::now,
) : WorldCupMatchesClient {

    private val logger = Logger("AppServicesWorldCupMatchesClient")

    @Volatile
    private var cachedClient: CachedClient? = null

    private data class CachedClient(val host: String?, val client: WorldCupClient)

    private fun client(): WorldCupClient {
        val currentHost = baseHostProvider()
        val cached = cachedClient
        if (cached != null && cached.host == currentHost) return cached.client
        val newClient = WorldCupClient(WorldCupConfig(baseHost = currentHost))
        cachedClient = CachedClient(host = currentHost, client = newClient)
        return newClient
    }

    // The mock server runs against its own simulated tournament clock and decides the ±10
    // day window from that. Sending the device's "today" to it just returns matches near
    // today (often outside the simulated tournament), so we omit `date` and let the mock
    // use its session clock. Production Merino gets the pre-kickoff / today pin via
    // [apiRequestDate] as usual.
    private fun requestDateOrNull(): String? =
        if (isUsingMockServer()) null else apiRequestDate(clock())

    private fun isUsingMockServer(): Boolean =
        baseHostProvider()?.startsWith(MOCK_WORLD_CUP_SERVER_BASE_URL) == true

    override fun fetchMatches(teams: Set<String>): String? = try {
        val requestDate = requestDateOrNull()
        client().getMatches(
            options = WorldCupOptions(
                limit = null,
                teams = teams.toList().takeIf { it.isNotEmpty() },
                acceptLanguage = null,
                date = requestDate,
            ),
        )
    } catch (e: MerinoWorldCupApiException) {
        when (e) {
            is MerinoWorldCupApiException.Network ->
                logger.error(message = "$NETWORK_ERROR_MESSAGE - ${e.message}")
            is MerinoWorldCupApiException.Other ->
                logger.error(message = "$UNEXPECTED_ERROR_MESSAGE - ${e.message}")
        }
        null
    }

    companion object {
        private const val NETWORK_ERROR_MESSAGE = "Network error when fetching World Cup matches"
        private const val UNEXPECTED_ERROR_MESSAGE = "Unexpected error when fetching World Cup matches"
    }
}
