/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.trustpanel.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.LinkText
import mozilla.components.compose.base.LinkTextState
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem.CheckableItem
import mozilla.components.compose.base.text.Text
import mozilla.components.compose.base.text.value
import mozilla.components.compose.base.theme.surfaceDimVariant
import mozilla.components.support.utils.CertificateUtils
import org.mozilla.fenix.R
import org.mozilla.fenix.components.menu.compose.IPProtectionMenuItem
import org.mozilla.fenix.components.menu.compose.MenuBadgeItem
import org.mozilla.fenix.components.menu.compose.MenuGroup
import org.mozilla.fenix.components.menu.compose.MenuItem
import org.mozilla.fenix.components.menu.compose.MenuItemState
import org.mozilla.fenix.components.menu.compose.MenuScaffold
import org.mozilla.fenix.components.menu.compose.MenuTextItem
import org.mozilla.fenix.components.menu.store.IPProtectionMenuState
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

private val BANNER_IMAGE_SIZE = 80.dp
private val GradientAISubtleStop2Light = Color(0xFFE9DAFB)
private val GradientAISubtleStop3Light = Color(0xFFFFE3CE)
private val GradientAISubtleStop2Dark = Color(0xFFAB71FF)
private val GradientAISubtleStop3Dark = Color(0xFFFF8A50)

private const val DROPDOWN_TEXT_WIDTH_FRACTION = 0.5f

@Suppress("LongParameterList")
@Composable
internal fun ProtectionPanel(
    websiteInfoState: WebsiteInfoState,
    ipProtectionMenuState: IPProtectionMenuState,
    icon: Bitmap?,
    isTrackingProtectionEnabled: Boolean,
    isGlobalTrackingProtectionEnabled: Boolean,
    isLocalPdf: Boolean,
    showIPProtection: Boolean,
    numberOfTrackersBlocked: Int,
    websitePermissions: List<WebsitePermission>,
    onTrackerBlockedMenuClick: () -> Unit,
    onTrackingProtectionToggleClick: () -> Unit,
    onClearSiteDataMenuClick: () -> Unit,
    onPrivacySecuritySettingsClick: () -> Unit,
    onAutoplayValueClick: (AutoplayValue) -> Unit,
    onToggleablePermissionClick: (WebsitePermission.Toggleable) -> Unit,
    onViewCertificateClick: () -> Unit,
    onViewQWACClick: () -> Unit,
    onIPProtectionToggle: () -> Unit,
    onIPProtectionNavigate: () -> Unit,
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
        TrackingProtectionHeader(
            websiteIsSecured = websiteInfoState.isSecured,
            isLocalPdf = isLocalPdf,
            isTrackingProtectionEnabled = isTrackingProtectionEnabled,
            isGlobalTrackingProtectionEnabled = isGlobalTrackingProtectionEnabled,
            numberOfTrackersBlocked = numberOfTrackersBlocked,
            onTrackerBlockedMenuClick = onTrackerBlockedMenuClick,
        )

        TrackingProtectionMenuGroup(
            isLocalPdf = isLocalPdf,
            isGlobalTrackingProtectionEnabled = isGlobalTrackingProtectionEnabled,
            isSiteProtectionEnabled = isSiteProtectionEnabled,
            onTrackingProtectionToggleClick = onTrackingProtectionToggleClick,
        )

        IPProtectionMenuGroup(
            visible = showIPProtection,
            ipProtectionMenuState = ipProtectionMenuState,
            onIPProtectionToggle = onIPProtectionToggle,
            onIPProtectionNavigate = onIPProtectionNavigate,
        )

        ConnectionSecurityMenuGroup(
            websiteInfoState = websiteInfoState,
            isLocalPdf = isLocalPdf,
            onViewCertificateClick = onViewCertificateClick,
            onViewQWACClick = onViewQWACClick,
        )

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
private fun TrackingProtectionHeader(
    isLocalPdf: Boolean,
    isGlobalTrackingProtectionEnabled: Boolean,
    websiteIsSecured: Boolean,
    isTrackingProtectionEnabled: Boolean,
    numberOfTrackersBlocked: Int,
    onTrackerBlockedMenuClick: () -> Unit,
) {
    ProtectionPanelBanner(
        isSecured = websiteIsSecured || isLocalPdf,
        isTrackingProtectionEnabled = isGlobalTrackingProtectionEnabled &&
            (isTrackingProtectionEnabled || isLocalPdf),
        numberOfTrackersBlocked = numberOfTrackersBlocked,
        onClick = onTrackerBlockedMenuClick.takeIf { numberOfTrackersBlocked > 0 },
    )
}

@Composable
private fun TrackingProtectionMenuGroup(
    isLocalPdf: Boolean,
    isGlobalTrackingProtectionEnabled: Boolean,
    isSiteProtectionEnabled: Boolean,
    onTrackingProtectionToggleClick: () -> Unit,
) {
    MenuGroup {
        if (!isLocalPdf) {
            TrackingProtectionToggleItem(
                isSiteProtectionEnabled = isSiteProtectionEnabled,
                isGlobalTrackingProtectionEnabled = isGlobalTrackingProtectionEnabled,
                onTrackingProtectionToggleClick = onTrackingProtectionToggleClick,
            )
            TrackersBlockedMenuItem(
                isSiteProtectionEnabled = isSiteProtectionEnabled,
            )
        }
    }
}

@Composable
private fun TrackingProtectionToggleItem(
    isSiteProtectionEnabled: Boolean,
    isGlobalTrackingProtectionEnabled: Boolean,
    onTrackingProtectionToggleClick: () -> Unit,
) {
    val description = if (isSiteProtectionEnabled) {
        stringResource(id = R.string.protection_panel_etp_toggle_enabled_description_2)
    } else {
        stringResource(id = R.string.protection_panel_etp_toggle_disabled_description_2)
    }
    val badgeText = if (isSiteProtectionEnabled) {
        stringResource(id = R.string.protection_panel_etp_toggle_on)
    } else {
        stringResource(id = R.string.protection_panel_etp_toggle_off)
    }

    MenuBadgeItem(
        label = stringResource(id = R.string.protection_panel_etp_toggle_label),
        checked = isSiteProtectionEnabled,
        description = description,
        badgeText = badgeText,
        enabled = isGlobalTrackingProtectionEnabled,
        onClick = onTrackingProtectionToggleClick,
    )
}

@Composable
private fun TrackersBlockedMenuItem(
    isSiteProtectionEnabled: Boolean,
) {
    if (!isSiteProtectionEnabled) {
        MenuItem(
            label = stringResource(id = R.string.protection_panel_etp_disabled_no_trackers_blocked),
            beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_shield_slash_critical_24),
            state = MenuItemState.CRITICAL,
        )
    }
}

@Composable
private fun ConnectionSecurityMenuGroup(
    websiteInfoState: WebsiteInfoState,
    isLocalPdf: Boolean,
    onViewCertificateClick: () -> Unit,
    onViewQWACClick: () -> Unit,
) {
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
            websiteInfoState.qwac?.let {
                MenuTextItem(
                    label = stringResource(
                        id = R.string.connection_security_panel_issued_to,
                        CertificateUtils.subjectOrganization(it) ?: "",
                    ),
                    description = stringResource(id = R.string.connection_security_panel_qualified_certificate),
                    onClick = onViewQWACClick,
                )
            }
        } else {
            MenuItem(
                label = stringResource(id = R.string.connection_security_panel_not_secure),
                beforeIconPainter = painterResource(id = iconsR.drawable.mozac_ic_lock_slash_critical_24),
                state = MenuItemState.CRITICAL,
            )
        }
    }
}

@Composable
private fun IPProtectionMenuGroup(
    visible: Boolean,
    ipProtectionMenuState: IPProtectionMenuState,
    onIPProtectionToggle: () -> Unit,
    onIPProtectionNavigate: () -> Unit,
) {
    if (visible) {
        MenuGroup {
            IPProtectionMenuItem(
                state = ipProtectionMenuState,
                onToggle = onIPProtectionToggle,
                onNavigate = onIPProtectionNavigate,
            )
        }
    }
}

@Immutable
private data class ProtectionPanelBannerContent(
    val imageId: Int,
    val title: String,
    val description: String?,
    val backgroundColor: Color,
    val isGradient: Boolean = false,
)

@Composable
private fun protectionPanelBannerContent(
    isSecured: Boolean,
    isTrackingProtectionEnabled: Boolean,
    numberOfTrackersBlocked: Int,
): ProtectionPanelBannerContent {
    val defaultBackground = MaterialTheme.colorScheme.surfaceDimVariant
    val appName = stringResource(id = R.string.app_name_firefox)
    val protectedTitle = stringResource(id = R.string.protection_panel_banner_protected_title, appName)
    return when {
        !isSecured -> ProtectionPanelBannerContent(
            imageId = R.drawable.protection_panel_not_secure,
            title = stringResource(id = R.string.protection_panel_banner_not_secure_title),
            description = stringResource(id = R.string.protection_panel_banner_not_secure_description),
            backgroundColor = defaultBackground,
        )
        !isTrackingProtectionEnabled -> ProtectionPanelBannerContent(
            imageId = R.drawable.protection_panel_not_protected,
            title = stringResource(id = R.string.protection_panel_banner_not_protected_title),
            description = stringResource(
                id = R.string.protection_panel_banner_not_protected_description,
                appName,
            ),
            backgroundColor = MaterialTheme.colorScheme.surfaceContainerHighest,
        )
        else -> ProtectionPanelBannerContent(
            imageId = R.drawable.kit_head_protection_blocker_banner,
            title = protectedTitle,
            description = if (numberOfTrackersBlocked > 0) {
                pluralStringResource(
                    id = R.plurals.protection_panel_banner_protected_blocked_trackers_description,
                    count = numberOfTrackersBlocked,
                    numberOfTrackersBlocked,
                )
            } else {
                stringResource(id = R.string.protection_panel_banner_protected_no_blocked_trackers_description)
            },
            backgroundColor = defaultBackground,
            isGradient = true,
        )
    }
}

@Composable
private fun ProtectionPanelBanner(
    isSecured: Boolean,
    isTrackingProtectionEnabled: Boolean,
    numberOfTrackersBlocked: Int,
    onClick: (() -> Unit)? = null,
) {
    val content = protectionPanelBannerContent(
        isSecured = isSecured,
        isTrackingProtectionEnabled = isTrackingProtectionEnabled,
        numberOfTrackersBlocked = numberOfTrackersBlocked,
    )
    val mergedContentDescription = if (content.description == null) {
        content.title
    } else {
        "${content.title}. ${content.description}"
    }
    val bannerModifier = Modifier
        .fillMaxWidth()
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
        .clearAndSetSemantics {
            contentDescription = mergedContentDescription
            if (onClick != null) {
                role = Role.Button
                onClick { onClick(); true }
            }
        }

    if (content.isGradient) {
        ProtectionPanelGradientBanner(
            title = content.title,
            description = content.description,
            imageId = content.imageId,
            modifier = bannerModifier,
        )
    } else {
        Card(
            modifier = bannerModifier,
            colors = CardDefaults.cardColors(containerColor = content.backgroundColor),
            shape = BANNER_ROUNDED_CORNER_SHAPE,
        ) {
            ProtectionPanelBannerRow(content = content, showChevron = onClick != null)
        }
    }
}

@Composable
private fun BannerTexts(title: String, description: String?) {
    Text(text = title, style = FirefoxTheme.typography.headline7)
    if (description != null) {
        Text(text = description, style = FirefoxTheme.typography.body2)
    }
}

@Composable
private fun ProtectionPanelBannerRow(
    content: ProtectionPanelBannerContent,
    showChevron: Boolean,
) {
    Row(
        modifier = Modifier.padding(horizontal = FirefoxTheme.layout.space.static200),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Image(
            modifier = Modifier.size(BANNER_IMAGE_SIZE),
            painter = painterResource(id = content.imageId),
            contentDescription = null,
        )

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.onSurface) {
                BannerTexts(title = content.title, description = content.description)
            }
        }

        if (showChevron) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_chevron_right_24),
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun ProtectionPanelGradientBanner(
    title: String,
    description: String?,
    imageId: Int,
    modifier: Modifier = Modifier,
) {
    val (stop2, stop3) = if (isSystemInDarkTheme()) {
        GradientAISubtleStop2Dark to GradientAISubtleStop3Dark
    } else {
        GradientAISubtleStop2Light to GradientAISubtleStop3Light
    }
    Box(
        modifier = Modifier
            .clip(MaterialTheme.shapes.extraLarge)
            .background(
                brush = Brush.horizontalGradient(listOf(stop2, stop3)),
            )
            .then(modifier),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = FirefoxTheme.layout.space.static200),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier
                    .padding(vertical = FirefoxTheme.layout.space.static150)
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                BannerTexts(title = title, description = description)
            }

            Image(
                painter = painterResource(id = imageId),
                contentDescription = null,
                modifier = Modifier.size(BANNER_IMAGE_SIZE),
            )
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
                color = MaterialTheme.colorScheme.onSurface,
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
                ipProtectionMenuState = IPProtectionMenuState(),
                icon = null,
                isTrackingProtectionEnabled = true,
                isGlobalTrackingProtectionEnabled = true,
                isLocalPdf = false,
                showIPProtection = true,
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
                onViewQWACClick = {},
                onIPProtectionToggle = {},
                onIPProtectionNavigate = {},
            )
        }
    }
}
