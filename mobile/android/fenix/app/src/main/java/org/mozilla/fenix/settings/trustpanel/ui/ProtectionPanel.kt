/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.trustpanel.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem.CheckableItem
import mozilla.components.compose.base.text.Text
import mozilla.components.compose.base.text.value
import mozilla.components.compose.base.theme.surfaceDimVariant
import mozilla.components.support.utils.CertificateUtils
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.compose.MenuBadgeItem
import org.mozilla.fenix.components.menu.compose.MenuGroup
import org.mozilla.fenix.components.menu.compose.MenuItem
import org.mozilla.fenix.components.menu.compose.MenuItemState
import org.mozilla.fenix.components.menu.compose.MenuScaffold
import org.mozilla.fenix.compose.LinkText
import org.mozilla.fenix.compose.LinkTextState
import org.mozilla.fenix.settings.PhoneFeature
import org.mozilla.fenix.settings.trustpanel.store.AutoplayValue
import org.mozilla.fenix.settings.trustpanel.store.WebsiteInfoState
import org.mozilla.fenix.settings.trustpanel.store.WebsitePermission
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.ui.icons.R as iconsR

private val BANNER_ROUNDED_CORNER_SHAPE = RoundedCornerShape(
    topStart = 28.dp,
    topEnd = 28.dp,
    bottomStart = 4.dp,
    bottomEnd = 4.dp,
)

private const val DROPDOWN_TEXT_WIDTH_FRACTION = 0.5f

@Suppress("LongParameterList", "LongMethod", "CognitiveComplexMethod")
@Composable
internal fun ProtectionPanel(
    websiteInfoState: WebsiteInfoState,
    icon: Bitmap?,
    isTrackingProtectionEnabled: Boolean,
    isGlobalTrackingProtectionEnabled: Boolean,
    isLocalPdf: Boolean,
    numberOfTrackersBlocked: Int,
    websitePermissions: List<WebsitePermission>,
    onTrackerBlockedMenuClick: () -> Unit,
    onTrackingProtectionToggleClick: () -> Unit,
    onClearSiteDataMenuClick: () -> Unit,
    onPrivacySecuritySettingsClick: () -> Unit,
    onAutoplayValueClick: (AutoplayValue) -> Unit,
    onToggleablePermissionClick: (WebsitePermission.Toggleable) -> Unit,
    onViewCertificateClick: () -> Unit,
) {
    val isSiteProtectionEnabled = isTrackingProtectionEnabled && isGlobalTrackingProtectionEnabled
    MenuScaffold(
        header = {
            ProtectionPanelHeader(
                websiteInfoState = websiteInfoState,
                icon = icon,
            )
        },
    ) {
        MenuGroup {
            ProtectionPanelBanner(
                isSecured = websiteInfoState.isSecured || isLocalPdf,
                isTrackingProtectionEnabled = isGlobalTrackingProtectionEnabled &&
                        (isTrackingProtectionEnabled || isLocalPdf),
            )

            if (!isLocalPdf) {
                MenuBadgeItem(
                    label = stringResource(id = R.string.protection_panel_etp_toggle_label),
                    checked = isSiteProtectionEnabled,
                    description = if (isSiteProtectionEnabled) {
                        stringResource(id = R.string.protection_panel_etp_toggle_enabled_description_2)
                    } else {
                        stringResource(id = R.string.protection_panel_etp_toggle_disabled_description_2)
                    },
                    badgeText = if (isSiteProtectionEnabled) {
                        stringResource(id = R.string.protection_panel_etp_toggle_on)
                    } else {
                        stringResource(id = R.string.protection_panel_etp_toggle_off)
                    },
                    enabled = isGlobalTrackingProtectionEnabled,
                    onClick = onTrackingProtectionToggleClick,
                )

                if (!(isSiteProtectionEnabled)) {
                    MenuItem(
                        label = stringResource(id = R.string.protection_panel_etp_disabled_no_trackers_blocked),
                        beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_shield_slash_critical_24),
                        state = MenuItemState.CRITICAL,
                    )
                } else if (numberOfTrackersBlocked == 0) {
                    MenuItem(
                        label = stringResource(id = R.string.protection_panel_no_trackers_blocked),
                        beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_shield_checkmark_24),
                    )
                } else {
                    MenuItem(
                        label = stringResource(
                            id = R.string.protection_panel_num_trackers_blocked,
                            numberOfTrackersBlocked,
                        ),
                        beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_shield_checkmark_24),
                        onClick = onTrackerBlockedMenuClick,
                        afterIconPainter = painterResource(id = iconsR.drawable.mozac_ic_chevron_right_24),
                    )
                }
            }
        }

        MenuGroup {
            if (isLocalPdf) {
                MenuItem(
                    label = stringResource(id = R.string.connection_security_panel_local_pdf),
                    beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_save_file_24),
                )
            } else if (websiteInfoState.isSecured) {
                MenuItem(
                    label = stringResource(id = R.string.connection_security_panel_secure),
                    beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_lock_24),
                    description = stringResource(
                        id = R.string.connection_security_panel_verified_by,
                        CertificateUtils.issuerOrganization(websiteInfoState.certificate) ?: "",
                    ),
                    onClick = onViewCertificateClick,
                )
            } else {
                MenuItem(
                    label = stringResource(id = R.string.connection_security_panel_not_secure),
                    beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_lock_slash_critical_24),
                    state = MenuItemState.CRITICAL,
                )
            }
        }

        if (!isLocalPdf) {
            MenuGroup {
                MenuItem(
                    label = stringResource(id = R.string.clear_site_data),
                    onClick = onClearSiteDataMenuClick,
                    beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_delete_24),
                )
            }
        }

        if (websitePermissions.isNotEmpty()) {
            WebsitePermissionsMenuGroup(
                websitePermissions = websitePermissions,
                onAutoplayValueClick = onAutoplayValueClick,
                onToggleablePermissionClick = onToggleablePermissionClick,
            )
        }

        LinkText(
            text = stringResource(id = R.string.protection_panel_privacy_and_security_settings_2),
            linkTextStates = listOf(
                LinkTextState(
                    text = stringResource(id = R.string.protection_panel_privacy_and_security_settings_2),
                    url = "",
                    onClick = { onPrivacySecuritySettingsClick() },
                ),
            ),
            linkTextColor = MaterialTheme.colorScheme.tertiary,
            linkTextDecoration = TextDecoration.Underline,
        )
    }
}

@Composable
private fun ProtectionPanelBanner(
    isSecured: Boolean,
    isTrackingProtectionEnabled: Boolean,
) {
    var backgroundColor: Color = MaterialTheme.colorScheme.surfaceDimVariant
    val imageId: Int
    val title: String
    val description: String

    if (!isSecured) {
        imageId = R.drawable.protection_panel_not_secure
        title = stringResource(id = R.string.protection_panel_banner_not_secure_title)
        description = stringResource(id = R.string.protection_panel_banner_not_secure_description)
    } else if (!isTrackingProtectionEnabled) {
        backgroundColor = MaterialTheme.colorScheme.surfaceContainerHighest
        imageId = R.drawable.protection_panel_not_protected
        title = stringResource(id = R.string.protection_panel_banner_not_protected_title)
        description = stringResource(
            id = R.string.protection_panel_banner_not_protected_description,
            stringResource(id = R.string.app_name),
        )
    } else {
        imageId = R.drawable.protection_panel_protected
        title = stringResource(
            id = R.string.protection_panel_banner_protected_title,
            stringResource(id = R.string.app_name),
        )
        description = stringResource(id = R.string.protection_panel_banner_protected_description)
    }

    Card(
        modifier = Modifier
            .clearAndSetSemantics {
                contentDescription = "$title. $description"
            }
            .fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        shape = BANNER_ROUNDED_CORNER_SHAPE,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Image(
                modifier = Modifier.size(90.dp),
                painter = painterResource(id = imageId),
                contentDescription = null,
            )

            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.onSurface) {
                    Text(
                        text = title,
                        style = FirefoxTheme.typography.headline7,
                    )

                    Text(
                        text = description,
                        style = FirefoxTheme.typography.body2,
                    )
                }
            }
        }
    }
}

@Composable
@Suppress("CognitiveComplexMethod")
private fun WebsitePermissionsMenuGroup(
    websitePermissions: List<WebsitePermission>,
    onAutoplayValueClick: (AutoplayValue) -> Unit,
    onToggleablePermissionClick: (WebsitePermission.Toggleable) -> Unit,
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            Text(
                text = stringResource(id = R.string.protection_panel_permissions_title),
                color = MaterialTheme.colorScheme.tertiary,
                style = FirefoxTheme.typography.headline8,
            )
        }

        MenuGroup {
            websitePermissions.forEachIndexed { index, websitePermission ->
                val stateDescription: String = when (websitePermission) {
                    is WebsitePermission.Autoplay -> {
                        AutoplayValue.entries.find { it == websitePermission.autoplayValue }?.title?.let {
                            stringResource(
                                it,
                            )
                        } ?: ""
                    }

                    is WebsitePermission.Toggleable -> {
                         if (websitePermission.isBlockedByAndroid) {
                            stringResource(id = R.string.phone_feature_blocked_by_android)
                        } else if (websitePermission.isEnabled) {
                            stringResource(id = R.string.preference_option_phone_feature_allowed)
                        } else {
                            stringResource(id = R.string.preference_option_phone_feature_blocked)
                        }
                    }
                }

                MenuItem(
                    label = stringResource(id = websitePermission.deviceFeature.getLabelId()),
                    beforeIconPainter = painterResource(id = websitePermission.deviceFeature.getIconId()),
                    stateDescription = stateDescription,
                    afterContent = when (websitePermission) {
                        is WebsitePermission.Autoplay -> {
                            { AutoplayDropdownMenu(websitePermission, onAutoplayValueClick) }
                        }

                        is WebsitePermission.Toggleable -> {
                            {
                                WebsitePermissionToggle(
                                    websitePermission,
                                    stateDescription,
                                    onToggleablePermissionClick,
                                )
                            }
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun WebsitePermissionToggle(
    websitePermission: WebsitePermission.Toggleable,
    toggleLabel: String,
    onToggleablePermissionClick: (WebsitePermission.Toggleable) -> Unit,
) {
    Column(
        modifier = Modifier
            .clickable { onToggleablePermissionClick(websitePermission) }
            .semantics { role = Role.Switch },
    ) {
        Text(
            text = toggleLabel,
            modifier = Modifier.fillMaxWidth(DROPDOWN_TEXT_WIDTH_FRACTION),
            color = MaterialTheme.colorScheme.tertiary,
            textAlign = TextAlign.End,
            maxLines = 2,
            style = FirefoxTheme.typography.body1,
        )
    }
}

@Composable
private fun AutoplayDropdownMenu(
    websitePermission: WebsitePermission.Autoplay,
    onAutoplayValueClick: (AutoplayValue) -> Unit,
) {
    val density = LocalDensity.current
    var expanded by remember { mutableStateOf(false) }
    var contextMenuWidthDp by remember { mutableStateOf(0.dp) }

    val dropdownItems = AutoplayValue.entries.map { autoplayValueEntry ->
        CheckableItem(
            text = Text.String(stringResource(id = autoplayValueEntry.title)),
            isChecked = autoplayValueEntry == websitePermission.autoplayValue,
            onClick = { onAutoplayValueClick(autoplayValueEntry) },
        )
    }

    Column(
        modifier = Modifier
            .clickable { expanded = true }
            .semantics { role = Role.DropdownList },
    ) {
        val placeholderText = dropdownItems.find { it.isChecked }?.text?.value ?: ""

        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = placeholderText,
                modifier = Modifier.fillMaxWidth(DROPDOWN_TEXT_WIDTH_FRACTION),
                color = MaterialTheme.colorScheme.tertiary,
                textAlign = TextAlign.End,
                maxLines = 2,
                style = FirefoxTheme.typography.body1,
            )

            Spacer(modifier = Modifier.width(4.dp))

            Box {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_dropdown_arrow),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.tertiary,
                )

                if (expanded) {
                    DropdownMenu(
                        expanded = true,
                        menuItems = dropdownItems,
                        modifier = Modifier
                            .onGloballyPositioned { coordinates ->
                                contextMenuWidthDp = with(density) {
                                    coordinates.size.width.toDp()
                                }
                            },
                        onDismissRequest = { expanded = false },
                    )
                }
            }
        }
    }
}

@PreviewLightDark
@Composable
private fun ProtectionPanelPreview() {
    FirefoxTheme {
        Column(
            modifier = Modifier
                .background(color = MaterialTheme.colorScheme.surface),
        ) {
            ProtectionPanel(
                websiteInfoState = WebsiteInfoState(
                    isSecured = true,
                    websiteUrl = "https://www.mozilla.org",
                    websiteTitle = "Mozilla",
                    certificate = null,
                ),
                icon = null,
                isTrackingProtectionEnabled = true,
                isGlobalTrackingProtectionEnabled = true,
                isLocalPdf = false,
                numberOfTrackersBlocked = 5,
                websitePermissions = listOf(
                    WebsitePermission.Autoplay(
                        AutoplayValue.AUTOPLAY_BLOCK_AUDIBLE,
                        true,
                        PhoneFeature.AUTOPLAY,
                    ),
                ),
                onTrackerBlockedMenuClick = {},
                onTrackingProtectionToggleClick = {},
                onClearSiteDataMenuClick = {},
                onPrivacySecuritySettingsClick = {},
                onAutoplayValueClick = {},
                onToggleablePermissionClick = {},
                onViewCertificateClick = {},
            )
        }
    }
}
