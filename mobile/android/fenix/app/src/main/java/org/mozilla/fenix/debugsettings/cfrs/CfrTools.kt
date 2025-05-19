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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import org.mozilla.fenix.FeatureFlags
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.SwitchWithLabel
import org.mozilla.fenix.compose.annotation.FlexibleWindowLightDarkPreview
import org.mozilla.fenix.theme.FirefoxTheme

/**
 * CFR Tools UI for [DebugDrawer] that allows for the CFR states to be reset.
 */
@Composable
fun CfrTools() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(vertical = FirefoxTheme.space.small),
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.space.small),
    ) {
        ResetCfrTool()
    }
}

@Suppress("LongMethod")
@Composable
private fun ResetCfrTool() {
    var addPrivateTabToHomeCfrShown by rememberSaveable { mutableStateOf(false) }
    var homepageIntroCfrShown by rememberSaveable { mutableStateOf(false) }
    var homepageNavToolbarCfrShown by rememberSaveable { mutableStateOf(false) }
    var homepageSyncCfrShown by rememberSaveable { mutableStateOf(false) }
    var wallpaperSelectorCfrShown by rememberSaveable { mutableStateOf(false) }
    var inactiveTabsCfrShown by rememberSaveable { mutableStateOf(false) }
    var tabAutoCloseBannerCfrShown by rememberSaveable { mutableStateOf(false) }
    var cookieBannerBlockerCfrShown by rememberSaveable { mutableStateOf(false) }
    var cookieBannersPrivateModeCfrShown by rememberSaveable { mutableStateOf(false) }
    var navButtonsCfrShown by rememberSaveable { mutableStateOf(false) }
    var tcpCfrShown by rememberSaveable { mutableStateOf(false) }
    var openInAppCfrShown by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(FirefoxTheme.space.small),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = FirefoxTheme.space.small),
        ) {
            Text(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_title),
                color = FirefoxTheme.colors.textPrimary,
                style = FirefoxTheme.typography.headline5,
            )

            Spacer(modifier = Modifier.height(height = FirefoxTheme.space.xxSmall))

            Text(
                text = stringResource(R.string.debug_drawer_cfr_tools_reset_cfr_description),
                color = FirefoxTheme.colors.textPrimary,
                style = FirefoxTheme.typography.caption,
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.space.xSmall),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_homepage_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_private_mode_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_private_mode_description),
                checked = addPrivateTabToHomeCfrShown,
                onCfrToggle = {
                    addPrivateTabToHomeCfrShown = !addPrivateTabToHomeCfrShown
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_homepage_intro_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_homepage_intro_description),
                checked = homepageIntroCfrShown,
                onCfrToggle = {
                    homepageIntroCfrShown = !homepageIntroCfrShown
                },
            )

            if (FeatureFlags.navigationToolbarEnabled) {
                CfrToggle(
                    title = stringResource(R.string.debug_drawer_cfr_tools_homepage_nav_toolbar_title),
                    description = stringResource(R.string.debug_drawer_cfr_tools_homepage_nav_toolbar_description),
                    checked = homepageNavToolbarCfrShown,
                    onCfrToggle = {
                        homepageNavToolbarCfrShown = !homepageNavToolbarCfrShown
                    },
                )
            }

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_homepage_sync_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_homepage_sync_description),
                checked = homepageSyncCfrShown,
                onCfrToggle = {
                    homepageSyncCfrShown = !homepageSyncCfrShown
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_wallpaper_selector_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_wallpaper_selector_description),
                checked = wallpaperSelectorCfrShown,
                onCfrToggle = {
                    wallpaperSelectorCfrShown = !wallpaperSelectorCfrShown
                },
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.space.xSmall),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_tabs_tray_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_inactive_tabs_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_inactive_tabs_description),
                checked = inactiveTabsCfrShown,
                onCfrToggle = {
                    inactiveTabsCfrShown = !inactiveTabsCfrShown
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_tab_auto_close_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_tab_auto_close_description),
                checked = tabAutoCloseBannerCfrShown,
                onCfrToggle = {
                    tabAutoCloseBannerCfrShown = !tabAutoCloseBannerCfrShown
                },
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.space.xSmall),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_toolbar_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_cookie_banner_blocker_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_cookie_banner_blocker_description),
                checked = cookieBannerBlockerCfrShown,
                onCfrToggle = {
                    cookieBannerBlockerCfrShown = !cookieBannerBlockerCfrShown
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_cookie_banners_private_mode_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_cookie_banners_private_mode_description),
                checked = cookieBannersPrivateModeCfrShown,
                onCfrToggle = {
                    cookieBannersPrivateModeCfrShown = !cookieBannersPrivateModeCfrShown
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_navigation_buttons_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_navigation_buttons_description),
                checked = navButtonsCfrShown,
                onCfrToggle = {
                    navButtonsCfrShown = !navButtonsCfrShown
                },
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_tcp_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_tcp_description),
                checked = tcpCfrShown,
                onCfrToggle = {
                    tcpCfrShown = !tcpCfrShown
                },
            )
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(FirefoxTheme.space.xSmall),
        ) {
            CfrSectionTitle(
                text = stringResource(R.string.debug_drawer_cfr_tools_other_cfr_title),
            )

            CfrToggle(
                title = stringResource(R.string.debug_drawer_cfr_tools_open_in_app_title),
                description = stringResource(R.string.debug_drawer_cfr_tools_open_in_app_description),
                checked = openInAppCfrShown,
                onCfrToggle = {
                    openInAppCfrShown = !openInAppCfrShown
                },
            )
        }

        Spacer(modifier = Modifier.height(FirefoxTheme.space.large))
    }
}

/**
 * The UI for a CFR Toggle, which consists of a title, an optional description, and a switch.
 *
 * @param title The title of the CFR.
 * @param description The description of the CFR.
 * @param checked Whether the CFR has already been triggered and shown to the user.
 * @param onCfrToggle Invoked when the user clicks to toggle the visibility of a CFR.
 */
@Composable
private fun CfrToggle(
    title: String,
    description: String,
    checked: Boolean,
    onCfrToggle: () -> Unit,
) {
    SwitchWithLabel(
        label = title,
        checked = checked,
        modifier = Modifier.padding(horizontal = FirefoxTheme.space.small),
        description = description,
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
        modifier = Modifier.padding(horizontal = FirefoxTheme.space.small),
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
            CfrTools()
        }
    }
}
