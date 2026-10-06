/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.awesomebar.provider

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import mozilla.components.concept.awesomebar.AwesomeBar
import mozilla.components.support.test.mock
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.util.Locale

private const val ARTIFICIAL_DELAY = 350L

/**
 * Tests for [StocksOnlineSuggestionProvider].
 *
 * Note: these tests use virtual time provided by kotlinx.coroutines.test.runTest so that the internal
 * [kotlinx.coroutines.delay(ARTIFICIAL_DELAY)] does not slow the tests.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class StocksOnlineSuggestionProviderTest {
    private lateinit var fakeDataSource: FakeCombinedOnlineSuggestionDataSource
    private lateinit var provider: StocksOnlineSuggestionProvider

    @Before
    fun setUp() {
        fakeDataSource = FakeCombinedOnlineSuggestionDataSource(
            stockResults = listOf(sampleStockItem(query = "VOO stock", ticker = "VOO")),
        )

        provider = StocksOnlineSuggestionProvider(
            searchUseCase = mock(),
            dataSource = fakeDataSource,
            suggestionsHeader = null,
            maxNumberOfSuggestions = DEFAULT_STOCK_SUGGESTION_LIMIT,
        )
    }

    @Test
    fun `returns empty list when text is empty and does not call data source`() = runTest {
        val results = provider.onInputChanged("")
        assertTrue(results.isEmpty())
        assertTrue(fakeDataSource.calls.isEmpty())
    }

    @Test
    fun `fetches and returns suggestions for any non-blank text`() = runTest {
        val deferred = async { provider.onInputChanged("VOO") }

        advanceTimeBy(ARTIFICIAL_DELAY)

        val results = deferred.await()
        assertTrue(results.isNotEmpty())

        assertEquals(listOf("VOO"), fakeDataSource.calls)

        val suggestion = results.single()
        assertEquals("VOO", suggestion.ticker)
        assertEquals(provider, suggestion.provider)
    }

    @Test
    fun `fetches and returns suggestions when text is a cashtag`() = runTest {
        val localDataSource = FakeCombinedOnlineSuggestionDataSource(
            stockResults = listOf(sampleStockItem(query = "\$AMZN", ticker = "AMZN")),
        )
        val cashtagProvider = StocksOnlineSuggestionProvider(
            searchUseCase = mock(),
            dataSource = localDataSource,
            suggestionsHeader = null,
            maxNumberOfSuggestions = DEFAULT_STOCK_SUGGESTION_LIMIT,
        )

        val deferred = async { cashtagProvider.onInputChanged("\$AMZN") }

        advanceTimeBy(ARTIFICIAL_DELAY)

        val results = deferred.await()
        assertTrue(results.isNotEmpty())

        assertEquals(listOf("\$AMZN"), localDataSource.calls)
        assertEquals("AMZN", results.single().ticker)
    }

    @Test
    fun `respects maxNumberOfSuggestions`() = runTest {
        val manyResults = listOf(
            sampleStockItem(query = "a stock", ticker = "A"),
            sampleStockItem(query = "b stock", ticker = "B"),
            sampleStockItem(query = "c stock", ticker = "C"),
        )

        val localDataSource = FakeCombinedOnlineSuggestionDataSource(stockResults = manyResults)

        val limitedProvider = StocksOnlineSuggestionProvider(
            searchUseCase = mock(),
            dataSource = localDataSource,
            suggestionsHeader = null,
            maxNumberOfSuggestions = 1,
        )

        val deferred = async { limitedProvider.onInputChanged("stock") }
        advanceTimeBy(ARTIFICIAL_DELAY)
        val results = deferred.await()

        assertEquals(1, results.size)
    }

    @Test
    fun `id is stable per instance`() = runTest {
        val p = StocksOnlineSuggestionProvider(
            searchUseCase = mock(),
            dataSource = FakeCombinedOnlineSuggestionDataSource(stockResults = listOf(sampleStockItem())),
            suggestionsHeader = null,
            maxNumberOfSuggestions = 1,
        )

        val id1 = p.id
        val deferred = async { p.onInputChanged("stock") }
        advanceTimeBy(ARTIFICIAL_DELAY)
        deferred.await()
        val id2 = p.id

        assertEquals(id1, id2)
    }

    @Test
    fun `cancellation before delay prevents data source call`() = runTest {
        val localDataSource = FakeCombinedOnlineSuggestionDataSource(stockResults = listOf(sampleStockItem()))
        val cancellableProvider = StocksOnlineSuggestionProvider(
            searchUseCase = mock(),
            dataSource = localDataSource,
            suggestionsHeader = null,
            maxNumberOfSuggestions = 1,
        )

        val job = async { cancellableProvider.onInputChanged("stock") }

        job.cancel(CancellationException("test-cancel"))

        advanceTimeBy(ARTIFICIAL_DELAY)

        try {
            job.await()
            // If we get here, cancellation didn't happen as expected — fail the test.
            throw AssertionError("Expected cancellation to propagate")
        } catch (e: CancellationException) {
            // expected
        }

        assertTrue(localDataSource.calls.isEmpty())
    }

    @Test
    fun `formats lastPrice correctly in US`() {
        val result = provider.formatLastPrice("$248.04 USD", Locale.US)
        assertEquals("USD 248.04", result)
    }

    @Test
    fun `formats lastPrice correctly in Germany`() {
        val result = provider.formatLastPrice("$248.04 USD", Locale.GERMANY)
        assertEquals("USD 248,04", result)
    }

    @Test
    fun `change percent formatted correctly in US`() {
        val result = provider.parseChangePercent("1.53", Locale.US)
        assertEquals("+1.53", (result as AwesomeBar.ChangePercent.Positive).value)
    }

    @Test
    fun `change percent formatted correctly in Germany`() {
        val result = provider.parseChangePercent("1.53", Locale.GERMANY)
        assertEquals("+1,53", (result as AwesomeBar.ChangePercent.Positive).value)
    }
}

/** Convenience factory for creating sample [AwesomeBar.StockItem] objects for tests. */
private fun sampleStockItem(
    query: String = "VOO stock",
    name: String = "Vanguard S&P 500 ETF",
    ticker: String = "VOO",
    changePercToday: String = "-0.11",
    lastPrice: String = "559.44 USD",
    exchange: String = "S&P 500",
) = AwesomeBar.StockItem(
    query = query,
    name = name,
    ticker = ticker,
    todaysChangePerc = changePercToday,
    lastPrice = lastPrice,
    exchange = exchange,
    imageUrl = "",
)
