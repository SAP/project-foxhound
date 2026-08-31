/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.home.sports.client.WorldCupMatchesClient

class WorldCupMatchesRepositoryTest {

    @Test
    fun `GIVEN client returns null WHEN fetchMatches THEN returns failure`() = runTest {
        // A null body from the client means the underlying network / API call was
        // caught as an exception (e.g. 5xx). Surface as failure so the middleware
        // dispatches an error state instead of silently rendering an empty schedule.
        val repo = WorldCupMatchesRepository(client = { null })
        val result = repo.fetchMatches()
        assertTrue(result.isFailure)
    }

    @Test
    fun `GIVEN malformed JSON WHEN fetchMatches THEN returns failure`() = runTest {
        val repo = WorldCupMatchesRepository(client = { "not-json" })
        val result = repo.fetchMatches()
        assertTrue(result.isFailure)
    }

    @Test
    fun `GIVEN empty bucketed response WHEN fetchMatches THEN returns empty buckets`() = runTest {
        val repo = WorldCupMatchesRepository(
            client = { """{"previous":[],"current":[],"next":[]}""" },
        )
        val result = repo.fetchMatches()
        assertTrue(result.isSuccess)
        val value = result.getOrNull()!!
        assertEquals(0, value.previous.size)
        assertEquals(0, value.current.size)
        assertEquals(0, value.next.size)
    }

    @Test
    fun `WHEN fetchMatches THEN client is called with empty team filter`() = runTest {
        var captured: Set<String>? = null
        val client = WorldCupMatchesClient { teams ->
            captured = teams
            """{"previous":[],"current":[],"next":[]}"""
        }
        WorldCupMatchesRepository(client = client).fetchMatches()
        assertEquals(emptySet<String>(), captured)
    }

    @Test
    fun `GIVEN a single upcoming match WHEN fetchMatches THEN result contains the match`() = runTest {
        val body = """
            {
              "previous": [],
              "current": [],
              "next": [{
                "date": "2026-06-11T19:00:00+00:00",
                "global_event_id": 1,
                "home_team": {
                  "key": "MEX", "global_team_id": 1, "name": "Mexico", "region": "MEX",
                  "icon_url": null, "group": null, "eliminated": false
                },
                "away_team": {
                  "key": "RSA", "global_team_id": 2, "name": "South Africa", "region": "RSA",
                  "icon_url": null, "group": null, "eliminated": false
                },
                "period": "",
                "home_score": null,
                "away_score": null,
                "home_extra": null,
                "away_extra": null,
                "home_penalty": null,
                "away_penalty": null,
                "clock": "",
                "updated": 0,
                "status": "Scheduled",
                "status_type": "scheduled",
                "stage": "group_stage"
              }]
            }
        """.trimIndent()
        val repo = WorldCupMatchesRepository(client = { body })
        val result = repo.fetchMatches()
        assertTrue(result.isSuccess)
        val value = result.getOrNull()!!
        assertEquals(1, value.next.size)
        assertEquals(1L, value.next[0].globalEventId)
        assertEquals(TournamentRound.GROUP_STAGE, value.next[0].stage)
    }
}
