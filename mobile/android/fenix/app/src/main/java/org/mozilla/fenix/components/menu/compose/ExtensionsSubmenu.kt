/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import mozilla.components.feature.addons.Addon
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.compose.header.SubmenuHeader
import org.mozilla.fenix.compose.Divider
import org.mozilla.fenix.compose.annotation.LightDarkPreview
import org.mozilla.fenix.compose.list.TextListItem
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme

internal const val EXTENSIONS_MENU_ROUTE = "extensions_menu"

@Composable
internal fun ExtensionsSubmenu(
    recommendedAddons: List<Addon>,
    onBackButtonClick: () -> Unit,
    onManageExtensionsMenuClick: () -> Unit,
    onAddonClick: (Addon) -> Unit,
    onInstallAddonClick: (Addon) -> Unit,
    onDiscoverMoreExtensionsMenuClick: () -> Unit,
) {
    MenuScaffold(
        header = {
            SubmenuHeader(
                header = stringResource(id = R.string.browser_menu_extensions),
                onClick = onBackButtonClick,
            )
        },
    ) {
        MenuGroup {
            MenuItem(
                label = stringResource(id = R.string.browser_menu_manage_extensions),
                beforeIconPainter = painterResource(id = R.drawable.mozac_ic_extension_cog_24),
                onClick = onManageExtensionsMenuClick,
            )
        }

        RecommendedAddons(
            recommendedAddons = recommendedAddons,
            onAddonClick = onAddonClick,
            onInstallAddonClick = onInstallAddonClick,
            onDiscoverMoreExtensionsMenuClick = onDiscoverMoreExtensionsMenuClick,
        )
    }
}

@Composable
private fun RecommendedAddons(
    recommendedAddons: List<Addon>,
    onAddonClick: (Addon) -> Unit,
    onInstallAddonClick: (Addon) -> Unit,
    onDiscoverMoreExtensionsMenuClick: () -> Unit,
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(id = R.string.mozac_feature_addons_recommended_section),
                modifier = Modifier.weight(1f),
                color = FirefoxTheme.colors.textSecondary,
                style = FirefoxTheme.typography.subtitle2,
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        MenuGroup {
            for (addon in recommendedAddons) {
                AddonMenuItem(
                    addon = addon,
                    onClick = { onAddonClick(addon) },
                    onIconClick = { onInstallAddonClick(addon) },
                )

                Divider(color = FirefoxTheme.colors.borderSecondary)
            }

            TextListItem(
                label = stringResource(id = R.string.browser_menu_discover_more_extensions),
                onClick = onDiscoverMoreExtensionsMenuClick,
                iconPainter = painterResource(R.drawable.mozac_ic_external_link_24),
                iconTint = FirefoxTheme.colors.iconSecondary,
            )
        }
    }
}

@LightDarkPreview
@Composable
private fun ExtensionsSubmenuPreview() {
    FirefoxTheme {
        Column(
            modifier = Modifier.background(color = FirefoxTheme.colors.layer3),
        ) {
            ExtensionsSubmenu(
                recommendedAddons = listOf(
                    Addon(
                        id = "id",
                        translatableName = mapOf(Addon.DEFAULT_LOCALE to "name"),
                        translatableDescription = mapOf(Addon.DEFAULT_LOCALE to "description"),
                        translatableSummary = mapOf(Addon.DEFAULT_LOCALE to "summary"),
                    ),
                    Addon(
                        id = "id",
                        translatableName = mapOf(Addon.DEFAULT_LOCALE to "name"),
                        translatableDescription = mapOf(Addon.DEFAULT_LOCALE to "description"),
                        translatableSummary = mapOf(Addon.DEFAULT_LOCALE to "summary"),
                    ),
                ),
                onBackButtonClick = {},
                onManageExtensionsMenuClick = {},
                onAddonClick = {},
                onInstallAddonClick = {},
                onDiscoverMoreExtensionsMenuClick = {},
            )
        }
    }
}

@Preview
@Composable
private fun ExtensionsSubmenuPrivatePreview() {
    FirefoxTheme(theme = Theme.Private) {
        Column(
            modifier = Modifier.background(color = FirefoxTheme.colors.layer3),
        ) {
            ExtensionsSubmenu(
                recommendedAddons = listOf(
                    Addon(
                        id = "id",
                        translatableName = mapOf(Addon.DEFAULT_LOCALE to "name"),
                        translatableDescription = mapOf(Addon.DEFAULT_LOCALE to "description"),
                        translatableSummary = mapOf(Addon.DEFAULT_LOCALE to "summary"),
                    ),
                    Addon(
                        id = "id",
                        translatableName = mapOf(Addon.DEFAULT_LOCALE to "name"),
                        translatableDescription = mapOf(Addon.DEFAULT_LOCALE to "description"),
                        translatableSummary = mapOf(Addon.DEFAULT_LOCALE to "summary"),
                    ),
                ),
                onBackButtonClick = {},
                onManageExtensionsMenuClick = {},
                onAddonClick = {},
                onInstallAddonClick = {},
                onDiscoverMoreExtensionsMenuClick = {},
            )
        }
    }
}
