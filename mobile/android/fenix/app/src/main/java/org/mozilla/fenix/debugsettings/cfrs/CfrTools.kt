/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.cfrs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.lib.state.ext.observeAsState
import org.mozilla.fenix.R
import org.mozilla.fenix.components.toolbar.navbar.shouldAddNavigationBar
import org.mozilla.fenix.compose.SwitchWithLabel
import org.mozilla.fenix.compose.button.SecondaryButton
import org.mozilla.fenix.nimbus.FxNimbus
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * CFR Tools UI that allows for the CFR states to be reset.
 *
 * @param cfrToolsStore [CfrToolsStore] used to access [CfrToolsState].
 * @param isNavigationBarShown Whether the navigation bar is shown or not navigation bar
 * CFR toggles will be shown or not.
 */
@Composable
fun CfrTools(
    cfrToolsStore: CfrToolsStore,
    isNavigationBarShown: Boolean = LocalContext.current.shouldAddNavigationBar(),
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = FirefoxTheme.layout.space.dynamic400),
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.dynamic400),
    ) {
        ResetCfrTool(
            cfrToolsStore = cfrToolsStore,
            shouldAddNavigationBar = isNavigationBarShown,
        )
    }
}

@Suppress("LongMethod")
@Composable
private fun ResetCfrTool(
    cfrToolsStore: CfrToolsStore,
    shouldAddNavigationBar: Boolean,
) {
    val cfrPreferences by cfrToolsStore.observeAsState(initialValue = cfrToolsStore.state) { state ->
        state
    }

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
                color = FirefoxTheme.colors.textPrimary,
                style = FirefoxTheme.typography.headline5,
            )

            Spacer(modifier = Modifier.height(height = FirefoxTheme.layout.space.dynamic100))

            Text(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_description),
                color = FirefoxTheme.colors.textPrimary,
                style = FirefoxTheme.typography.caption,
            )

            Spacer(modifier = Modifier.height(height = FirefoxTheme.layout.space.dynamic150))

            SecondaryButton(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_timestamp),
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

            if (shouldAddNavigationBar) {
                CfrToggle(
                    title = stringResource(R.string.debug_drawer_cfr_tools_homepage_nav_toolbar_title),
                    description = stringResource(R.string.debug_drawer_cfr_tools_homepage_nav_toolbar_description),
                    checked = cfrPreferences.homepageNavToolbarShown,
                    onCfrToggle = {
                        cfrToolsStore.dispatch(CfrToolsAction.HomepageNavToolbarShownToggled)
                    },
                )
            }

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_homepage_searchbar_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_homepage_searchbar_description),
                checked = cfrPreferences.homepageSearchBarShown,
                enabled = FxNimbus.features.encourageSearchCfr.value().enabled,
                onCfrToggle = {
                    cfrToolsStore.dispatch(CfrToolsAction.HomepageSearchBarShownToggled)
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_homepage_sync_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_homepage_sync_description),
                checked = cfrPreferences.homepageSyncShown,
                onCfrToggle = {
                    cfrToolsStore.dispatch(CfrToolsAction.HomepageSyncShownToggled)
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

            if (shouldAddNavigationBar) {
                CfrToggle(
                    title = stringResource(R.string.debug_drawer_cfr_tools_navigation_buttons_title),
                    description = stringResource(R.string.debug_drawer_cfr_tools_navigation_buttons_description),
                    checked = cfrPreferences.navButtonsShown,
                    enabled = false,
                    onCfrToggle = {
                        cfrToolsStore.dispatch(CfrToolsAction.NavButtonsShownToggled)
                    },
                )
            }
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
    SwitchWithLabel(
        label = title,
        checked = checked,
        modifier = Modifier.padding(horizontal = FirefoxTheme.layout.space.dynamic400),
        description = description,
        enabled = enabled,
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
        color = FirefoxTheme.colors.textAccent,
        style = FirefoxTheme.typography.headline6,
    )
}

@Composable
@FlexibleWindowLightDarkPreview
private fun CfrToolsPreview() {
    FirefoxTheme {
        Column(
            modifier = Modifier.background(
                color = FirefoxTheme.colors.layer1,
            ),
        ) {
            CfrTools(
                cfrToolsStore = CfrToolsStore(),
                isNavigationBarShown = true,
            )
        }
    }
}
