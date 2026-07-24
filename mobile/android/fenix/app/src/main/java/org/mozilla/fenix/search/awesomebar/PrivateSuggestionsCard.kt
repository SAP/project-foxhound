/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search.awesomebar

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.TextButton
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * Card asking the user to allow search suggestions in private mode.
 *
 * @param onSearchSuggestionsInPrivateModeAllowed Callback to be invoked when the user allows
 * search suggestions in private mode.
 * @param onSearchSuggestionsInPrivateModeBlocked Callback to be invoked when the user blocks
 * search suggestions in private mode.
 * @param onLearnMoreClick Callback to be invoked when the user clicks on the learn more link.
 */

@Composable
internal fun PrivateSuggestionsCard(
    onSearchSuggestionsInPrivateModeAllowed: () -> Unit = {},
    onSearchSuggestionsInPrivateModeBlocked: () -> Unit = {},
    onLearnMoreClick: () -> Unit = {},
) {
    Surface {
        Column {
            Row(
                modifier = Modifier.padding(
                    top = 20.dp,
                    start = 20.dp,
                    end = 20.dp,
                    bottom = 10.dp,
                ),
            ) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_information_24),
                    contentDescription = null,
                )

                Spacer(modifier = Modifier.width(8.dp))

                Column {
                    Text(
                        text = stringResource(R.string.search_suggestions_onboarding_title),
                        style = FirefoxTheme.typography.subtitle1,
                        maxLines = 2,
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = stringResource(
                            R.string.search_suggestions_onboarding_text,
                            stringResource(R.string.app_name),
                        ),
                        style = FirefoxTheme.typography.body2,
                        maxLines = 2,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    LinkText(
                        text = stringResource(id = R.string.exceptions_empty_message_learn_more_link),
                        linkTextStates = listOf(
                            LinkTextState(
                                text = stringResource(id = R.string.exceptions_empty_message_learn_more_link),
                                url = "",
                                onClick = { onLearnMoreClick() },
                            ),
                        ),
                        linkTextColor = MaterialTheme.colorScheme.tertiary,
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                    ) {
                        TextButton(
                            text = stringResource(R.string.search_suggestions_onboarding_do_not_allow_button),
                            onClick = onSearchSuggestionsInPrivateModeBlocked,
                        )

                        FilledButton(
                            text = stringResource(R.string.search_suggestions_onboarding_allow_button),
                            onClick = onSearchSuggestionsInPrivateModeAllowed,
                        )
                    }
                }
            }

            HorizontalDivider()
        }
    }
}

@Preview
@Composable
private fun PrivateSuggestionsCardPreview() {
    FirefoxTheme(theme = Theme.Private) {
        PrivateSuggestionsCard()
    }
}
