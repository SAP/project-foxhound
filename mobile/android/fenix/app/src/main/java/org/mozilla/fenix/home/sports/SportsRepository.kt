/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

/**
 * Data source for sports match data from the World Cup API.
 */
interface SportsRepository {

    /**
     * Fetches all match data for the tournament, without filtering by team.
     *
     * Returns the raw bucketed [TeamMatchesResult]; downstream code (middleware) is
     * responsible for caching this and building [MatchCard]s for the active team
     * selection. Fetching unfiltered lets the same response be re-filtered for a
     * different team without another network round-trip.
     *
     * @return [Result] containing the [TeamMatchesResult] on success, or an exception on failure.
     */
    suspend fun fetchMatches(): Result<TeamMatchesResult>
}
