/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.datasource

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import mozilla.components.concept.awesomebar.AwesomeBar
import mozilla.components.concept.awesomebar.AwesomeBar.CombinedSuggestionsDataSource
import mozilla.components.feature.fxsuggest.client.MerinoClient
import mozilla.components.feature.fxsuggest.client.SuggestMerinoClient
import mozilla.components.feature.fxsuggest.dto.CombinedSuggestionResponseDto
import mozilla.components.feature.fxsuggest.dto.SuggestionDto
import mozilla.components.feature.fxsuggest.parser.FlightsSuggestionParser
import mozilla.components.feature.fxsuggest.parser.SportsSuggestionParser
import mozilla.components.feature.fxsuggest.parser.StocksSuggestionParser

/**
 * Minimum length of the query that will trigger network request for fetching online suggestions.
 */
private const val MIN_QUERY_LENGTH = 3

internal const val DEFAULT_DEBOUNCE_MS = 200L

/**
 * Represents the result of a combined Merino suggestions API response.
 * Only the provider with the highest score will be returned; the others will not be present.
 */
sealed class CombinedResults {
    /**
     * The stocks provider (Polygon) returned the highest-scoring suggestion.
     *
     * @property items The list of [AwesomeBar.StockItem]s parsed from the response.
     */
    data class Stocks(val items: List<AwesomeBar.StockItem>) : CombinedResults()

    /**
     * The sports provider returned the highest-scoring suggestion.
     *
     * @property items The list of [AwesomeBar.SportItem]s parsed from the response.
     */
    data class Sports(val items: List<AwesomeBar.SportItem>) : CombinedResults()

    /**
     * The flights provider (FlightAware) returned the highest-scoring suggestion.
     *
     * @property items The list of [AwesomeBar.FlightItem]s parsed from the response.
     */
    data class Flights(val items: List<AwesomeBar.FlightItem>) : CombinedResults()

    /**
     * No suggestions were returned, either because the API returned no results,
     * the response could not be parsed, or the request failed.
     */
    object Empty : CombinedResults()
}

/**
 * Fetches suggestions for stocks, sports, and flights from a single combined API endpoint.
 *
 * All three providers share one instance of this class. Queries are debounced and concurrent
 * requests for the same query are deduplicated via [MutableStateFlow]. The suggestion with the
 * highest score in the response is selected and returned as a [CombinedResults] subtype.
 *
 * @param scope A long-lived [CoroutineScope] (e.g. application scope) used to launch network
 * requests independently of any individual provider's lifecycle.
 * @param client The [MerinoClient] used to perform the network request.
 */
@OptIn(FlowPreview::class)
class CombinedOnlineSuggestionDataSource(
    private val scope: CoroutineScope,
    private val client: MerinoClient = SuggestMerinoClient(),
    private val debounceMs: Long = DEFAULT_DEBOUNCE_MS,
) : CombinedSuggestionsDataSource {
    private val queryFlow = MutableSharedFlow<String>(replay = 1)
    private val resultsFlow = MutableStateFlow(Pair("", CombinedResults.Empty as CombinedResults))
    private val json = Json { ignoreUnknownKeys = true }
    private val stocksParser = StocksSuggestionParser()
    private val sportsParser = SportsSuggestionParser()
    private val flightsParser = FlightsSuggestionParser()

    init {
        scope.launch {
            queryFlow
                .debounce(debounceMs)
                .collectLatest { query ->
                    val results = fetchAndParse(query)
                    resultsFlow.value = query to results
                }
        }
    }

    private suspend fun fetch(query: String): CombinedResults {
        if (query.length < MIN_QUERY_LENGTH) return CombinedResults.Empty
        queryFlow.emit(query)
        return resultsFlow.first { it.first == query }.second
    }

    override suspend fun fetchStocks(query: String): List<AwesomeBar.StockItem> =
        (fetch(query) as? CombinedResults.Stocks)?.items ?: emptyList()

    override suspend fun fetchSports(query: String): List<AwesomeBar.SportItem> =
        (fetch(query) as? CombinedResults.Sports)?.items ?: emptyList()

    override suspend fun fetchFlights(query: String): List<AwesomeBar.FlightItem> =
        (fetch(query) as? CombinedResults.Flights)?.items ?: emptyList()

    private suspend fun fetchAndParse(query: String): CombinedResults = withContext(Dispatchers.IO) {
        val body = client.makeRequest(query) ?: return@withContext CombinedResults.Empty
        parseResponse(body)
    }

    private fun parseResponse(body: String): CombinedResults {
        return try {
            val response = json.decodeFromString<CombinedSuggestionResponseDto>(body)
            val winner = response.suggestions.maxByOrNull { it.score } ?: return CombinedResults.Empty
            toResults(winner)
        } catch (_: Exception) {
            CombinedResults.Empty
        }
    }

    private fun toResults(suggestion: SuggestionDto): CombinedResults {
        val details = suggestion.customDetails ?: return CombinedResults.Empty

        return when (suggestion.provider) {
            StocksSuggestionParser.PROVIDER_NAME -> details.polygon?.let {
                CombinedResults.Stocks(stocksParser.parse(it))
            }
            SportsSuggestionParser.PROVIDER_NAME -> details.sports?.let {
                CombinedResults.Sports(sportsParser.parse(it))
            }
            FlightsSuggestionParser.PROVIDER_NAME -> details.flightaware?.let {
                CombinedResults.Flights(flightsParser.parse(it))
            }
            else -> null
        } ?: CombinedResults.Empty
    }
}
