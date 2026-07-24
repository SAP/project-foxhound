/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.cfrs

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewParameter
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.OutlinedButton
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.SwitchListItem
import org.mozilla.fenix.nimbus.FxNimbus
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme

/**
 * CFR Tools UI that allows for the CFR states to be reset.
 *
 * @param cfrToolsStore [CfrToolsStore] used to access [CfrToolsState].
 * CFR toggles will be shown or not.
 */
@Composable
fun CfrTools(
    cfrToolsStore: CfrToolsStore,
) {
    Surface {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(vertical = FirefoxTheme.layout.space.dynamic400),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic400),
        ) {
            ResetCfrTool(
                cfrToolsStore = cfrToolsStore,
            )
        }
    }
}

@Suppress("LongMethod")
@Composable
private fun ResetCfrTool(
    cfrToolsStore: CfrToolsStore,
) {
    val cfrPreferences by cfrToolsStore.stateFlow.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic400),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FirefoxTheme.layout.space.dynamic400),
        ) {
            Text(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_title),
                style = FirefoxTheme.typography.headline5,
            )

            Spacer(modifier = Modifier.height(height = FirefoxTheme.layout.space.dynamic100))

            Text(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_description),
                style = FirefoxTheme.typography.caption,
            )

            Spacer(modifier = Modifier.height(height = FirefoxTheme.layout.space.dynamic150))

            OutlinedButton(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_timestamp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                cfrToolsStore.dispatch(CfrToolsAction.ResetLastCFRTimestampButtonClicked)
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic150),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_homepage_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_homepage_searchbar_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_homepage_searchbar_description),
                checked = cfrPreferences.homepageSearchBarShown,
                enabled = FxNimbus.features.encourageSearchCfr.value().enabled,
                onCfrToggle = {
                    cfrToolsStore.dispatch(CfrToolsAction.HomepageSearchBarShownToggled)
                },
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic150),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_tabs_tray_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_inactive_tabs_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_inactive_tabs_description),
                checked = cfrPreferences.inactiveTabsShown,
                onCfrToggle = {
                    cfrToolsStore.dispatch(CfrToolsAction.InactiveTabsShownToggled)
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_tab_auto_close_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_tab_auto_close_description),
                checked = cfrPreferences.tabAutoCloseBannerShown,
                onCfrToggle = {
                    cfrToolsStore.dispatch(CfrToolsAction.TabAutoCloseBannerShownToggled)
                },
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic150),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_toolbar_cfr_title),
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic150),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_other_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_open_in_app_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_open_in_app_description),
                checked = cfrPreferences.openInAppShown,
                onCfrToggle = {
                    cfrToolsStore.dispatch(CfrToolsAction.OpenInAppShownToggled)
                },
            )
        }

        Spacer(modifier = Modifier.height(FirefoxTheme.layout.space.dynamic400))
    }
}

/**
 * The UI for a CFR Toggle, which consists of a title, an optional description, and a switch.
 *
 * @param title The title of the CFR.
 * @param description The description of the CFR.
 * @param checked Whether the CFR has already been triggered and shown to the user.
 * @param enabled Whether the CFR toggle is enabled.
 * @param onCfrToggle Invoked when the user clicks to toggle the visibility of a CFR.
 */
@Composable
private fun CfrToggle(
    title: String,
    description: String,
    checked: Boolean,
    enabled: Boolean = true,
    onCfrToggle: () -> Unit,
) {
    SwitchListItem(
        label = title,
        checked = checked,
        modifier = Modifier.padding(horizontal = FirefoxTheme.layout.space.dynamic400),
        description = description,
        maxDescriptionLines = Int.MAX_VALUE,
        maxLabelLines = Int.MAX_VALUE,
        enabled = enabled,
        showSwitchAfter = true,
    ) {
        onCfrToggle()
    }
}

/**
 * The UI for a section title on the CFR Tools page.
 *
 * @param text The text for a section of CFRs.
 */
@Composable
private fun CfrSectionTitle(
    text: String,
) {
    Text(
        text = text,
        modifier = Modifier.padding(horizontal = FirefoxTheme.layout.space.dynamic400),
        color = MaterialTheme.colorScheme.tertiary,
        style = FirefoxTheme.typography.headline6,
    )
}

@Composable
@FlexibleWindowPreview
private fun CfrToolsPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        CfrTools(
            cfrToolsStore = CfrToolsStore(),
        )
    }
}
