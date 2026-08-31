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
    private val themes = Theme.entries

    override val values = themes.asSequence()

    override fun getDisplayName(index: Int): String {
        return themes[index].name
    }
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
 * @param getDisplayName An optional function to provide a display name based either on the value
 *        or its index in [baseValues].
 */
abstract class ThemedValueProvider<T>(
    baseValues: Sequence<T>,
    getDisplayName: (index: Int, value: T) -> String? = { _, _ -> null },
) : PreviewParameterProvider<ThemedValue<T>> {

    /**
     * @see [org.mozilla.fenix.theme.ThemedValueProvider]
     * @param baseValues The base values to be wrapped with each available theme.
     * @param displayNames An optional list of display names for [baseValues].
     */
    constructor(
        baseValues: Sequence<T>,
        displayNames: List<String?>,
    ) : this(
        baseValues,
        { index, _ -> displayNames.getOrNull(index) },
    )

    override val values: Sequence<ThemedValue<T>> =
        baseValues.flatMap { value ->
            Theme.entries.map { theme ->
                ThemedValue(
                    theme,
                    value,
                )
            }
        }

    private val displayNames = values
        .mapIndexed { index, (theme, value) ->
            val valueIndex = index / Theme.entries.size
            val valueDisplayName = getDisplayName(valueIndex, value) ?: "$valueIndex"
            "$valueDisplayName (${theme.name})"
        }
        .toList()

    override fun getDisplayName(index: Int): String {
        return displayNames[index]
    }
}
