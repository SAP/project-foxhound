/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalMaterial3Api::class)

package org.mozilla.fenix.tabstray.ui.banner

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.text.Text
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.Banner
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayState.Mode
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.ui.tabstray.TabsTray
import org.mozilla.fenix.tabstray.ui.theme.TabManagerThemeProvider
import org.mozilla.fenix.theme.FirefoxTheme
import kotlin.math.max
import mozilla.components.ui.icons.R as iconsR

private const val TAB_COUNT_SHOW_CFR = 6
private val RowHeight = 48.dp
private val TabIndicatorRoundedCornerDp = 100.dp

// Reflects TopAppBarTitleInset private val value in AppBar code
// https://cs.android.com/androidx/platform/frameworks/support/+/androidx-main:compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/AppBar.kt;l=3487?q=TopAppBarTitleInset&sq
private val TopAppBarTitleInset = 16.dp

/**
 * Top-level UI for displaying the banner in [TabsTray].
 *
 * @param selectedPage The current page the Tabs Tray is on.
 * @param normalTabCount The total number of open normal tabs.
 * @param privateTabCount The total number of open private tabs.
 * @param syncedTabCount The total number of open synced tabs.
 * @param selectionMode [TabsTrayState.Mode] indicating the current selection mode (e.g., normal, multi-select).
 * @param isInDebugMode True for debug variant or if secret menu is enabled for this session.
 * @param statusBarHeight The height of the system status bar.
 * @param shouldShowTabAutoCloseBanner Whether the tab auto-close banner should be displayed.
 * @param shouldShowLockPbmBanner Whether the lock private browsing mode banner should be displayed.
 * @param scrollBehavior Defines how the [TabPageBanner] should behave when the content under it is scrolled.
 * @param onTabPageIndicatorClicked Invoked when the user clicks on a tab page indicator.
 * @param onSaveToCollectionClick Invoked when the user clicks the "Save to Collection" button in multi-select mode.
 * @param onShareSelectedTabsClick Invoked when the user clicks the "Share" button in multi-select mode.
 * @param onDeleteSelectedTabsClick Invoked when the user clicks the "Close Selected Tabs" menu item.
 * @param onBookmarkSelectedTabsClick Invoked when the user clicks the "Bookmark Selected Tabs" menu item.
 * @param onForceSelectedTabsAsInactiveClick Invoked when the user clicks the "Mark Tabs as Inactive" menu item.
 * @param onTabAutoCloseBannerViewOptionsClick Invoked when the user clicks to view auto-close settings from the banner.
 * @param onTabsTrayPbmLockedClick Invoked when the user interacts with the lock private browsing mode banner.
 * @param onTabsTrayPbmLockedDismiss Invoked when the user clicks on either button in the
 * lock private browsing mode banner.
 * @param onTabAutoCloseBannerDismiss Invoked when the user dismisses the auto-close banner.
 * @param onTabAutoCloseBannerShown Invoked when the auto-close banner is shown to the user.
 * @param onExitSelectModeClick Invoked when the user exits multi-select mode.
 */
@Suppress("LongParameterList", "LongMethod")
@Composable
fun TabsTrayBanner(
    selectedPage: Page,
    normalTabCount: Int,
    privateTabCount: Int,
    syncedTabCount: Int,
    selectionMode: Mode,
    isInDebugMode: Boolean,
    statusBarHeight: Dp,
    shouldShowTabAutoCloseBanner: Boolean,
    shouldShowLockPbmBanner: Boolean,
    scrollBehavior: TopAppBarScrollBehavior,
    onTabPageIndicatorClicked: (Page) -> Unit,
    onSaveToCollectionClick: () -> Unit,
    onShareSelectedTabsClick: () -> Unit,
    onDeleteSelectedTabsClick: () -> Unit,
    onBookmarkSelectedTabsClick: () -> Unit,
    onForceSelectedTabsAsInactiveClick: () -> Unit,
    onTabAutoCloseBannerViewOptionsClick: () -> Unit,
    onTabsTrayPbmLockedClick: () -> Unit,
    onTabsTrayPbmLockedDismiss: () -> Unit,
    onTabAutoCloseBannerDismiss: () -> Unit,
    onTabAutoCloseBannerShown: () -> Unit,
    onExitSelectModeClick: () -> Unit,
) {
    val isInMultiSelectMode by remember(selectionMode) {
        derivedStateOf {
            selectionMode is Mode.Select
        }
    }
    val showTabAutoCloseBanner by remember(
        shouldShowTabAutoCloseBanner,
        normalTabCount,
        privateTabCount,
    ) {
        derivedStateOf {
            shouldShowTabAutoCloseBanner && max(
                normalTabCount,
                privateTabCount,
            ) >= TAB_COUNT_SHOW_CFR
        }
    }

    var hasAcknowledgedAutoCloseBanner by remember { mutableStateOf(false) }
    var hasAcknowledgedPbmLockBanner by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier.testTag(tag = TabsTrayTestTag.BANNER_ROOT),
    ) {
        if (isInMultiSelectMode) {
            MultiSelectBanner(
                selectedTabCount = selectionMode.selectedTabs.size,
                shouldShowInactiveButton = isInDebugMode,
                onExitSelectModeClick = onExitSelectModeClick,
                onSaveToCollectionsClick = onSaveToCollectionClick,
                onShareSelectedTabs = onShareSelectedTabsClick,
                onBookmarkSelectedTabsClick = onBookmarkSelectedTabsClick,
                onCloseSelectedTabsClick = onDeleteSelectedTabsClick,
                onMakeSelectedTabsInactive = onForceSelectedTabsAsInactiveClick,
            )
        } else {
            TabPageBanner(
                selectedPage = selectedPage,
                normalTabCount = normalTabCount,
                privateTabCount = privateTabCount,
                syncedTabCount = syncedTabCount,
                statusBarHeight = statusBarHeight,
                scrollBehavior = scrollBehavior,
                onTabPageIndicatorClicked = onTabPageIndicatorClicked,
            )
        }

        when {
            !hasAcknowledgedAutoCloseBanner && showTabAutoCloseBanner -> {
                onTabAutoCloseBannerShown()

                BannerPadding(scrollBehavior = scrollBehavior, statusBarHeight = statusBarHeight)

                HorizontalDivider()

                Banner(
                    message = stringResource(id = R.string.tab_tray_close_tabs_banner_message),
                    button1Text = stringResource(id = R.string.tab_tray_close_tabs_banner_negative_button_text),
                    button2Text = stringResource(id = R.string.tab_tray_close_tabs_banner_positive_button_text),
                    onButton1Click = {
                        hasAcknowledgedAutoCloseBanner = true
                        onTabAutoCloseBannerDismiss()
                    },
                    onButton2Click = {
                        hasAcknowledgedAutoCloseBanner = true
                        onTabAutoCloseBannerViewOptionsClick()
                    },
                )
            }

            !hasAcknowledgedPbmLockBanner && shouldShowLockPbmBanner -> {
                BannerPadding(scrollBehavior = scrollBehavior, statusBarHeight = statusBarHeight)

                // After this bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1965545
                // is resolved, we should swap the button 1 and button 2 click actions.
                Banner(
                    message = stringResource(id = R.string.private_tab_cfr_title),
                    button1Text = stringResource(id = R.string.private_tab_cfr_negative),
                    button2Text = stringResource(id = R.string.private_tab_cfr_positive),
                    onButton1Click = {
                        hasAcknowledgedPbmLockBanner = true
                        onTabsTrayPbmLockedDismiss()
                    },
                    onButton2Click = {
                        hasAcknowledgedPbmLockBanner = true
                        onTabsTrayPbmLockedClick()
                        onTabsTrayPbmLockedDismiss()
                    },
                )
            }
        }
    }
}

@Composable
private fun BannerPadding(
    scrollBehavior: TopAppBarScrollBehavior,
    statusBarHeight: Dp,
) {
    val padding by remember(statusBarHeight, scrollBehavior.state.collapsedFraction) {
        derivedStateOf { statusBarHeight * scrollBehavior.state.collapsedFraction }
    }

    Spacer(modifier = Modifier.height(padding))
}

/**
 * Banner displayed when in [Mode.Normal].
 *
 * @param selectedPage The currently-active tab [Page].
 * @param normalTabCount The amount of open Normal tabs.
 * @param privateTabCount The amount of open Private tabs.
 * @param syncedTabCount The amount of synced tabs.
 * @param statusBarHeight The height of the system status bar.
 * @param scrollBehavior Defines how the [TabPageBanner] should behave when the content under it is scrolled.
 * @param onTabPageIndicatorClicked Invoked when the user clicks on a tab page button. Passes along the
 * [Page] that was clicked.
 */
@Suppress("DEPRECATION", "LongMethod")
@Composable
private fun TabPageBanner(
    selectedPage: Page,
    normalTabCount: Int,
    privateTabCount: Int,
    syncedTabCount: Int,
    statusBarHeight: Dp,
    scrollBehavior: TopAppBarScrollBehavior,
    onTabPageIndicatorClicked: (Page) -> Unit,
) {
    val inactiveColor = MaterialTheme.colorScheme.onSurfaceVariant
    val selectedTabIndex = Page.pageToPosition(selectedPage)

    // We wrap the TabRow in a TopAppBar to reuse Material3's built-in scroll behavior.
    // CenterAlignedTopAppBar provides the scroll-to-collapse behavior via `scrollBehavior`,
    // which TabRow/PrimaryTabRow does not support on its own. Without this wrapper, we'd have
    // to duplicate the app bar scroll behavior implementation here.
    CenterAlignedTopAppBar(
        title = {
            Column(
                // The TopAppBarTitleInset value is used here to offset the padding, making sure
                // that the content of the TopAppBar is aligned correctly. This extra padding
                // compensates for the inherent padding added by the CenterAlignedTopAppBar.
                // Without this, the content of the TopAppBar becomes misaligned.
                modifier = Modifier.padding(end = TopAppBarTitleInset),
            ) {
                Spacer(
                    modifier = Modifier
                        .height(statusBarHeight)
                        .fillMaxWidth(),
                )
                PrimaryTabRow(
                    selectedTabIndex = selectedTabIndex,
                    modifier = Modifier.fillMaxWidth(),
                    contentColor = MaterialTheme.colorScheme.primary,
                    containerColor = Color.Transparent,
                    indicator = {
                        TabRowDefaults.PrimaryIndicator(
                            modifier = Modifier.tabIndicatorOffset(
                                selectedTabIndex = selectedTabIndex,
                                matchContentSize = true,
                            ),
                            width = Dp.Unspecified,
                            shape = RoundedCornerShape(
                                topStart = TabIndicatorRoundedCornerDp,
                                topEnd = TabIndicatorRoundedCornerDp,
                            ),
                        )
                    },
                    divider = {},
                ) {
                    val privateTabDescription = stringResource(
                        id = R.string.tabs_header_private_tabs_counter_title,
                        privateTabCount.toString(),
                    )
                    val normalTabDescription = stringResource(
                        id = R.string.tabs_header_normal_tabs_counter_title,
                        normalTabCount.toString(),
                    )
                    val syncedTabDescription = stringResource(
                        id = R.string.tabs_header_synced_tabs_counter_title,
                        syncedTabCount.toString(),
                    )

                    Tab(
                        selected = selectedPage == Page.PrivateTabs,
                        onClick = { onTabPageIndicatorClicked(Page.PrivateTabs) },
                        modifier = Modifier
                            .testTag(TabsTrayTestTag.PRIVATE_TABS_PAGE_BUTTON)
                            .semantics {
                                contentDescription = privateTabDescription
                            }
                            .height(RowHeight),
                        unselectedContentColor = inactiveColor,
                    ) {
                        Text(
                            text = stringResource(id = R.string.tabs_header_private_tabs_title),
                            style = FirefoxTheme.typography.button,
                        )
                    }

                    Tab(
                        selected = selectedPage == Page.NormalTabs,
                        onClick = { onTabPageIndicatorClicked(Page.NormalTabs) },
                        modifier = Modifier
                            .testTag(TabsTrayTestTag.NORMAL_TABS_PAGE_BUTTON)
                            .semantics {
                                contentDescription = normalTabDescription
                            }
                            .height(RowHeight),
                        unselectedContentColor = inactiveColor,
                    ) {
                        Text(
                            text = stringResource(R.string.tabs_header_normal_tabs_title),
                            style = FirefoxTheme.typography.button,
                        )
                    }

                    Tab(
                        selected = selectedPage == Page.SyncedTabs,
                        onClick = { onTabPageIndicatorClicked(Page.SyncedTabs) },
                        modifier = Modifier
                            .testTag(TabsTrayTestTag.SYNCED_TABS_PAGE_BUTTON)
                            .semantics {
                                contentDescription = syncedTabDescription
                            }
                            .height(RowHeight),
                        unselectedContentColor = inactiveColor,
                    ) {
                        Text(
                            text = stringResource(id = R.string.tabs_header_synced_tabs_title),
                            style = FirefoxTheme.typography.button,
                        )
                    }
                }
            }
        },
        expandedHeight = RowHeight + statusBarHeight,
        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
            scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        ),
        // Allow this TopAppBar to be drawn behind the status bar instead of stopping at it.
        windowInsets = TopAppBarDefaults.windowInsets.only(WindowInsetsSides.Horizontal),
        scrollBehavior = scrollBehavior,
    )
}

/**
 * Banner displayed when in [Mode.Select].
 *
 * @param selectedTabCount The amount of selected tabs.
 * @param shouldShowInactiveButton Whether to show the inactive tabs menu item.
 * @param onExitSelectModeClick Invoked when the user clicks to exit selection mode.
 * @param onSaveToCollectionsClick Invoked when the user clicks on the save to collection button.
 * @param onShareSelectedTabs Invoked when the user clicks on the share tabs button.
 * @param onBookmarkSelectedTabsClick Invoked when the user clicks the menu item to bookmark the selected tabs.
 * @param onCloseSelectedTabsClick Invoked when the user clicks the menu item to close the selected tabs.
 * @param onMakeSelectedTabsInactive Invoked when the user clicks the menu item to set the
 * selected tabs as inactive.
 */
@Suppress("LongMethod", "LongParameterList")
@Composable
private fun MultiSelectBanner(
    selectedTabCount: Int,
    shouldShowInactiveButton: Boolean,
    onExitSelectModeClick: () -> Unit,
    onSaveToCollectionsClick: () -> Unit,
    onShareSelectedTabs: () -> Unit,
    onBookmarkSelectedTabsClick: () -> Unit,
    onCloseSelectedTabsClick: () -> Unit,
    onMakeSelectedTabsInactive: () -> Unit,
) {
    val buttonsEnabled by remember(selectedTabCount) {
        derivedStateOf {
            selectedTabCount > 0
        }
    }
    val buttonTint = if (buttonsEnabled) {
        MaterialTheme.colorScheme.onSurface
    } else {
        MaterialTheme.colorScheme.secondary
    }
    var showMenu by remember { mutableStateOf(false) }
    val menuItems = generateMultiSelectBannerMenuItems(
        shouldShowInactiveButton = shouldShowInactiveButton,
        onShareSelectedTabs = onShareSelectedTabs,
        onSaveToCollectionsClick = onSaveToCollectionsClick,
        onMakeSelectedTabsInactive = onMakeSelectedTabsInactive,
    )

    TopAppBar(
        title = {
            Text(
                text = if (selectedTabCount == 0) {
                    stringResource(R.string.tab_tray_multi_select_title_empty)
                } else {
                    stringResource(R.string.tab_tray_multi_select_title, selectedTabCount)
                },
                modifier = Modifier.testTag(TabsTrayTestTag.SELECTION_COUNTER),
                style = FirefoxTheme.typography.headline6,
            )
        },
        navigationIcon = {
            IconButton(onClick = onExitSelectModeClick) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_back_24),
                    contentDescription = stringResource(id = R.string.tab_tray_close_multiselect_content_description),
                )
            }
        },
        actions = {
            IconButton(
                onClick = onBookmarkSelectedTabsClick,
                enabled = buttonsEnabled,
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_bookmark_outline),
                    contentDescription = stringResource(
                        id = R.string.tab_manager_multiselect_menu_item_bookmark_content_description,
                    ),
                )
            }

            IconButton(
                onClick = onCloseSelectedTabsClick,
                enabled = buttonsEnabled,
            ) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_delete_24),
                    contentDescription = stringResource(
                        id = R.string.tab_manager_multiselect_menu_item_close_content_description,
                    ),
                )
            }

            IconButton(
                onClick = { showMenu = true },
                modifier = Modifier.testTag(TabsTrayTestTag.THREE_DOT_BUTTON),
                enabled = buttonsEnabled,
            ) {
                DropdownMenu(
                    menuItems = menuItems,
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false },
                )

                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_ellipsis_vertical_24),
                    contentDescription = stringResource(id = R.string.tab_tray_multiselect_menu_content_description),
                )
            }
        },
        expandedHeight = RowHeight,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            actionIconContentColor = buttonTint,
        ),
    )
}

private fun generateMultiSelectBannerMenuItems(
    shouldShowInactiveButton: Boolean,
    onShareSelectedTabs: () -> Unit,
    onSaveToCollectionsClick: () -> Unit,
    onMakeSelectedTabsInactive: () -> Unit,
): List<MenuItem> {
    val menuItems = mutableListOf(
        MenuItem.IconItem(
            text = Text.Resource(R.string.tab_manager_multiselect_menu_item_share),
            drawableRes = R.drawable.ic_share,
            testTag = TabsTrayTestTag.SHARE_BUTTON,
            onClick = onShareSelectedTabs,
        ),
        MenuItem.IconItem(
            text = Text.Resource(R.string.tab_manager_multiselect_menu_item_add_to_collection),
            drawableRes = R.drawable.ic_tab_collection,
            testTag = TabsTrayTestTag.COLLECTIONS_BUTTON,
            onClick = onSaveToCollectionsClick,
        ),
    )
    if (shouldShowInactiveButton) {
        menuItems.add(
            MenuItem.IconItem(
                text = Text.Resource(R.string.inactive_tabs_menu_item_2),
                drawableRes = iconsR.drawable.mozac_ic_cross_circle_24,
                onClick = onMakeSelectedTabsInactive,
            ),
        )
    }
    return menuItems
}

@PreviewLightDark
@Preview(locale = "es")
@Composable
private fun TabsTrayBannerPreview() {
    TabsTrayBannerPreviewRoot(selectedPage = Page.SyncedTabs)
}

@PreviewLightDark
@Composable
private fun TabsTrayBannerAutoClosePreview() {
    TabsTrayBannerPreviewRoot(shouldShowTabAutoCloseBanner = true)
}

@PreviewLightDark
@Composable
private fun TabsTrayBannerMultiselectPreview() {
    TabsTrayBannerPreviewRoot(
        selectMode = Mode.Select(
            setOf(
                TabSessionState(
                    id = "1",
                    content = ContentState(
                        url = "www.mozilla.com",
                    ),
                ),
                TabSessionState(
                    id = "2",
                    content = ContentState(
                        url = "www.mozilla.com",
                    ),
                ),
            ),
        ),
    )
}

@PreviewLightDark
@Composable
private fun TabsTrayBannerMultiselectNoTabsSelectedPreview() {
    TabsTrayBannerPreviewRoot(
        selectMode = Mode.Select(selectedTabs = setOf()),
    )
}

@Composable
private fun TabsTrayBannerPreviewRoot(
    selectMode: Mode = Mode.Normal,
    selectedPage: Page = Page.NormalTabs,
    shouldShowTabAutoCloseBanner: Boolean = false,
    shouldShowLockPbmBanner: Boolean = false,
) {
    val tabsTrayStore = remember {
        TabsTrayStore(
            initialState = TabsTrayState(
                selectedPage = selectedPage,
                mode = selectMode,
            ),
        )
    }
    val state by tabsTrayStore.stateFlow.collectAsState()

    FirefoxTheme(theme = TabManagerThemeProvider(selectedPage = state.selectedPage).provideTheme()) {
        Box(modifier = Modifier.size(400.dp)) {
            TabsTrayBanner(
                selectedPage = state.selectedPage,
                normalTabCount = 0,
                privateTabCount = 0,
                syncedTabCount = 0,
                selectionMode = state.mode,
                isInDebugMode = false,
                statusBarHeight = 50.dp,
                shouldShowTabAutoCloseBanner = shouldShowTabAutoCloseBanner,
                shouldShowLockPbmBanner = shouldShowLockPbmBanner,
                scrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior(),
                onTabPageIndicatorClicked = { page ->
                    tabsTrayStore.dispatch(TabsTrayAction.PageSelected(page))
                },
                onSaveToCollectionClick = {},
                onShareSelectedTabsClick = {},
                onBookmarkSelectedTabsClick = {},
                onDeleteSelectedTabsClick = {},
                onForceSelectedTabsAsInactiveClick = {},
                onTabAutoCloseBannerViewOptionsClick = {},
                onTabsTrayPbmLockedClick = {},
                onTabsTrayPbmLockedDismiss = {},
                onTabAutoCloseBannerDismiss = {},
                onTabAutoCloseBannerShown = {},
                onExitSelectModeClick = {
                    tabsTrayStore.dispatch(TabsTrayAction.ExitSelectMode)
                },
            )
        }
    }
}
