/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.sp

/**
 * Default values for use with [RichText]
 */
object RichTextDefaults {
    /**
     * Default [RichTextTypography] from a base [TextStyle]
     */
    @Composable
    fun typography(base: TextStyle = LocalTextStyle.current): RichTextTypography {
        val baseSize = base.fontSize.takeIf { it.isSp }?.value ?: 16f
        return RichTextTypography(
            body = base,
            h1 = base.copy(fontSize = (baseSize * 1.5).sp, fontWeight = FontWeight.Bold),
            h2 = base.copy(fontSize = (baseSize * 1.35).sp, fontWeight = FontWeight.Bold),
            h3 = base.copy(fontSize = (baseSize * 1.15).sp, fontWeight = FontWeight.Bold),
            h4 = base.copy(fontSize = baseSize.sp, fontWeight = FontWeight.Bold),
            h5 = base.copy(fontSize = baseSize.sp, fontWeight = FontWeight.Bold),
            h6 = base.copy(fontSize = baseSize.sp, fontWeight = FontWeight.Bold),
            code = base.copy(fontFamily = FontFamily.Monospace),
            link = base.copy(textDecoration = TextDecoration.Underline),
        )
    }

    /**
     * Creates a [RichTextColors] that represents the default colors used in a [RichText].
     *
     * @param inlineCodeBackground The background color for inline code snippets.
     * @param onInlineCodeBackground The color for text used on top of [inlineCodeBackground].
     * @param blockQuoteIndicator The color of the indicator for block quotes.
     * @param linkColor The color of the text for links.
     */
    @Composable
    fun colors(
        blockQuoteIndicator: Color = LocalContentColor.current,
        inlineCodeBackground: Color = MaterialTheme.colorScheme.surfaceVariant,
        onInlineCodeBackground: Color = MaterialTheme.colorScheme.onSurfaceVariant,
        linkColor: Color = MaterialTheme.colorScheme.primary,
    ): RichTextColors {
        return RichTextColors(
            inlineCodeBackground = inlineCodeBackground,
            onInlineCodeBackground = onInlineCodeBackground,
            blockQuoteIndicator = blockQuoteIndicator,
            linkColor = linkColor,
        )
    }
}
