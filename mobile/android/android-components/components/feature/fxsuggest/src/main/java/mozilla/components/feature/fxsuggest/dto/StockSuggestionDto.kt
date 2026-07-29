/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Top-level response payload from the Polygon stocks API.
 */
@Serializable
data class PolygonPayloadDto(
    val values: List<StockTickerDto> = emptyList(),
)

/**
 * A single stock ticker entry returned by the Polygon API.
 *
 * @property ticker The stock ticker symbol (e.g. "AAPL").
 * @property name The full company name.
 * @property lastPrice The most recent trade price as a formatted string.
 * @property todaysChangePerc Today's price change as a percentage string.
 * @property query The search query that produced this result.
 * @property exchange The exchange the stock is listed on (e.g. "NASDAQ").
 * @property imageUrl Optional URL for the company logo.
 */
@Serializable
data class StockTickerDto(
    val ticker: String,
    val name: String,
    @SerialName("last_price") val lastPrice: String,
    @SerialName("todays_change_perc") val todaysChangePerc: String,
    val query: String,
    val exchange: String,
    @SerialName("image_url") val imageUrl: String? = null,
)
