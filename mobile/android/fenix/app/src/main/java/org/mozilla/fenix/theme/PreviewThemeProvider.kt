/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.theme

import androidx.compose.ui.tooling.preview.PreviewParameterProvider

/**
 * This class can be used in compose previews to generate previews for each theme type.
 *
 * Example:
 * ```
 * @Preview
 * @Composable
 * private fun PreviewText(
 *     @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
 * ) = FirefoxTheme(theme) {
 *     Surface {
 *         Text("hello")
 *     }
 * }
 * ```
 */
class PreviewThemeProvider : PreviewParameterProvider<Theme> {
    override val values = Theme.entries.asSequence()
}

/**
 * A wrapper used for Compose previews that pairs a value with a [Theme].
 *
 * Each instance represents a single preview permutation of [value]
 * rendered using the given [theme].
 *
 * @property theme The theme variant to apply for the preview.
 * @property value The underlying value being previewed.
 */
data class ThemedValue<T>(
    val theme: Theme,
    val value: T,
)

/**
 * Base [PreviewParameterProvider] for generating themed preview permutations.
 *
 * Subclasses supply a sequence of base values, which are combined with every
 * entry in [Theme.entries] to produce a [ThemedValue] for each
 * value–theme combination.
 *
 * This allows Compose previews to be rendered across all supported themes
 * without duplicating preview composables or provider logic.
 *
 * Typical usage:
 *
 * ```
 * class MyPreviewProvider : ThemedValueProvider<MyUiState>(
 *     sequenceOf(
 *         MyUiState(
 *             text = "hello"
 *         ),
 *         MyUiState(
 *             text = "world"
 *         ),
 *     )
 * )
 *
 * @Preview
 * @Composable
 * private fun PreviewText(
 *     @PreviewParameter(MyPreviewProvider::class) state: ThemedValue<MyUiState>,
 * ) = FirefoxTheme(state.theme) {
 *     Surface {
 *         Text(state.value.text)
 *     }
 * }
 * ```
 *
 * @param baseValues The base values to be wrapped with each available theme.
 */
abstract class ThemedValueProvider<T>(
    baseValues: Sequence<T>,
) : PreviewParameterProvider<ThemedValue<T>> {
    override val values: Sequence<ThemedValue<T>> =
        baseValues.flatMap { value ->
            Theme.entries.map { theme ->
                ThemedValue(
                    theme,
                    value,
                )
            }
        }
}
