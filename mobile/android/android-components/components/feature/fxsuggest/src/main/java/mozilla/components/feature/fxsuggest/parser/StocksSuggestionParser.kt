/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.parser

import mozilla.components.concept.awesomebar.AwesomeBar.StockItem
import mozilla.components.feature.fxsuggest.dto.PolygonPayloadDto
import mozilla.components.feature.fxsuggest.dto.StockTickerDto

internal class StocksSuggestionParser {
    fun parse(payload: PolygonPayloadDto): List<StockItem> {
        return payload.values.map { stock ->
            stock.toStockItem()
        }
    }

    companion object {
        const val PROVIDER_NAME = "polygon"
    }
}

private fun StockTickerDto.toStockItem() = StockItem(
    query = query,
    name = name,
    ticker = ticker,
    todaysChangePerc = todaysChangePerc,
    lastPrice = lastPrice,
    exchange = exchange,
    imageUrl = imageUrl,
)
