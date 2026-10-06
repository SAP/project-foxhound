/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Colors for use with [RichText]
 *
 * @param inlineCodeBackground The background color for inline code snippets.
 * @param onInlineCodeBackground The color for text used on top of [inlineCodeBackground].
 * @param blockQuoteIndicator The color of the indicator for block quotes.
 * @param linkColor The color of the text for links.
 */
@Immutable
data class RichTextColors(
    val inlineCodeBackground: Color,
    val onInlineCodeBackground: Color,
    val blockQuoteIndicator: Color,
    val linkColor: Color,
)

internal val LocalRichTextColors = staticCompositionLocalOf {
    RichTextColors(
        inlineCodeBackground = Color.Unspecified,
        onInlineCodeBackground = Color.Unspecified,
        blockQuoteIndicator = Color.Unspecified,
        linkColor = Color.Unspecified,
    )
}
