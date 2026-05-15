/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.utils

import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import mozilla.components.compose.browser.awesomebar.internal.optimizedsuggestions.ChangePercent

internal class StockSuggestionDataProvider : PreviewParameterProvider<StockSuggestionPreviewModel> {

    override val values = sequenceOf(
        StockSuggestionPreviewModel(
            ticker = "AAPL",
            name = "Apple Inc.",
            index = "NASDAQ",
            lastPrice = "USD 150.04",
            changePercent = ChangePercent.Negative("-1.23"),
            onClick = {},
        ),
        StockSuggestionPreviewModel(
            ticker = "AAPL",
            name = "Apple Inc.",
            index = "NASDAQ",
            lastPrice = "USD 248.03",
            changePercent = ChangePercent.Positive("+1.23"),
            onClick = {},
        ),
        StockSuggestionPreviewModel(
            ticker = "AAPL",
            name = "Apple Inc.",
            index = "NASDAQ",
            lastPrice = "USD 12.34",
            changePercent = ChangePercent.Neutral,
            onClick = {},
        ),
    )
}

internal data class StockSuggestionPreviewModel(
    val ticker: String,
    val name: String,
    val index: String,
    val lastPrice: String,
    val changePercent: ChangePercent,
    val onClick: () -> Unit,
)
