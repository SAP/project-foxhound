/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports.client

/**
 * Fetches World Cup match data from the Merino WCS endpoint
 * (`/api/v1/wcs/matches`).
 *
 * Wrapped behind an interface so the repository can be unit-tested without
 * going through the app-services binding.
 */
fun interface WorldCupMatchesClient {
    /**
     * Fetches matches, optionally filtered by team key.
     *
     * @param teams ISO team keys to filter by. Empty means no filter.
     * @return Raw JSON response body, or `null` on network/API error.
     */
    fun fetchMatches(teams: Set<String>): String?
}
