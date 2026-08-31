/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.acorn.components.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.snackbar.displaySnackbar
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.ui.icons.R as iconsR

private const val CATEGORY_LABEL_WIDTH = 140

/**
 * Displays a catalog of the available Acorn icons grouped by size and category.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IconsScreen(onNavigateUp: () -> Unit = {}) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Icons",
                        style = AcornTheme.typography.headline5,
                    )
                },
                navigationIcon = {
                    IconButton(
                        onClick = onNavigateUp,
                        contentDescription = "Navigate back",
                    ) {
                        Icon(
                            painter = painterResource(iconsR.drawable.mozac_ic_back_24),
                            contentDescription = null,
                        )
                    }
                },
                actions = { ThemeToggleButton() },
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            iconSizeSections.forEach { section ->
                stickyHeader(key = "header-${section.size}") {
                    IconSizeHeader(size = section.size)
                }

                items(section.categories.size, key = { "${section.size}-$it" }) { index ->
                    val (title, icons, tint) = section.categories[index]
                    IconCategoryRow(
                        title = title,
                        icons = icons,
                        tint = tint,
                        onIconClick = { resId ->
                            val name = context.resources.getResourceEntryName(resId)
                            scope.launch {
                                snackbarHostState.currentSnackbarData?.dismiss()
                                snackbarHostState.displaySnackbar(message = name)
                            }
                        },
                    )
                }

                if (section != iconSizeSections.last()) {
                    item(key = "divider-${section.size}") {
                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    }
                }
            }
        }
    }
}

private data class IconCategory(
    val title: String,
    val icons: List<Int>,
    val tint: Color = Color.Unspecified,
)

private data class IconSizeSection(
    val size: Int,
    val categories: List<IconCategory>,
)

@Composable
private fun IconSizeHeader(size: Int) {
    Text(
        text = size.toString(),
        style = AcornTheme.typography.headline6,
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun IconCategoryRow(
    title: String,
    @DrawableRes icons: List<Int>,
    tint: Color = Color.Unspecified,
    onIconClick: (Int) -> Unit,
) {
    Row(
        modifier = Modifier
            .height(IntrinsicSize.Min)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title.uppercase(),
            style = AcornTheme.typography.subtitle2,
            textAlign = TextAlign.End,
            modifier = Modifier.width(CATEGORY_LABEL_WIDTH.dp),
        )

        VerticalDivider(
            modifier = Modifier.padding(horizontal = 12.dp),
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            icons.forEach { iconRes ->
                Icon(
                    painter = painterResource(iconRes),
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.clickable { onIconClick(iconRes) },
                )
            }
        }
    }
}

// 16dp icons

private val iconsArrowsAndChevrons16 = listOf(
    iconsR.drawable.mozac_ic_chevron_right_16,
)

private val iconsBadges16 = listOf(
    iconsR.drawable.mozac_ic_pin_badge_fill_16,
    iconsR.drawable.mozac_ic_play_badge_fill_16,
    iconsR.drawable.mozac_ic_pause_badge_fill_16,
)

private val iconsCheckmarks16 = listOf(
    iconsR.drawable.mozac_ic_checkmark_16,
)

private val iconsGlobe16 = listOf(
    iconsR.drawable.mozac_ic_globe_16,
)

private val iconsMail16 = listOf(
    iconsR.drawable.mozac_ic_email_mask_16,
    iconsR.drawable.mozac_ic_email_shield_16,
)

private val iconsShield16 = listOf(
    iconsR.drawable.mozac_ic_shield_slash_fill_16,
    iconsR.drawable.mozac_ic_shield_checkmark_fill_16,
)

// 20dp icons

private val iconsArrowsAndChevrons20 = listOf(
    iconsR.drawable.mozac_ic_chevron_down_20,
    iconsR.drawable.mozac_ic_chevron_up_20,
)

private val iconsBadges20 = listOf(
    iconsR.drawable.mozac_ic_bookmark_badge_fill_20,
    iconsR.drawable.mozac_ic_notification_dot_badge_fill_20,
    iconsR.drawable.mozac_ic_tab_badge_fill_20,
)

private val iconsBookmark20 = listOf(
    iconsR.drawable.mozac_ic_bookmark_20,
    iconsR.drawable.mozac_ic_bookmark_fill_20,
)

private val iconsClose20 = listOf(
    iconsR.drawable.mozac_ic_cross_20,
    iconsR.drawable.mozac_ic_cross_circle_fill_20,
)

private val iconsGlobe20 = listOf(
    iconsR.drawable.mozac_ic_globe_20,
)

private val iconsLightning20 = listOf(
    iconsR.drawable.mozac_ic_lightning_20,
)

private val iconsMail20 = listOf(
    iconsR.drawable.mozac_ic_email_mask_20,
    iconsR.drawable.mozac_ic_email_shield_20,
)

private val iconsPrivateMode20 = listOf(
    iconsR.drawable.mozac_ic_private_mode_circle_fill_20,
    iconsR.drawable.mozac_ic_private_mode_circle_fill_stroke_20,
)

private val iconsRatings20 = listOf(
    iconsR.drawable.mozac_ic_star_fill_20,
    iconsR.drawable.mozac_ic_star_half_fill_20,
    iconsR.drawable.mozac_ic_star_one_half_fill_20,
)

private val iconsReaderView20 = listOf(
    iconsR.drawable.mozac_ic_reader_view_20,
)

private val iconsShield20 = listOf(
    iconsR.drawable.mozac_ic_shield_slash_20,
    iconsR.drawable.mozac_ic_shield_checkmark_20,
)

private val iconsSync20 = listOf(
    iconsR.drawable.mozac_ic_sync_tabs_20,
)

private val iconsTranslate20 = listOf(
    iconsR.drawable.mozac_ic_translate_20,
)

// 24dp icons

private val iconsAccessibility24 = listOf(
    iconsR.drawable.mozac_ic_accessibility_24,
)

private val iconsAdd24 = listOf(
    iconsR.drawable.mozac_ic_plus_24,
    iconsR.drawable.mozac_ic_add_to_homescreen_24,
)

private val iconsAlerts24 = listOf(
    iconsR.drawable.mozac_ic_critical_24,
    iconsR.drawable.mozac_ic_critical_fill_24,
    iconsR.drawable.mozac_ic_help_circle_24,
    iconsR.drawable.mozac_ic_help_circle_fill_24,
    iconsR.drawable.mozac_ic_information_24,
    iconsR.drawable.mozac_ic_information_fill_24,
    iconsR.drawable.mozac_ic_update_circle_24,
    iconsR.drawable.mozac_ic_warning_24,
    iconsR.drawable.mozac_ic_warning_fill_24,
)

private val iconsAppMenu24 = listOf(
    iconsR.drawable.mozac_ic_app_menu_24,
    iconsR.drawable.mozac_ic_app_menu_space_24,
    iconsR.drawable.mozac_ic_ellipsis_horizontal_24,
    iconsR.drawable.mozac_ic_more_horizontal_round_24,
    iconsR.drawable.mozac_ic_ellipsis_vertical_24,
    iconsR.drawable.mozac_ic_more_vertical_round_24,
    iconsR.drawable.mozac_ic_more_grid_24,
)

private val iconsArrowsAndChevrons24 = listOf(
    iconsR.drawable.mozac_ic_append_up_left_24,
    iconsR.drawable.mozac_ic_append_up_right_24,
    iconsR.drawable.mozac_ic_append_down_left_24,
    iconsR.drawable.mozac_ic_back_24,
    iconsR.drawable.mozac_ic_forward_24,
    iconsR.drawable.mozac_ic_arrow_clockwise_24,
    iconsR.drawable.mozac_ic_arrow_counter_clockwise_24,
    iconsR.drawable.mozac_ic_chevron_left_24,
    iconsR.drawable.mozac_ic_chevron_right_24,
    iconsR.drawable.mozac_ic_chevron_down_24,
    iconsR.drawable.mozac_ic_chevron_up_24,
    iconsR.drawable.mozac_ic_arrow_trending_24,
)

private val iconsAvatar24 = listOf(
    iconsR.drawable.mozac_ic_avatar_circle_24,
    iconsR.drawable.mozac_ic_avatar_circle_fill_24,
    iconsR.drawable.mozac_ic_avatar_warning_circle_fill_24,
    iconsR.drawable.mozac_ic_avatar_info_circle_fill_24,
)

private val iconsBookmark24 = listOf(
    iconsR.drawable.mozac_ic_bookmark_24,
    iconsR.drawable.mozac_ic_bookmark_fill_24,
    iconsR.drawable.mozac_ic_bookmark_slash_24,
    iconsR.drawable.mozac_ic_bookmark_tray_24,
    iconsR.drawable.mozac_ic_bookmark_tray_fill_24,
)

private val iconsCheckmark24 = listOf(
    iconsR.drawable.mozac_ic_checkmark_24,
)

private val iconsClearClose24 = listOf(
    iconsR.drawable.mozac_ic_cross_24,
    iconsR.drawable.mozac_ic_cross_circle_fill_24,
    iconsR.drawable.mozac_ic_cross_circle_24,
)

private val iconsCollection24 = listOf(
    iconsR.drawable.mozac_ic_collection_24,
)

private val iconsCursors24 = listOf(
    iconsR.drawable.mozac_ic_cursor_arrow_24,
)

private val iconsDataClearance24 = listOf(
    iconsR.drawable.mozac_ic_data_clearance_24,
)

private val iconsDelete24 = listOf(
    iconsR.drawable.mozac_ic_delete_24,
)

private val iconsDevices24 = listOf(
    iconsR.drawable.mozac_ic_device_desktop_24,
    iconsR.drawable.mozac_ic_device_desktop_fill_24,
    iconsR.drawable.mozac_ic_device_desktop_send_24,
    iconsR.drawable.mozac_ic_device_mobile_24,
)

private val iconsDownloadSave24 = listOf(
    iconsR.drawable.mozac_ic_download_24,
    iconsR.drawable.mozac_ic_save_file_24,
    iconsR.drawable.mozac_ic_save_24,
)

private val iconsEditCopyPaste24 = listOf(
    iconsR.drawable.mozac_ic_edit_24,
    iconsR.drawable.mozac_ic_copy_24,
    iconsR.drawable.mozac_ic_clipboard_24,
    iconsR.drawable.mozac_ic_signature_24,
    iconsR.drawable.mozac_ic_signature_properties_24,
)

private val iconsExperiments24 = listOf(
    iconsR.drawable.mozac_ic_experiments_24,
)

private val iconsExtensions24 = listOf(
    iconsR.drawable.mozac_ic_extension_24,
    iconsR.drawable.mozac_ic_extension_fill_24,
    iconsR.drawable.mozac_ic_extension_cog_24,
    iconsR.drawable.mozac_ic_extension_warning_24,
    iconsR.drawable.mozac_ic_extension_critical_24,
)

private val iconsExternalLink24 = listOf(
    iconsR.drawable.mozac_ic_external_link_24,
)

private val iconsFolders24 = listOf(
    iconsR.drawable.mozac_ic_folder_24,
    iconsR.drawable.mozac_ic_folder_add_24,
    iconsR.drawable.mozac_ic_folder_arrow_right_24,
)

private val iconsGlobe24 = listOf(
    iconsR.drawable.mozac_ic_globe_24,
)

private val iconsHighlights24 = listOf(
    iconsR.drawable.mozac_ic_sparkle_24,
)

private val iconsHistory24 = listOf(
    iconsR.drawable.mozac_ic_history_24,
)

private val iconsHome24 = listOf(
    iconsR.drawable.mozac_ic_home_24,
)

private val iconsImportExport24 = listOf(
    iconsR.drawable.mozac_ic_import_data_24,
)

private val iconsLabs24 = listOf(
    iconsR.drawable.mozac_ic_labs_24,
)

private val iconsLightbulb24 = listOf(
    iconsR.drawable.mozac_ic_lightbulb_24,
)

private val iconsLightning24 = listOf(
    iconsR.drawable.mozac_ic_lightning_24,
    iconsR.drawable.mozac_ic_lightning_filled_24,
)

private val iconsLink24 = listOf(
    iconsR.drawable.mozac_ic_link_24,
)

private val iconsLock24 = listOf(
    iconsR.drawable.mozac_ic_lock_24,
    iconsR.drawable.mozac_ic_lock_slash_24,
    iconsR.drawable.mozac_ic_lock_warning_24,
    iconsR.drawable.mozac_ic_lock_fill_24,
    iconsR.drawable.mozac_ic_lock_slash_fill_24,
    iconsR.drawable.mozac_ic_lock_warning_fill_24,
)

private val iconsLogos24 = listOf(
    iconsR.drawable.mozac_ic_logo_firefox_24,
    iconsR.drawable.mozac_ic_logo_chrome_24,
    iconsR.drawable.mozac_ic_logo_safari_24,
)

private val iconsMail24 = listOf(
    iconsR.drawable.mozac_ic_email_mask_24,
    iconsR.drawable.mozac_ic_email_shield_24,
)

private val iconsNightMode24 = listOf(
    iconsR.drawable.mozac_ic_night_mode_24,
    iconsR.drawable.mozac_ic_night_mode_fill_24,
)

private val iconsNotifications24 = listOf(
    iconsR.drawable.mozac_ic_notification_24,
    iconsR.drawable.mozac_ic_notification_slash_24,
)

private val iconsPage24 = listOf(
    iconsR.drawable.mozac_ic_page_portrait_24,
)

private val iconsPasskey24 = listOf(
    iconsR.drawable.mozac_ic_passkey_24,
)

private val iconsPayment24 = listOf(
    iconsR.drawable.mozac_ic_credit_card_24,
)

private val iconsPermissions24 = listOf(
    iconsR.drawable.mozac_ic_autoplay_24,
    iconsR.drawable.mozac_ic_autoplay_slash_24,
    iconsR.drawable.mozac_ic_camera_24,
    iconsR.drawable.mozac_ic_camera_slash_24,
    iconsR.drawable.mozac_ic_image_24,
    iconsR.drawable.mozac_ic_image_slash_24,
    iconsR.drawable.mozac_ic_location_24,
    iconsR.drawable.mozac_ic_location_slash_24,
    iconsR.drawable.mozac_ic_microphone_24,
    iconsR.drawable.mozac_ic_microphone_slash_24,
    iconsR.drawable.mozac_ic_notification_24,
    iconsR.drawable.mozac_ic_notification_slash_24,
    iconsR.drawable.mozac_ic_eye_24,
    iconsR.drawable.mozac_ic_eye_slash_24,
    iconsR.drawable.mozac_ic_storage_24,
    iconsR.drawable.mozac_ic_storage_slash_24,
    iconsR.drawable.mozac_ic_plugin_24,
    iconsR.drawable.mozac_ic_login_24,
    iconsR.drawable.mozac_ic_permissions_24,
    iconsR.drawable.mozac_ic_permission_24,
)

private val iconsPin24 = listOf(
    iconsR.drawable.mozac_ic_pin_24,
    iconsR.drawable.mozac_ic_pin_fill_24,
    iconsR.drawable.mozac_ic_pin_slash_24,
    iconsR.drawable.mozac_ic_pin_slash_fill_24,
)

private val iconsPlayPause24 = listOf(
    iconsR.drawable.mozac_ic_play_fill_24,
    iconsR.drawable.mozac_ic_pause_24,
)

private val iconsPrint24 = listOf(
    iconsR.drawable.mozac_ic_print_24,
)

private val iconsPrivateMode24 = listOf(
    iconsR.drawable.mozac_ic_private_mode_fill_24,
    iconsR.drawable.mozac_ic_private_mode_24,
    iconsR.drawable.mozac_ic_private_mode_circle_fill_24,
)

private val iconsQrCode24 = listOf(
    iconsR.drawable.mozac_ic_qr_code_24,
)

private val iconsReaderView24 = listOf(
    iconsR.drawable.mozac_ic_reader_view_24,
    iconsR.drawable.mozac_ic_reader_view_fill_24,
    iconsR.drawable.mozac_ic_reader_view_customize_24,
    iconsR.drawable.mozac_ic_reading_list_24,
    iconsR.drawable.mozac_ic_reading_list_add_24,
    iconsR.drawable.mozac_ic_reading_list_slash_24,
    iconsR.drawable.mozac_ic_reading_list_slash_fill_24,
)

private val iconsSearch24 = listOf(
    iconsR.drawable.mozac_ic_search_24,
    iconsR.drawable.mozac_ic_find_in_page_24,
)

private val iconsSettingsTools24 = listOf(
    iconsR.drawable.mozac_ic_settings_24,
    iconsR.drawable.mozac_ic_grid_add_24,
    iconsR.drawable.mozac_ic_tool_24,
)

private val iconsShare24 = listOf(
    iconsR.drawable.mozac_ic_share_android_24,
    iconsR.drawable.mozac_ic_share_apple_24,
)

private val iconsShield24 = listOf(
    iconsR.drawable.mozac_ic_shield_24,
    iconsR.drawable.mozac_ic_shield_slash_24,
    iconsR.drawable.mozac_ic_shield_checkmark_24,
    iconsR.drawable.mozac_ic_shield_cross_24,
    iconsR.drawable.mozac_ic_shield_exclamation_mark_24,
    iconsR.drawable.mozac_ic_shield_dot_24,
)

private val iconsShopping24 = listOf(
    iconsR.drawable.mozac_ic_competitiveness_24,
    iconsR.drawable.mozac_ic_packaging_24,
    iconsR.drawable.mozac_ic_price_24,
    iconsR.drawable.mozac_ic_quality_24,
    iconsR.drawable.mozac_ic_shipping_24,
    iconsR.drawable.mozac_ic_shopping_24,
)

private val iconsSort24 = listOf(
    iconsR.drawable.mozac_ic_sort_24,
)

private val iconsSports24 = listOf(
    iconsR.drawable.mozac_ic_soccer_ball_24,
    iconsR.drawable.mozac_ic_basketball_24,
    iconsR.drawable.mozac_ic_baseball_24,
    iconsR.drawable.mozac_ic_football_24,
    iconsR.drawable.mozac_ic_racing_24,
    iconsR.drawable.mozac_ic_hockey_24,
    iconsR.drawable.mozac_ic_golf_24,
    iconsR.drawable.mozac_ic_cricket_24,
)

private val iconsSwap24 = listOf(
    iconsR.drawable.mozac_ic_swap_horizontal_24,
)

private val iconsSync24 = listOf(
    iconsR.drawable.mozac_ic_sync_24,
    iconsR.drawable.mozac_ic_sync_tabs_24,
)

private val iconsTabs24 = listOf(
    iconsR.drawable.mozac_ic_tab_tray_24,
    iconsR.drawable.mozac_ic_tab_24,
    iconsR.drawable.mozac_ic_tab_group_24,
    iconsR.drawable.mozac_ic_tab_group_close_24,
)

private val iconsThemes24 = listOf(
    iconsR.drawable.mozac_ic_themes_24,
)

private val iconsThumbs24 = listOf(
    iconsR.drawable.mozac_ic_thumbs_up_24,
    iconsR.drawable.mozac_ic_thumbs_up_fill_24,
    iconsR.drawable.mozac_ic_thumbs_down_24,
    iconsR.drawable.mozac_ic_thumbs_down_fill_24,
)

private val iconsTrackers24 = listOf(
    iconsR.drawable.mozac_ic_cryptominer_24,
    iconsR.drawable.mozac_ic_fingerprinter_24,
    iconsR.drawable.mozac_ic_cookies_24,
    iconsR.drawable.mozac_ic_cookies_slash_24,
    iconsR.drawable.mozac_ic_social_tracker_24,
)

private val iconsTranslate24 = listOf(
    iconsR.drawable.mozac_ic_translate_24,
    iconsR.drawable.mozac_ic_translate_active_24,
)

private val iconsWallpaper24 = listOf(
    iconsR.drawable.mozac_ic_wallpaper_24,
)

private val iconsWhatsNew24 = listOf(
    iconsR.drawable.mozac_ic_whats_new_24,
)

private val iconsZoom24 = listOf(
    iconsR.drawable.mozac_ic_page_zoom_24,
    iconsR.drawable.mozac_ic_page_zoom_fill_24,
)

// 48dp icons

private val iconsPrivateMode48 = listOf(
    iconsR.drawable.mozac_ic_private_mode_circle_fill_48,
)

// 72dp icons

private val iconsPrivateMode72 = listOf(
    iconsR.drawable.mozac_ic_private_mode_fill_72,
)

private val iconsSync72 = listOf(
    iconsR.drawable.mozac_ic_cloud_72,
)

private val iconsTabs72 = listOf(
    iconsR.drawable.mozac_ic_tab_group_72,
)

private val iconSizeSections = listOf(
    IconSizeSection(
        size = 16,
        categories = listOf(
            IconCategory("Arrows & Chevrons", iconsArrowsAndChevrons16),
            IconCategory("Badges", iconsBadges16),
            IconCategory("Checkmarks", iconsCheckmarks16),
            IconCategory("Globe", iconsGlobe16),
            IconCategory("Mail", iconsMail16),
            IconCategory("Shield", iconsShield16),
        ),
    ),
    IconSizeSection(
        size = 20,
        categories = listOf(
            IconCategory("Arrows & Chevrons", iconsArrowsAndChevrons20),
            IconCategory("Badges", iconsBadges20),
            IconCategory("Bookmark", iconsBookmark20),
            IconCategory("Close, Cancel", iconsClose20),
            IconCategory("Globe", iconsGlobe20),
            IconCategory("Lightning", iconsLightning20),
            IconCategory("Mail", iconsMail20),
            IconCategory("Private Mode", iconsPrivateMode20),
            IconCategory("Ratings", iconsRatings20),
            IconCategory("Reader View", iconsReaderView20),
            IconCategory("Shield", iconsShield20),
            IconCategory("Sync", iconsSync20),
            IconCategory("Translate", iconsTranslate20),
        ),
    ),
    IconSizeSection(
        size = 24,
        categories = listOf(
            IconCategory("Accessibility", iconsAccessibility24),
            IconCategory("Add", iconsAdd24),
            IconCategory("Alerts, Info, Help", iconsAlerts24),
            IconCategory("App Menu, More", iconsAppMenu24),
            IconCategory("Arrows & Chevrons", iconsArrowsAndChevrons24),
            IconCategory("Avatar", iconsAvatar24),
            IconCategory("Bookmark", iconsBookmark24),
            IconCategory("Checkmark", iconsCheckmark24),
            IconCategory("Clear, Close", iconsClearClose24),
            IconCategory("Collection", iconsCollection24),
            IconCategory("Cursors", iconsCursors24),
            IconCategory("Data Clearance", iconsDataClearance24),
            IconCategory("Delete", iconsDelete24),
            IconCategory("Devices", iconsDevices24),
            IconCategory("Download, Save", iconsDownloadSave24),
            IconCategory("Edit, Copy, Paste", iconsEditCopyPaste24),
            IconCategory("Experiments", iconsExperiments24),
            IconCategory("Extensions", iconsExtensions24),
            IconCategory("External Link", iconsExternalLink24),
            IconCategory("Folders", iconsFolders24),
            IconCategory("Globe", iconsGlobe24),
            IconCategory("Highlights", iconsHighlights24),
            IconCategory("History", iconsHistory24),
            IconCategory("Home", iconsHome24),
            IconCategory("Import & Export", iconsImportExport24),
            IconCategory("Labs", iconsLabs24),
            IconCategory("Lightbulb", iconsLightbulb24),
            IconCategory("Lightning", iconsLightning24),
            IconCategory("Link", iconsLink24),
            IconCategory("Lock", iconsLock24),
            IconCategory("Logos", iconsLogos24),
            IconCategory("Mail", iconsMail24),
            IconCategory("Night Mode", iconsNightMode24),
            IconCategory("Notifications", iconsNotifications24),
            IconCategory("Page", iconsPage24),
            IconCategory("Passkey", iconsPasskey24),
            IconCategory("Payment", iconsPayment24),
            IconCategory("Permissions", iconsPermissions24),
            IconCategory("Pin", iconsPin24),
            IconCategory("Play, Pause", iconsPlayPause24),
            IconCategory("Print", iconsPrint24),
            IconCategory("Private Mode", iconsPrivateMode24),
            IconCategory("QR Code", iconsQrCode24),
            IconCategory("Reader View", iconsReaderView24),
            IconCategory("Search", iconsSearch24),
            IconCategory("Settings, Tools", iconsSettingsTools24),
            IconCategory("Share", iconsShare24),
            IconCategory("Shield", iconsShield24),
            IconCategory("Shopping", iconsShopping24),
            IconCategory("Sort", iconsSort24),
            IconCategory("Sports", iconsSports24),
            IconCategory("Swap", iconsSwap24),
            IconCategory("Sync", iconsSync24),
            IconCategory("Tabs", iconsTabs24),
            IconCategory("Themes", iconsThemes24),
            IconCategory("Thumbs", iconsThumbs24),
            IconCategory("Trackers", iconsTrackers24),
            IconCategory("Translate", iconsTranslate24),
            IconCategory("Wallpaper", iconsWallpaper24),
            IconCategory("What's New", iconsWhatsNew24),
            IconCategory("Zoom", iconsZoom24),
        ),
    ),
    IconSizeSection(
        size = 48,
        categories = listOf(
            IconCategory("Private Mode", iconsPrivateMode48, tint = Color.Unspecified),
        ),
    ),
    IconSizeSection(
        size = 72,
        categories = listOf(
            IconCategory("Private Mode", iconsPrivateMode72),
            IconCategory("Sync", iconsSync72),
            IconCategory("Tabs", iconsTabs72),
        ),
    ),
)

@FlexibleWindowLightDarkPreview
@Composable
private fun IconsScreenPreview() {
    AcornTheme {
        Surface {
            IconsScreen()
        }
    }
}
