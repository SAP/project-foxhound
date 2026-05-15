/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.doh.exceptionslist

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.DestructiveButton
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.FaviconListItem
import org.mozilla.fenix.compose.list.IconListItem
import org.mozilla.fenix.settings.doh.DohSettingsState
import org.mozilla.fenix.settings.doh.ProtectionLevel
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * Composable function that displays the exceptions list screen of DoH settings.
 *
 * @param state The current [DohSettingsState].
 * @param onAddExceptionsClicked Invoked when the user wants to add an exception.
 * @param onRemoveClicked Invoked when the user wants to remove a specific exception.
 * @param onRemoveAllClicked Invoked when the user wants to remove all exceptions.
 */
@Composable
internal fun ExceptionsListScreen(
    state: DohSettingsState,
    onAddExceptionsClicked: () -> Unit = {},
    onRemoveClicked: (String) -> Unit = {},
    onRemoveAllClicked: () -> Unit = {},
) {
    Surface {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = stringResource(
                    R.string.preference_doh_exceptions_summary,
                    stringResource(id = R.string.app_name),
                ),
                modifier = Modifier.padding(horizontal = 16.dp),
                color = MaterialTheme.colorScheme.onSurface,
                style = FirefoxTheme.typography.body1,
            )

            Spacer(modifier = Modifier.height(16.dp))

            state.exceptionsList.forEach { exception ->
                FaviconListItem(
                    label = exception,
                    url = exception,
                    iconPainter = painterResource(iconsR.drawable.mozac_ic_cross_24),
                    onIconClick = { onRemoveClicked(exception) },
                )
            }

            IconListItem(
                label = stringResource(R.string.preference_doh_exceptions_add),
                onClick = onAddExceptionsClicked,
                beforeIconPainter = painterResource(iconsR.drawable.mozac_ic_plus_24),
                beforeIconDescription = stringResource(R.string.preference_doh_add_site_description),
            )

            DestructiveButton(
                text = stringResource(R.string.preference_doh_exceptions_remove_all_exceptions),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(
                        vertical = 12.dp,
                        horizontal = 16.dp,
                    ),
                onClick = onRemoveAllClicked,
            )
        }
    }
}

private fun createState() = DohSettingsState(
    allProtectionLevels = listOf(
        ProtectionLevel.Default,
        ProtectionLevel.Increased,
        ProtectionLevel.Max,
        ProtectionLevel.Off,
    ),
    selectedProtectionLevel = ProtectionLevel.Off,
    providers = emptyList(),
    selectedProvider = null,
    exceptionsList = listOf(
        "example1.com",
        "example2.com",
        "example3.com",
    ),
    isUserExceptionValid = true,
)

@FlexibleWindowPreview
@Composable
private fun ExceptionsListScreenPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        ExceptionsListScreen(
            state = createState(),
        )
    }
}
