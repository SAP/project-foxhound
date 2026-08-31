/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.datasource

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import mozilla.components.feature.fxsuggest.client.MerinoClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CombinedOnlineSuggestionDataSourceTest {

    @Test
    fun `fetchStocks returns empty list without a network call when query is too short`() =
        runTest {
            val client = FakeMerinoClient(STOCKS_RESPONSE)
            val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

            val result = dataSource.fetchStocks("AP")

            assertTrue(result.isEmpty())
            assertTrue(client.queries.isEmpty())
        }

    @Test
    fun `fetchSports returns empty list without a network call when query is too short`() =
        runTest {
            val client = FakeMerinoClient(SPORTS_RESPONSE)
            val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

            val result = dataSource.fetchSports("AP")

            assertTrue(result.isEmpty())
            assertTrue(client.queries.isEmpty())
        }

    @Test
    fun `fetchFlights returns empty list without a network call when query is too short`() =
        runTest {
            val client = FakeMerinoClient(FLIGHTS_RESPONSE)
            val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

            val result = dataSource.fetchFlights("UA")

            assertTrue(result.isEmpty())
            assertTrue(client.queries.isEmpty())
        }

    @Test
    fun `fetchStocks returns stock items when only a stock response is returned`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("AAPL stock")

        assertEquals(1, result.size)
        with(result[0]) {
            assertEquals("AAPL", ticker)
            assertEquals("Apple Inc.", name)
            assertEquals("213.18 USD", lastPrice)
            assertEquals("+0.57", todaysChangePerc)
            assertEquals("AAPL stock", query)
            assertEquals("NASDAQ", exchange)
            assertEquals("https://example.com/aapl.png", imageUrl)
        }
    }

    @Test
    fun `fetchSports returns empty when only a stock response is returned`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchSports("AAPL stock")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchFlights returns empty when only a stock response is returned`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchFlights("AAPL stock")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchSports returns sport items when only a sport response is returned`() = runTest {
        val client = FakeMerinoClient(SPORTS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchSports("lakers game")

        assertEquals(1, result.size)
        with(result[0]) {
            assertEquals("NBA", sport)
            assertEquals("basketball", sportCategory)
            assertEquals("lakers game", query)
            assertEquals("2026-04-20T19:00:00Z", date)
            assertEquals("Scheduled", status)
            assertEquals("scheduled", statusType)
            with(homeTeam) {
                assertEquals("LAL", key)
                assertEquals("Los Angeles Lakers", name)
            }
            with(awayTeam) {
                assertEquals("BOS", key)
                assertEquals("Boston Celtics", name)
            }
        }
    }

    @Test
    fun `fetchStocks returns empty when only a sport response is returned`() = runTest {
        val client = FakeMerinoClient(SPORTS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("lakers game")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchFlights returns empty when only a sport response is returned`() = runTest {
        val client = FakeMerinoClient(SPORTS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchFlights("lakers game")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchFlights returns flight items when only a flight response is returned`() = runTest {
        val client = FakeMerinoClient(FLIGHTS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchFlights("UA1 flight")

        assertEquals(1, result.size)
        with(result[0]) {
            assertEquals("UA1", flightNumber)
            assertEquals("DEN", destination.code)
            assertEquals("Denver", destination.city)
            assertEquals("SFO", origin.code)
            assertEquals("San Francisco", origin.city)
            assertEquals("On Time", status)
            assertEquals(50, progressPercent)
            assertEquals(90, timeLeftMinutes)
            assertEquals(false, delayed)
            assertEquals("https://flightaware.com/live/flight/UA1", url)
            assertEquals("UA", airline.code)
            assertEquals("United Airlines", airline.name)
        }
    }

    @Test
    fun `fetchStocks returns empty when only a flight response is returned`() = runTest {
        val client = FakeMerinoClient(FLIGHTS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("UA1 flight")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchSports returns empty when only flights response is returned`() = runTest {
        val client = FakeMerinoClient(FLIGHTS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchSports("UA1 flight")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchSports returns sports items when sports has a higher score than stocks`() = runTest {
        val client = FakeMerinoClient(SPORTS_BEATS_STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchSports("query test")

        assertEquals(1, result.size)
        assertEquals("NBA", result[0].sport)
    }

    @Test
    fun `fetchStocks returns empty when sports has a higher score than stocks`() = runTest {
        val client = FakeMerinoClient(SPORTS_BEATS_STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("query test")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchStocks returns empty when fetcher returns null`() = runTest {
        val client = FakeMerinoClient(null)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("AAPL stock")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchStocks returns empty when response is malformed JSON`() = runTest {
        val client = FakeMerinoClient("not valid json")
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("AAPL stock")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchStocks returns empty when response has no suggestions`() = runTest {
        val client = FakeMerinoClient("""{"suggestions":[]}""")
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("AAPL stock")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `fetchStocks returns empty when response contains unknown provider`() = runTest {
        val client = FakeMerinoClient(UNKNOWN_PROVIDER_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val result = dataSource.fetchStocks("query test")

        assertTrue(result.isEmpty())
    }

    @Test
    fun `concurrent requests for the same query result in a single network call`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        val deferred1 = async { dataSource.fetchStocks("AAPL stock") }
        val deferred2 = async { dataSource.fetchStocks("AAPL stock") }

        assertEquals(deferred1.await(), deferred2.await())
        assertEquals(1, client.queries.size)
    }

    @Test
    fun `different queries each trigger a separate network call`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client, debounceMs = 0)

        dataSource.fetchStocks("AAPL stock")
        dataSource.fetchStocks("MSFT stock")

        assertEquals(listOf("AAPL stock", "MSFT stock"), client.queries)
    }

    @Test
    fun `no network call is made within the debounce window`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client)

        backgroundScope.launch { dataSource.fetchStocks("AAPL stock") }
        advanceTimeBy(DEFAULT_DEBOUNCE_MS - 1)

        assertTrue(client.queries.isEmpty())
    }

    @Test
    fun `only the last query within the debounce window triggers a network call`() = runTest {
        val client = FakeMerinoClient(STOCKS_RESPONSE)
        val dataSource = CombinedOnlineSuggestionDataSource(backgroundScope, client)

        backgroundScope.launch { dataSource.fetchStocks("AAPL stock") }
        advanceTimeBy(DEFAULT_DEBOUNCE_MS - 1)
        dataSource.fetchStocks("MSFT stock")

        assertEquals(listOf("MSFT stock"), client.queries)
    }
}

private class FakeMerinoClient(private val response: String?) : MerinoClient {
    val queries = mutableListOf<String>()

    override fun makeRequest(query: String): String? {
        queries += query
        return response
    }
}

private val STOCKS_RESPONSE = """
    {
      "suggestions": [{
        "provider": "polygon",
        "score": 0.9,
        "custom_details": {
          "polygon": {
            "values": [{
              "ticker": "AAPL",
              "name": "Apple Inc.",
              "last_price": "213.18 USD",
              "todays_change_perc": "+0.57",
              "query": "AAPL stock",
              "exchange": "NASDAQ",
              "image_url": "https://example.com/aapl.png"
            }]
          }
        }
      }]
    }
""".trimIndent()

private val SPORTS_RESPONSE = """
    {
      "suggestions": [{
        "provider": "sports",
        "score": 0.9,
        "custom_details": {
          "sports": {
            "values": [{
              "sport": "NBA",
              "sport_category": "basketball",
              "query": "lakers game",
              "date": "2026-04-20T19:00:00Z",
              "home_team": {"key": "LAL", "name": "Los Angeles Lakers", "colors": ["#552583"]},
              "away_team": {"key": "BOS", "name": "Boston Celtics", "colors": ["#007A33"]},
              "status": "Scheduled",
              "status_type": "scheduled",
              "touched": "2026-04-20T10:00:00Z"
            }]
          }
        }
      }]
    }
""".trimIndent()

private val FLIGHTS_RESPONSE = """
    {
      "suggestions": [{
        "provider": "flightaware",
        "score": 0.9,
        "custom_details": {
          "flightaware": {
            "values": [{
              "flight_number": "UA1",
              "destination": {"code": "DEN", "city": "Denver"},
              "origin": {"code": "SFO", "city": "San Francisco"},
              "departure": {"scheduled_time": "2026-04-20T10:00:00Z"},
              "arrival": {"scheduled_time": "2026-04-20T13:00:00Z"},
              "status": "On Time",
              "progress_percent": 50,
              "time_left_minutes": 90,
              "delayed": false,
              "url": "https://flightaware.com/live/flight/UA1",
              "airline": {"code": "UA", "name": "United Airlines"}
            }]
          }
        }
      }]
    }
""".trimIndent()

private val SPORTS_BEATS_STOCKS_RESPONSE = """
    {
      "suggestions": [
        {
          "provider": "polygon",
          "score": 0.5,
          "custom_details": {
            "polygon": {
              "values": [{
                "ticker": "AAPL",
                "name": "Apple Inc.",
                "last_price": "213.18 USD",
                "todays_change_perc": "+0.57",
                "query": "query test",
                "exchange": "NASDAQ"
              }]
            }
          }
        },
        {
          "provider": "sports",
          "score": 0.9,
          "custom_details": {
            "sports": {
              "values": [{
                "sport": "NBA",
                "sport_category": "basketball",
                "query": "query test",
                "date": "2026-04-20T19:00:00Z",
                "home_team": {"key": "LAL", "name": "Los Angeles Lakers", "colors": []},
                "away_team": {"key": "BOS", "name": "Boston Celtics", "colors": []},
                "status": "Scheduled",
                "status_type": "scheduled",
                "touched": "2026-04-20T10:00:00Z"
              }]
            }
          }
        }
      ]
    }
""".trimIndent()

private val UNKNOWN_PROVIDER_RESPONSE = """
    {
      "suggestions": [{
        "provider": "unknown_provider",
        "score": 0.9,
        "custom_details": {}
      }]
    }
""".trimIndent()
