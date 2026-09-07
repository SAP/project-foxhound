/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalMaterial3Api::class)

package org.mozilla.fenix.tabstray.ui.banner

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.button.IconButton
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.text.Text
import mozilla.components.ui.tabcounter.TabCounter
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.Banner
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.data.createTab
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState.Mode
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import org.mozilla.fenix.tabstray.ui.tabstray.TabsTray
import org.mozilla.fenix.tabstray.ui.theme.TabManagerThemeProvider
import org.mozilla.fenix.theme.FirefoxTheme
import kotlin.math.max
import mozilla.components.ui.icons.R as iconsR

private const val TAB_COUNT_SHOW_CFR = 6
private val RowHeight = 48.dp

/**
 * Top-level UI for displaying the banner in [TabsTray].
 *
 * @param selectedPage The current page the Tabs Tray is on.
 * @param normalTabCount The total number of open normal tabs.
 * @param privateTabCount The total number of open private tabs.
 * @param shouldShowTabGroupsPage Whether to show the tab groups page.
 * @param tabGroupCount The total number of open tab groups.
 * @param syncedTabCount The total number of open synced tabs.
 * @param selectionMode [TabsTrayState.Mode] indicating the current selection mode (e.g., normal, multi-select).
 * @param isInDebugMode True for debug variant or if secret menu is enabled for this session.
 * @param shouldShowTabAutoCloseBanner Whether the tab auto-close banner should be displayed.
 * @param shouldShowLockPbmBanner Whether the lock private browsing mode banner should be displayed.
 * @param shouldShowAddToTabGroupButton Whether the add to tab group button should be displayed.
 * @param hasTabDataLoaded Whether the tab data has loaded.
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
 * @param onAddToTabGroup Invoked when the user adds to a tab group.
 */
@Suppress("LongParameterList", "LongMethod")
@Composable
fun TabsTrayBanner(
    selectedPage: Page,
    normalTabCount: Int,
    privateTabCount: Int,
    shouldShowTabGroupsPage: Boolean,
    tabGroupCount: Int,
    syncedTabCount: Int,
    selectionMode: Mode,
    isInDebugMode: Boolean,
    shouldShowTabAutoCloseBanner: Boolean,
    shouldShowLockPbmBanner: Boolean,
    shouldShowAddToTabGroupButton: Boolean,
    hasTabDataLoaded: Boolean,
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
    onAddToTabGroup: () -> Unit,
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
                shouldShowAddToTabGroupButton = shouldShowAddToTabGroupButton,
                onExitSelectModeClick = onExitSelectModeClick,
                onSaveToCollectionsClick = onSaveToCollectionClick,
                onShareSelectedTabs = onShareSelectedTabsClick,
                onBookmarkSelectedTabsClick = onBookmarkSelectedTabsClick,
                onCloseSelectedTabsClick = onDeleteSelectedTabsClick,
                onMakeSelectedTabsInactive = onForceSelectedTabsAsInactiveClick,
                onAddToTabGroup = onAddToTabGroup,
            )
        } else {
            TabPageBanner(
                selectedPage = selectedPage,
                normalTabCount = normalTabCount,
                privateTabCount = privateTabCount,
                shouldShowTabGroupsPage = shouldShowTabGroupsPage,
                tabGroupCount = tabGroupCount,
                syncedTabCount = syncedTabCount,
                onTabPageIndicatorClicked = onTabPageIndicatorClicked,
                hasTabDataLoaded = hasTabDataLoaded,
            )
        }

        when {
            !hasAcknowledgedAutoCloseBanner && showTabAutoCloseBanner -> {
                onTabAutoCloseBannerShown()

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

/**
 * Banner displayed when in [Mode.Normal].
 *
 * @param selectedPage The currently-active tab [Page].
 * @param normalTabCount The amount of open Normal tabs.
 * @param privateTabCount The amount of open Private tabs.
 * @param shouldShowTabGroupsPage Whether to show the tab groups page.
 * @param tabGroupCount The amount of tab groups.
 * @param syncedTabCount The amount of synced tabs.
 * @param hasTabDataLoaded Whether the tab data has loaded.
 * @param onTabPageIndicatorClicked Invoked when the user clicks on a tab page button. Passes along the
 * [Page] that was clicked.
 */
@Suppress("LongParameterList")
@Composable
private fun TabPageBanner(
    selectedPage: Page,
    normalTabCount: Int,
    privateTabCount: Int,
    shouldShowTabGroupsPage: Boolean,
    tabGroupCount: Int,
    syncedTabCount: Int,
    hasTabDataLoaded: Boolean,
    onTabPageIndicatorClicked: (Page) -> Unit,
) {
    val selectedTabIndex = Page.pageToPosition(
        page = selectedPage,
        shouldShowTabGroupsPage = shouldShowTabGroupsPage,
    )

    Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh) {
        PrimaryTabRow(
            selectedTabIndex = selectedTabIndex,
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(insets = TopAppBarDefaults.windowInsets),
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
                        topStartPercent = 50,
                        topEndPercent = 50,
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                )
            },
            divider = {},
        ) {
            TabPageBannerTabs(
                selectedPage = selectedPage,
                normalTabCount = normalTabCount,
                privateTabCount = privateTabCount,
                shouldShowTabGroupsPage = shouldShowTabGroupsPage,
                tabGroupCount = tabGroupCount,
                syncedTabCount = syncedTabCount,
                onTabPageIndicatorClicked = onTabPageIndicatorClicked,
                hasTabDataLoaded = hasTabDataLoaded,
            )
        }
    }
}

@Suppress("LongParameterList")
@Composable
private fun TabPageBannerTabs(
    selectedPage: Page,
    normalTabCount: Int,
    privateTabCount: Int,
    shouldShowTabGroupsPage: Boolean,
    tabGroupCount: Int,
    syncedTabCount: Int,
    hasTabDataLoaded: Boolean,
    onTabPageIndicatorClicked: (Page) -> Unit,
) {
    val privateTabDescription = stringResource(
        id = R.string.tabs_header_private_tabs_counter_title,
        privateTabCount.toString(),
    )
    val normalTabDescription = stringResource(
        id = R.string.tabs_header_normal_tabs_counter_title,
        normalTabCount.toString(),
    )
    val tabGroupsDescription = pluralStringResource(
        id = R.plurals.tabs_header_tab_group_counter_title,
        count = tabGroupCount,
        tabGroupCount,
    )
    val syncedTabDescription = stringResource(
        id = R.string.tabs_header_synced_tabs_counter_title,
        syncedTabCount.toString(),
    )

    BannerTab(
        selected = selectedPage == Page.PrivateTabs,
        testTag = TabsTrayTestTag.PRIVATE_TABS_PAGE_BUTTON,
        contentDescription = privateTabDescription,
        onClick = { onTabPageIndicatorClicked(Page.PrivateTabs) },
    ) {
        Icon(painterResource(iconsR.drawable.mozac_ic_private_mode_24), null)
    }

    BannerTab(
        selected = selectedPage == Page.NormalTabs,
        testTag = TabsTrayTestTag.NORMAL_TABS_PAGE_BUTTON,
        contentDescription = normalTabDescription,
        onClick = { onTabPageIndicatorClicked(Page.NormalTabs) },
    ) {
        TabCounter(
            tabCount = normalTabCount,
            showTabCount = hasTabDataLoaded,
        )
    }

    if (shouldShowTabGroupsPage) {
        BannerTab(
            selected = selectedPage == Page.TabGroups,
            testTag = TabsTrayTestTag.TAB_GROUPS_PAGE_BUTTON,
            contentDescription = tabGroupsDescription,
            onClick = { onTabPageIndicatorClicked(Page.TabGroups) },
        ) {
            Icon(painterResource(iconsR.drawable.mozac_ic_tab_group_24), null)
        }
    }

    BannerTab(
        selected = selectedPage == Page.SyncedTabs,
        testTag = TabsTrayTestTag.SYNCED_TABS_PAGE_BUTTON,
        contentDescription = syncedTabDescription,
        onClick = { onTabPageIndicatorClicked(Page.SyncedTabs) },
    ) {
        Icon(painterResource(iconsR.drawable.mozac_ic_sync_tabs_24), null)
    }
}

@Composable
private fun BannerTab(
    selected: Boolean,
    testTag: String,
    contentDescription: String,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Tab(
        selected = selected,
        onClick = onClick,
        modifier = Modifier
            .testTag(testTag)
            .semantics { this.contentDescription = contentDescription }
            .height(RowHeight),
        selectedContentColor = MaterialTheme.colorScheme.onSurface,
        unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant,
    ) {
        content()
    }
}

/**
 * Banner displayed when in [Mode.Select].
 *
 * @param selectedTabCount The amount of selected tabs.
 * @param shouldShowInactiveButton Whether to show the inactive tabs menu item.
 * @param shouldShowAddToTabGroupButton Whether the add to tab group button should be displayed.
 * @param onExitSelectModeClick Invoked when the user clicks to exit selection mode.
 * @param onSaveToCollectionsClick Invoked when the user clicks on the save to collection button.
 * @param onShareSelectedTabs Invoked when the user clicks on the share tabs button.
 * @param onBookmarkSelectedTabsClick Invoked when the user clicks the menu item to bookmark the selected tabs.
 * @param onCloseSelectedTabsClick Invoked when the user clicks the menu item to close the selected tabs.
 * @param onMakeSelectedTabsInactive Invoked when the user clicks the menu item to set the
 * selected tabs as inactive.
 * @param onAddToTabGroup Invoked when the user adds to a tab group.
 */
@Suppress("LongMethod", "LongParameterList")
@Composable
private fun MultiSelectBanner(
    selectedTabCount: Int,
    shouldShowInactiveButton: Boolean,
    shouldShowAddToTabGroupButton: Boolean,
    onExitSelectModeClick: () -> Unit,
    onSaveToCollectionsClick: () -> Unit,
    onShareSelectedTabs: () -> Unit,
    onBookmarkSelectedTabsClick: () -> Unit,
    onCloseSelectedTabsClick: () -> Unit,
    onMakeSelectedTabsInactive: () -> Unit,
    onAddToTabGroup: () -> Unit,
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
        shouldShowAddToTabGroupButton = shouldShowAddToTabGroupButton,
        onShareSelectedTabs = onShareSelectedTabs,
        onSaveToCollectionsClick = onSaveToCollectionsClick,
        onMakeSelectedTabsInactive = onMakeSelectedTabsInactive,
        onAddToTabGroup = onAddToTabGroup,
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
            IconButton(
                onClick = onExitSelectModeClick,
                contentDescription = stringResource(id = R.string.tab_tray_close_multiselect_content_description),
            ) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_back_24),
                    contentDescription = null,
                )
            }
        },
        actions = {
            IconButton(
                onClick = onBookmarkSelectedTabsClick,
                contentDescription = stringResource(
                    id = R.string.tab_manager_multiselect_menu_item_bookmark_content_description,
                ),
                enabled = buttonsEnabled,
            ) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_bookmark_24),
                    contentDescription = null,
                )
            }

            IconButton(
                onClick = onCloseSelectedTabsClick,
                contentDescription = stringResource(
                    id = R.string.tab_manager_multiselect_menu_item_close_content_description,
                ),
                enabled = buttonsEnabled,
            ) {
                Icon(
                    painter = painterResource(id = iconsR.drawable.mozac_ic_delete_24),
                    contentDescription = null,
                )
            }

            IconButton(
                onClick = { showMenu = true },
                contentDescription = stringResource(id = R.string.tab_tray_multiselect_menu_content_description),
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
                    contentDescription = null,
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
    shouldShowAddToTabGroupButton: Boolean,
    onShareSelectedTabs: () -> Unit,
    onSaveToCollectionsClick: () -> Unit,
    onMakeSelectedTabsInactive: () -> Unit,
    onAddToTabGroup: () -> Unit,
): List<MenuItem> {
    val menuItems = mutableListOf(
        MenuItem.IconItem(
            text = Text.Resource(R.string.tab_manager_multiselect_menu_item_share),
            drawableRes = iconsR.drawable.mozac_ic_share_android_24,
            testTag = TabsTrayTestTag.SHARE_BUTTON,
            onClick = onShareSelectedTabs,
        ),
        MenuItem.IconItem(
            text = Text.Resource(R.string.tab_manager_multiselect_menu_item_add_to_collection),
            drawableRes = iconsR.drawable.mozac_ic_collection_24,
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
    if (shouldShowAddToTabGroupButton) {
        menuItems.add(
            MenuItem.IconItem(
                text = Text.Resource(R.string.tab_manager_multiselect_menu_item_add_to_tab_group),
                drawableRes = iconsR.drawable.mozac_ic_tab_group_24,
                onClick = onAddToTabGroup,
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
private fun TabsTrayBannerWithTabGroupsPreview() {
    TabsTrayBannerPreviewRoot(
        selectedPage = Page.TabGroups,
        shouldShowTabGroupsPage = true,
    )
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
            selectedTabs = setOf(
                createTab("www.mozilla.com"),
                createTab("www.mozilla.com"),
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
    shouldShowAddToTabGroupButton: Boolean = false,
    shouldShowTabGroupsPage: Boolean = false,
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
                shouldShowTabGroupsPage = shouldShowTabGroupsPage,
                tabGroupCount = 0,
                syncedTabCount = 0,
                selectionMode = state.mode,
                isInDebugMode = false,
                hasTabDataLoaded = true,
                shouldShowTabAutoCloseBanner = shouldShowTabAutoCloseBanner,
                shouldShowLockPbmBanner = shouldShowLockPbmBanner,
                shouldShowAddToTabGroupButton = shouldShowAddToTabGroupButton,
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
                onAddToTabGroup = {},
            )
        }
    }
}
