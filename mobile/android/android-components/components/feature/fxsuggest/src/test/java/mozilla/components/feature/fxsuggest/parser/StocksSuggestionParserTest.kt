package mozilla.components.feature.fxsuggest.parser

import mozilla.components.feature.fxsuggest.dto.PolygonPayloadDto
import mozilla.components.feature.fxsuggest.dto.StockTickerDto
import org.junit.Assert
import org.junit.Test

class StocksSuggestionParserTest {
    private val parser = StocksSuggestionParser()

    @Test
    fun `WHEN payload has values THEN maps each stock item`() {
        val payload = PolygonPayloadDto(
            values = listOf(
                StockTickerDto(
                    ticker = "AAPL",
                    name = "Apple Inc.",
                    lastPrice = "$213.18 USD",
                    todaysChangePerc = "+0.57",
                    query = "AAPL stock",
                    exchange = "NASDAQ",
                    imageUrl = "https://example.com/aapl.png",
                ),
                StockTickerDto(
                    ticker = "MSFT",
                    name = "Microsoft Corporation",
                    lastPrice = "$432.67 USD",
                    todaysChangePerc = "-0.11",
                    query = "MSFT stock",
                    exchange = "NASDAQ",
                    imageUrl = null,
                ),
            ),
        )

        val result = parser.parse(payload)

        Assert.assertEquals(2, result.size)
        with(result[0]) {
            Assert.assertEquals("AAPL", ticker)
            Assert.assertEquals("Apple Inc.", name)
            Assert.assertEquals("$213.18 USD", lastPrice)
            Assert.assertEquals("+0.57", todaysChangePerc)
            Assert.assertEquals("AAPL stock", query)
            Assert.assertEquals("NASDAQ", exchange)
            Assert.assertEquals("https://example.com/aapl.png", imageUrl)
        }
        with(result[1]) {
            Assert.assertEquals("MSFT", ticker)
            Assert.assertEquals("Microsoft Corporation", name)
            Assert.assertEquals("$432.67 USD", lastPrice)
            Assert.assertEquals("-0.11", todaysChangePerc)
            Assert.assertEquals("MSFT stock", query)
            Assert.assertEquals("NASDAQ", exchange)
            Assert.assertNull(imageUrl)
        }
    }

    @Test
    fun `WHEN payload is empty THEN returns empty list`() {
        val result = parser.parse(PolygonPayloadDto())

        Assert.assertEquals(0, result.size)
    }
}
