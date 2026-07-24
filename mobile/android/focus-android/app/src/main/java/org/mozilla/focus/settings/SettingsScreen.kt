/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import org.mozilla.focus.R
import org.mozilla.focus.state.Screen
import org.mozilla.focus.ui.theme.focusTypography

/**
 * The main settings screen, displaying a list of top-level setting categories.
 * Each category, when clicked, navigates to its respective detailed settings page.
 *
 * @param onSettingClick A lambda function that is invoked when a setting category is clicked.
 * It passes the corresponding [Screen.Settings.Page] to the caller, which is responsible
 * for handling the navigation to the detailed settings screen.
 */
@Composable
fun SettingsScreen(onSettingClick: (Screen.Settings.Page) -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        SettingItem(
            title = R.string.preference_category_general,
            summary = stringResource(id = R.string.preference_general_summary2),
            onClick = { onSettingClick(Screen.Settings.Page.General) },
        )
        SettingItem(
            title = R.string.preference_privacy_and_security_header,
            summary = stringResource(id = R.string.preference_privacy_and_security_summary),
            onClick = { onSettingClick(Screen.Settings.Page.Privacy) },
        )
        SettingItem(
            title = R.string.preference_category_search,
            summary = stringResource(id = R.string.preference_search_summary),
            onClick = { onSettingClick(Screen.Settings.Page.Search) },
        )
        SettingItem(
            title = R.string.preference_category_advanced,
            summary = stringResource(id = R.string.preference_advanced_summary),
            onClick = { onSettingClick(Screen.Settings.Page.Advanced) },
        )
        SettingItem(
            title = R.string.preference_category_mozilla,
            summary = stringResource(
                id = R.string.preference_mozilla_summary,
                stringResource(id = R.string.app_name),
            ),
            onClick = { onSettingClick(Screen.Settings.Page.Mozilla) },
        )
    }
}

@Composable
private fun SettingItem(
    @StringRes title: Int,
    summary: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = stringResource(id = title),
                style = focusTypography.preferenceTitle,
            )
            Text(
                text = summary,
                style = focusTypography.preferenceSummary,
            )
        }
    }
}
