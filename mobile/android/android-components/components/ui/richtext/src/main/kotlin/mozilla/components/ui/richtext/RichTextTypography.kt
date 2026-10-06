/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.ui.richtext

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle

/**
 * Typography for [RichText].
 *
 * @param body The body text style.
 * @param h1 The H1 text style.
 * @param h2 The H2 text style.
 * @param h3 The H3 text style.
 * @param h4 The H4 text style.
 * @param h5 The H5 text style.
 * @param h6 The H6 text style.
 * @param code The code text style.
 * @param link The link text style.
 */
@Immutable
data class RichTextTypography(
    val body: TextStyle,
    val h1: TextStyle,
    val h2: TextStyle,
    val h3: TextStyle,
    val h4: TextStyle,
    val h5: TextStyle,
    val h6: TextStyle,
    val code: TextStyle,
    val link: TextStyle,
)

internal val LocalRichTextTypography = staticCompositionLocalOf {
    RichTextTypography(
        body = TextStyle.Default,
        h1 = TextStyle.Default,
        h2 = TextStyle.Default,
        h3 = TextStyle.Default,
        h4 = TextStyle.Default,
        h5 = TextStyle.Default,
        h6 = TextStyle.Default,
        code = TextStyle.Default,
        link = TextStyle.Default,
    )
}
