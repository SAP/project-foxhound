/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.modifier.animateRotation
import mozilla.components.compose.base.theme.surfaceDimVariant
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.addons.ui.displayName
import mozilla.components.feature.addons.ui.summary
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.MenuDialogTestTag.RECOMMENDED_ADDON_ITEM
import org.mozilla.fenix.components.menu.MenuDialogTestTag.RECOMMENDED_ADDON_ITEM_TITLE
import org.mozilla.fenix.compose.list.FaviconListItem
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

/**
 * An [Addon] menu item.
 *
 * @param addon The [Addon] to display.
 * @param addonInstallationInProgress Whether or not [Addon] installation is in progress.
 * @param iconPainter [Painter] used to display an [Icon] after the list item.
 * @param iconDescription Content description of the icon.
 * @param showDivider Whether or not to display a vertical divider line before the [IconButton]
 * @param index The index of the item within the column.
 * @param onClick Invoked when the user clicks on the item.
 * @param onIconClick Invoked when the user clicks on the icon button.
 */
@Suppress("LongMethod")
@Composable
internal fun AddonMenuItem(
    addon: Addon,
    addonInstallationInProgress: Addon?,
    iconPainter: Painter? = painterResource(id = iconsR.drawable.mozac_ic_plus_24),
    iconDescription: String? = null,
    showDivider: Boolean = true,
    index: Int = 0,
    onClick: () -> Unit,
    onIconClick: () -> Unit,
) {
    val context = LocalContext.current
    val label = addon.displayName(context)
    val description = addon.summary(context)
    val addonIcon = addon.provideIcon()
    val isInstallAddonInProgress = addon == addonInstallationInProgress
    val stateDescription = stringResource(R.string.browser_menu_recommended_extensions_content_description)

    if (addonIcon != null) {
        FaviconListItem(
            label = label,
            url = addon.iconUrl,
            modifier = Modifier
                .testTag(RECOMMENDED_ADDON_ITEM)
                .clip(shape = RoundedCornerShape(4.dp))
                .background(
                    color = MaterialTheme.colorScheme.surfaceDimVariant,
                )
                .semantics {
                    role = Role.Button
                    collectionItemInfo =
                        CollectionItemInfo(
                            rowIndex = index,
                            rowSpan = 1,
                            columnIndex = 0,
                            columnSpan = 1,
                        )
                    this.stateDescription = stateDescription
                },
            labelModifier = Modifier.testTag(RECOMMENDED_ADDON_ITEM_TITLE),
            description = description,
            maxDescriptionLines = 1,
            faviconPainter = BitmapPainter(image = addonIcon.asImageBitmap()),
            onClick = onClick,
            showDivider = showDivider,
            iconPainter = if (isInstallAddonInProgress) {
                painterResource(id = iconsR.drawable.mozac_ic_sync_24)
            } else {
                iconPainter
            },
            iconButtonModifier = Modifier.animateRotation(isInstallAddonInProgress),
            iconDescription = iconDescription ?: stringResource(
                R.string.browser_menu_extension_plus_icon_content_description_2,
                label,
            ),
            onIconClick = onIconClick,
        )
    } else {
        MenuItem(
            label = label,
            beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_extension_24),
            description = description,
            maxDescriptionLines = 1,
            onClick = onClick,
            showDivider = showDivider,
            afterIconPainter = iconPainter,
            afterIconDescription = iconDescription ?: stringResource(
                R.string.browser_menu_extension_plus_icon_content_description_2,
                label,
            ),
            modifier = Modifier.testTag(RECOMMENDED_ADDON_ITEM),
            collectionItemInfo = CollectionItemInfo(
                rowIndex = index,
                rowSpan = 1,
                columnIndex = 0,
                columnSpan = 1,
            ),
            stateDescription = stateDescription,
            labelModifier = Modifier.testTag(RECOMMENDED_ADDON_ITEM_TITLE),
            onAfterIconClick = onIconClick,
        )
    }
}

@PreviewLightDark
@Composable
private fun AddonMenuItemPreview() {
    FirefoxTheme {
        Column(
            modifier = Modifier
                .background(color = MaterialTheme.colorScheme.surface)
                .padding(all = FirefoxTheme.layout.space.static200),
        ) {
            MenuGroup {
                AddonMenuItem(
                    addon = Addon(
                        id = "id",
                        translatableName = mapOf(Addon.DEFAULT_LOCALE to "name"),
                        translatableDescription = mapOf(Addon.DEFAULT_LOCALE to "description"),
                        translatableSummary = mapOf(Addon.DEFAULT_LOCALE to "summary"),
                    ),
                    addonInstallationInProgress = Addon(
                        id = "id",
                        translatableName = mapOf(Addon.DEFAULT_LOCALE to "name"),
                        translatableDescription = mapOf(Addon.DEFAULT_LOCALE to "description"),
                        translatableSummary = mapOf(Addon.DEFAULT_LOCALE to "summary"),
                    ),
                    onClick = {},
                    onIconClick = {},
                )
            }
        }
    }
}
