/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.awesomebar.provider

import mozilla.components.concept.awesomebar.AwesomeBar

/**
 * Simple fake data source used for unit tests.
 * Records calls and returns the specified results.
 */
class FakeCombinedOnlineSuggestionDataSource(
    private val stockResults: List<AwesomeBar.StockItem> = emptyList(),
    private val sportResults: List<AwesomeBar.SportItem> = emptyList(),
    private val flightResults: List<AwesomeBar.FlightItem> = emptyList(),
) : AwesomeBar.CombinedSuggestionsDataSource {
    val calls = mutableListOf<String>()

    override suspend fun fetchStocks(query: String): List<AwesomeBar.StockItem> {
        calls += query
        return stockResults
    }

    override suspend fun fetchSports(query: String): List<AwesomeBar.SportItem> {
        calls += query
        return sportResults
    }

    override suspend fun fetchFlights(query: String): List<AwesomeBar.FlightItem> {
        calls += query
        return flightResults
    }
}
