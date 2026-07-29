/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalMaterial3Api::class)

package org.mozilla.fenix.tabstray.ui.tabstray

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FabPosition
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import mozilla.components.browser.storage.sync.TabEntry
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.snackbar.Snackbar
import mozilla.components.compose.base.snackbar.SnackbarVisuals
import mozilla.components.compose.base.snackbar.displaySnackbar
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.controller.NoOpTabInteractionHandler
import org.mozilla.fenix.tabstray.controller.TabInteractionHandler
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.data.createTab
import org.mozilla.fenix.tabstray.redux.action.TabGroupAction
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.state.Page
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.tabstray.redux.store.TabsTrayStore
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem
import org.mozilla.fenix.tabstray.ui.banner.TabsTrayBanner
import org.mozilla.fenix.tabstray.ui.fab.TabManagerFloatingToolbar
import org.mozilla.fenix.tabstray.ui.tabpage.NormalTabsPage
import org.mozilla.fenix.tabstray.ui.tabpage.PrivateTabsPage
import org.mozilla.fenix.tabstray.ui.tabpage.SyncedTabsPage
import org.mozilla.fenix.tabstray.ui.tabpage.TabGroupsPage
import org.mozilla.fenix.tabstray.ui.theme.TabManagerThemeProvider
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.browser.storage.sync.Tab as SyncTab
import org.mozilla.fenix.tabstray.ui.syncedtabs.OnTabClick as OnSyncedTabClick
import org.mozilla.fenix.tabstray.ui.syncedtabs.OnTabCloseClick as OnSyncedTabClose

/**
 * Top-level UI for displaying the Tabs Tray feature.
 *
 * @param tabsTrayStore [TabsTrayStore] used to listen for changes to [TabsTrayState].
 * @param snackbarHostState [SnackbarHostState] of this component to read and show [Snackbar]s accordingly.
 * @param modifier The [Modifier] used to style the container of the Tabs Tray UI.
 * @param onTabPageClick Invoked when the user clicks on the Normal, Private, or Synced tabs page button.
 * @param onTabClose Invoked when the user clicks to close a tab.
 * @param onItemClick Invoked when the user clicks on a tab.
 * @param onItemLongClick Invoked when the user long clicks a tab.
 * @param onInactiveTabsHeaderClick Invoked when the user clicks on the inactive tabs section header.
 * @param onDeleteAllInactiveTabsClick Invoked when the user clicks on the delete all inactive tabs button.
 * @param onInactiveTabsAutoCloseDialogShown Invoked when the inactive tabs auto close dialog
 * is presented to the user.
 * @param onInactiveTabAutoCloseDialogCloseButtonClick Invoked when the user clicks on the inactive
 * tab auto close dialog's dismiss button.
 * @param onEnableInactiveTabAutoCloseClick Invoked when the user clicks on the inactive tab auto
 * close dialog's enable button.
 * @param onInactiveTabClick Invoked when the user clicks on an inactive tab.
 * @param onInactiveTabClose Invoked when the user clicks on an inactive tab's close button.
 * @param onSyncedTabClick Invoked when the user clicks on a synced tab.
 * @param onSyncedTabClose Invoked when the user clicks on a synced tab's close button.
 * @param onSignInClick Invoked when an unauthenticated user clicks to sign-in.
 * @param onSaveToCollectionClick Invoked when the user clicks on the save to collection button from
 * the multi select banner.
 * @param onShareSelectedTabsClick Invoked when the user clicks on the share button from the
 * multi select banner.
 * @param onTabSettingsClick Invoked when the user clicks on the tab settings banner menu item.
 * @param onRecentlyClosedClick Invoked when the user clicks on the recently closed banner menu item.
 * @param onAccountSettingsClick Invoked when the user clicks on the account settings banner menu item.
 * @param onDeleteAllTabsClick Invoked when the user clicks on the close all tabs banner menu item.
 * @param onBookmarkSelectedTabsClick Invoked when the user clicks on the bookmark banner menu item.
 * @param onDeleteSelectedTabsClick Invoked when the user clicks on the close selected tabs banner menu item.
 * @param onForceSelectedTabsAsInactiveClick Invoked when the user clicks on the make inactive banner menu item.
 * @param onTabAutoCloseBannerViewOptionsClick Invoked when the user clicks to view the auto close options.
 * @param onTabsTrayPbmLockedClick Invoked when the user interacts with the lock private browsing mode banner.
 * @param onTabsTrayPbmLockedDismiss Invoked when the user clicks either button on the
 * lock private browsing mode banner.
 * @param onTabAutoCloseBannerDismiss Invoked when the user clicks to dismiss the auto close banner.
 * @param onTabAutoCloseBannerShown Invoked when the auto close banner has been shown to the user.
 * @param tabInteractionHandler Handlers tab interactions such as moves and drag and drop.
 * @param onInactiveTabsCFRShown Invoked when the inactive tabs CFR is displayed.
 * @param onInactiveTabsCFRClick Invoked when the inactive tabs CFR is clicked.
 * @param onInactiveTabsCFRDismiss Invoked when the inactive tabs CFR is dismissed.
 * @param onTabGroupOnboardingDismiss Invoked when the tab group onboarding card is dismissed.
 * @param onOpenNewNormalTabClicked Invoked when the fab is clicked in [Page.NormalTabs].
 * @param onOpenNewPrivateTabClicked Invoked when the fab is clicked in [Page.PrivateTabs].
 * @param onSyncedTabsFabClicked Invoked when the fab is clicked in [Page.SyncedTabs].
 * @param onUnlockPbmClick Invoked when user clicks on the Unlock button.
 * @param trackersBlockedCount The number of trackers blocked to display in the footer card.
 * @param onPrivacyReportTapped Invoked when the trackers blocked pill is tapped.
 */
@Suppress("LongMethod", "LongParameterList")
@Composable
fun TabsTray(
    tabsTrayStore: TabsTrayStore,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier,
    onTabPageClick: (Page) -> Unit,
    onTabClose: (TabsTrayItem.Tab) -> Unit,
    onItemClick: (TabsTrayItem) -> Unit,
    onItemLongClick: (TabsTrayItem) -> Unit,
    onInactiveTabsHeaderClick: (Boolean) -> Unit,
    onDeleteAllInactiveTabsClick: () -> Unit,
    onInactiveTabsAutoCloseDialogShown: () -> Unit,
    onInactiveTabAutoCloseDialogCloseButtonClick: () -> Unit,
    onEnableInactiveTabAutoCloseClick: () -> Unit,
    onInactiveTabClick: (TabsTrayItem.Tab) -> Unit,
    onInactiveTabClose: (TabsTrayItem.Tab) -> Unit,
    onSyncedTabClick: OnSyncedTabClick,
    onSyncedTabClose: OnSyncedTabClose,
    onSignInClick: () -> Unit,
    onSaveToCollectionClick: () -> Unit,
    onShareSelectedTabsClick: () -> Unit,
    onTabSettingsClick: () -> Unit,
    onRecentlyClosedClick: () -> Unit,
    onAccountSettingsClick: () -> Unit,
    onDeleteAllTabsClick: () -> Unit,
    onBookmarkSelectedTabsClick: () -> Unit,
    onDeleteSelectedTabsClick: () -> Unit,
    onForceSelectedTabsAsInactiveClick: () -> Unit,
    onTabAutoCloseBannerViewOptionsClick: () -> Unit,
    onTabsTrayPbmLockedClick: () -> Unit,
    onTabsTrayPbmLockedDismiss: () -> Unit,
    onTabAutoCloseBannerDismiss: () -> Unit,
    onTabAutoCloseBannerShown: () -> Unit,
    tabInteractionHandler: TabInteractionHandler,
    onInactiveTabsCFRShown: () -> Unit,
    onInactiveTabsCFRClick: () -> Unit,
    onInactiveTabsCFRDismiss: () -> Unit,
    onTabGroupOnboardingDismiss: () -> Unit,
    onOpenNewNormalTabClicked: () -> Unit,
    onOpenNewPrivateTabClicked: () -> Unit,
    onSyncedTabsFabClicked: () -> Unit,
    onUnlockPbmClick: () -> Unit,
    trackersBlockedCount: Int? = null,
    onPrivacyReportTapped: (() -> Unit)? = null,
) {
    val tabsTrayState by tabsTrayStore.stateFlow.collectAsState()
    val shouldShowTabGroupsPage = tabsTrayState.config.tabGroupsEnabled
    val pagerState = rememberPagerState(
        initialPage = Page.pageToPosition(
            page = tabsTrayState.selectedPage,
            shouldShowTabGroupsPage = shouldShowTabGroupsPage,
        ),
        pageCount = { Page.visiblePages(shouldShowTabGroupsPage).size },
    )
    val syncedTabCount = remember(tabsTrayState.sync.syncedTabs) {
        tabsTrayState.sync.syncedTabs
            .filterIsInstance<SyncedTabsListItem.DeviceSection>()
            .sumOf { deviceSection: SyncedTabsListItem.DeviceSection -> deviceSection.tabs.size }
    }

    LaunchedEffect(tabsTrayState.selectedPage, shouldShowTabGroupsPage) {
        pagerState.animateScrollToPage(
            Page.pageToPosition(
                page = tabsTrayState.selectedPage,
                shouldShowTabGroupsPage = shouldShowTabGroupsPage,
            ),
        )
    }

    Scaffold(
        modifier = modifier.testTag(TabsTrayTestTag.TABS_TRAY),
        snackbarHost = {
            SnackbarHost(
                hostState = snackbarHostState,
                snackbar = { snackbarData ->
                    Snackbar(snackbarData = snackbarData)
                },
            )
        },
        topBar = {
            TabsTrayBanner(
                selectedPage = tabsTrayState.selectedPage,
                normalTabCount = tabsTrayState.normalTabsState.tabCount,
                privateTabCount = tabsTrayState.privateBrowsing.tabs.size,
                shouldShowTabGroupsPage = shouldShowTabGroupsPage,
                tabGroupCount = tabsTrayState.tabGroupState.groups.size,
                syncedTabCount = syncedTabCount,
                selectionMode = tabsTrayState.mode,
                isInDebugMode = tabsTrayState.config.isInDebugMode,
                shouldShowTabAutoCloseBanner = tabsTrayState.config.showTabAutoCloseBanner,
                shouldShowLockPbmBanner = tabsTrayState.privateBrowsing.showLockBanner,
                shouldShowAddToTabGroupButton = tabsTrayState.config.tabGroupsEnabled,
                hasTabDataLoaded = tabsTrayState.hasTabDataLoaded,
                onTabPageIndicatorClicked = onTabPageClick,
                onSaveToCollectionClick = onSaveToCollectionClick,
                onShareSelectedTabsClick = onShareSelectedTabsClick,
                onDeleteSelectedTabsClick = onDeleteSelectedTabsClick,
                onBookmarkSelectedTabsClick = onBookmarkSelectedTabsClick,
                onForceSelectedTabsAsInactiveClick = onForceSelectedTabsAsInactiveClick,
                onTabAutoCloseBannerViewOptionsClick = onTabAutoCloseBannerViewOptionsClick,
                onTabsTrayPbmLockedClick = onTabsTrayPbmLockedClick,
                onTabsTrayPbmLockedDismiss = onTabsTrayPbmLockedDismiss,
                onTabAutoCloseBannerDismiss = onTabAutoCloseBannerDismiss,
                onTabAutoCloseBannerShown = onTabAutoCloseBannerShown,
                onExitSelectModeClick = {
                    tabsTrayStore.dispatch(TabsTrayAction.ExitSelectMode)
                },
                onAddToTabGroup = {
                    tabsTrayStore.dispatch(TabGroupAction.AddToTabGroup)
                },
            )
        },
        floatingActionButton = {
            TabManagerFloatingToolbar(
                tabsTrayStore = tabsTrayStore,
                isSignedIn = tabsTrayState.sync.isSignedIn,
                onOpenNewNormalTabClicked = onOpenNewNormalTabClicked,
                onOpenNewPrivateTabClicked = onOpenNewPrivateTabClicked,
                onSyncedTabsFabClicked = onSyncedTabsFabClicked,
                onTabSettingsClick = onTabSettingsClick,
                onRecentlyClosedClick = onRecentlyClosedClick,
                onAccountSettingsClick = onAccountSettingsClick,
                onDeleteAllTabsClick = onDeleteAllTabsClick,
            )
        },
        floatingActionButtonPosition = FabPosition.Center,
    ) { paddingValues ->
        AnimatedVisibility(
            visible = tabsTrayState.hasTabDataLoaded,
            enter = fadeIn(animationSpec = tween()),
            exit = fadeOut(animationSpec = tween()),
        ) {
            HorizontalPager(
                modifier = Modifier
                    .padding(paddingValues)
                    .fillMaxSize(),
                state = pagerState,
                userScrollEnabled = false,
            ) { position ->
                when (Page.positionToPage(position, shouldShowTabGroupsPage)) {
                    Page.NormalTabs -> {
                        NormalTabsPage(
                            items = tabsTrayState.normalTabsState.items,
                            inactiveTabs = tabsTrayState.inactiveTabs.tabs,
                            selectedItemIndex = tabsTrayState.normalTabsState.selectedItemIndex,
                            selectionMode = tabsTrayState.mode,
                            inactiveTabsExpanded = tabsTrayState.inactiveTabs.isExpanded,
                            displayTabsInGrid = tabsTrayState.config.displayTabsInGrid,
                            dragAndDropEnabled = tabsTrayState.config.tabGroupsDragAndDropEnabled,
                            displayTabGroupOnboarding = tabsTrayState.shouldShowTabGroupOnboarding,
                            onTabClose = onTabClose,
                            shouldShowInactiveTabsAutoCloseDialog = tabsTrayState.inactiveTabs.showAutoCloseDialog,
                            onItemClick = onItemClick,
                            onItemLongClick = onItemLongClick,
                            onInactiveTabsHeaderClick = onInactiveTabsHeaderClick,
                            onDeleteAllInactiveTabsClick = onDeleteAllInactiveTabsClick,
                            onInactiveTabsAutoCloseDialogShown = onInactiveTabsAutoCloseDialogShown,
                            onInactiveTabAutoCloseDialogCloseButtonClick = onInactiveTabAutoCloseDialogCloseButtonClick,
                            onEnableInactiveTabAutoCloseClick = onEnableInactiveTabAutoCloseClick,
                            onInactiveTabClick = onInactiveTabClick,
                            onInactiveTabClose = onInactiveTabClose,
                            tabInteractionHandler = tabInteractionHandler,
                            shouldShowInactiveTabsCFR = tabsTrayState.inactiveTabs.showCFR,
                            onInactiveTabsCFRShown = onInactiveTabsCFRShown,
                            onInactiveTabsCFRClick = onInactiveTabsCFRClick,
                            onInactiveTabsCFRDismiss = onInactiveTabsCFRDismiss,
                            onDeleteTabGroupClick = { group ->
                                tabsTrayStore.dispatch(TabGroupAction.DeleteClicked(group))
                            },
                            onEditTabGroupClick = { group ->
                                tabsTrayStore.dispatch(TabGroupAction.EditTabGroupClicked(group = group))
                            },
                            onCloseTabGroupClick = { group ->
                                tabsTrayStore.dispatch(TabGroupAction.CloseTabGroupClicked(group = group))
                            },
                            onTabGroupOnboardingDismiss = onTabGroupOnboardingDismiss,
                            trackersBlockedCount = trackersBlockedCount,
                            focusEnabled = tabsTrayState.normalTabsState.itemFocusIndicatorEnabled,
                            onPrivacyReportTapped = onPrivacyReportTapped,
                        )
                    }

                    Page.PrivateTabs -> {
                        PrivateTabsPage(
                            privateTabs = tabsTrayState.privateBrowsing.tabs,
                            selectedItemIndex = tabsTrayState.privateBrowsing.selectedItemIndex,
                            selectionMode = tabsTrayState.mode,
                            displayTabsInGrid = tabsTrayState.config.displayTabsInGrid,
                            privateTabsLocked = tabsTrayState.privateBrowsing.isLocked,
                            onTabClose = onTabClose,
                            onItemClick = onItemClick,
                            onItemLongClick = onItemLongClick,
                            tabInteractionHandler = tabInteractionHandler,
                            onUnlockPbmClick = onUnlockPbmClick,
                        )
                    }

                    Page.SyncedTabs -> {
                        SyncedTabsPage(
                            isSignedIn = tabsTrayState.sync.isSignedIn,
                            syncedTabs = tabsTrayState.sync.syncedTabs,
                            onTabClick = onSyncedTabClick,
                            onTabClose = onSyncedTabClose,
                            onSignInClick = onSignInClick,
                            expandedState = tabsTrayState.sync.expandedSyncedTabs,
                            onSectionExpansionToggled = { i ->
                                tabsTrayStore.dispatch(TabsTrayAction.SyncedTabsHeaderToggled(i))
                            },
                        )
                    }

                    Page.TabGroups -> {
                        TabGroupsPage(
                            groups = tabsTrayState.tabGroupState.groups,
                            onTabGroupClick = { group ->
                                tabsTrayStore.dispatch(TabGroupAction.OpenTabGroupClicked(group))
                            },
                            onDeleteTabGroupClick = { group ->
                                tabsTrayStore.dispatch(TabGroupAction.DeleteClicked(group))
                            },
                            onEditTabGroupClick = { group ->
                                tabsTrayStore.dispatch(TabGroupAction.EditTabGroupClicked(group = group))
                            },
                        )
                    }
                }
            }
        }
    }
}

@PreviewLightDark
@FlexibleWindowPreview
@Composable
@Suppress("LongMethod")
private fun TabsTrayPreview(
    @PreviewParameter(TabsTrayStateParameterProvider::class)
    tabTrayState: TabsTrayPreviewModel,
) {
    var showInactiveTabsAutoCloseDialogState by remember {
        mutableStateOf(tabTrayState.showInactiveTabsAutoCloseDialog)
    }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val tabsTrayStore = remember {
        TabsTrayStore(
            initialState = TabsTrayState(
                selectedPage = tabTrayState.selectedPage,
                mode = tabTrayState.mode,
                selectedTabId = tabTrayState.selectedTabId,
                normalTabsState = TabsTrayState.NormalTabsState(
                    items = tabTrayState.normalTabs,
                ),
                inactiveTabs = TabsTrayState.InactiveTabsState(
                    tabs = tabTrayState.inactiveTabs,
                    isExpanded = tabTrayState.inactiveTabsExpanded,
                    showAutoCloseDialog = true,
                ),
                privateBrowsing = TabsTrayState.PrivateBrowsingState(
                    tabs = tabTrayState.privateTabs,
                    isLocked = tabTrayState.isPbmLocked,
                    showLockBanner = true,
                ),
                sync = TabsTrayState.SyncState(
                    isSignedIn = tabTrayState.isSignedIn,
                    isSyncing = true,
                    syncedTabs = tabTrayState.syncedTabs,
                    expandedSyncedTabs = tabTrayState.expandedSyncedTabs,
                ),
                config = TabsTrayState.TabsTrayConfig(
                    displayTabsInGrid = tabTrayState.displayTabsInGrid,
                    showTabAutoCloseBanner = tabTrayState.showTabAutoCloseBanner,
                ),
                hasTabDataLoaded = true,
            ),
        )
    }

    val page by remember { tabsTrayStore.stateFlow.map { it.selectedPage } }
        .collectAsState(initial = tabsTrayStore.state.selectedPage)

    FirefoxTheme(theme = TabManagerThemeProvider(selectedPage = page).provideTheme()) {
        TabsTray(
            tabsTrayStore = tabsTrayStore,
            snackbarHostState = snackbarHostState,
            onTabPageClick = { page ->
                tabsTrayStore.dispatch(TabsTrayAction.PageSelected(page))
            },
            tabInteractionHandler = NoOpTabInteractionHandler,
            onTabClose = { _ ->
                scope.launch {
                    snackbarHostState.displaySnackbar(
                        visuals = SnackbarVisuals(
                            message = "Tab closed",
                        ),
                    )
                }
            },
            onItemClick = { item ->
                val isSelected = tabsTrayStore.state.mode.contains(item)
                when (item) {
                    is TabsTrayItem.Tab -> if (isSelected) {
                        tabsTrayStore.dispatch(TabsTrayAction.RemoveSelectTab(item))
                    } else if (tabsTrayStore.state.mode is TabsTrayState.Mode.Select) {
                        tabsTrayStore.dispatch(TabsTrayAction.AddSelectTab(item))
                    } else {
                        tabsTrayStore.dispatch(TabsTrayAction.UpdateSelectedTabId(tabId = item.id))
                    }

                    is TabsTrayItem.TabGroup -> {
                        tabsTrayStore.dispatch(TabGroupAction.TabGroupClicked(group = item))
                    }
                }
            },
            onItemLongClick = {},
            onInactiveTabsHeaderClick = { expanded ->
                tabsTrayStore.dispatch(TabsTrayAction.UpdateInactiveExpanded(expanded))
            },
            onDeleteAllInactiveTabsClick = {
                scope.launch {
                    snackbarHostState.displaySnackbar(
                        visuals = SnackbarVisuals(
                            message = "Tabs closed",
                        ),
                    )
                }
            },
            onInactiveTabsAutoCloseDialogShown = {},
            onInactiveTabAutoCloseDialogCloseButtonClick = {
                showInactiveTabsAutoCloseDialogState = !showInactiveTabsAutoCloseDialogState
            },
            onEnableInactiveTabAutoCloseClick = {
                showInactiveTabsAutoCloseDialogState = !showInactiveTabsAutoCloseDialogState
            },
            onInactiveTabClick = {},
            onInactiveTabClose = { _ ->
                scope.launch {
                    snackbarHostState.displaySnackbar(
                        visuals = SnackbarVisuals(
                            message = "Tab closed",
                        ),
                    )
                }
            },
            onSyncedTabClick = {},
            onSyncedTabClose = { _, _ ->
                scope.launch {
                    snackbarHostState.displaySnackbar(
                        visuals = SnackbarVisuals(
                            message = "Tab closed",
                        ),
                    )
                }
            },
            onSignInClick = {},
            onSaveToCollectionClick = {},
            onShareSelectedTabsClick = {},
            onTabSettingsClick = {},
            onRecentlyClosedClick = {},
            onAccountSettingsClick = {},
            onDeleteAllTabsClick = {},
            onDeleteSelectedTabsClick = {},
            onBookmarkSelectedTabsClick = {},
            onForceSelectedTabsAsInactiveClick = {},
            onTabAutoCloseBannerViewOptionsClick = {},
            onTabsTrayPbmLockedClick = {},
            onTabsTrayPbmLockedDismiss = {},
            onTabAutoCloseBannerDismiss = {},
            onTabAutoCloseBannerShown = {},
            onInactiveTabsCFRShown = {},
            onInactiveTabsCFRClick = {},
            onInactiveTabsCFRDismiss = {},
            onTabGroupOnboardingDismiss = {},
            onOpenNewNormalTabClicked = {},
            onOpenNewPrivateTabClicked = {},
            onSyncedTabsFabClicked = {
                val newSyncedTabList = tabsTrayStore.state.sync.syncedTabs + generateFakeSyncedTabsList()
                tabsTrayStore.dispatch(TabsTrayAction.UpdateSyncedTabs(newSyncedTabList))
            },
            onUnlockPbmClick = {},
        )
    }
}

private class TabsTrayStateParameterProvider : PreviewParameterProvider<TabsTrayPreviewModel> {
    val tabs = generateFakeTabsList()
    override val values = sequenceOf(
        // TabsTray Preview
        TabsTrayPreviewModel(
            displayTabsInGrid = false,
            selectedTabId = tabs[0].id,
            normalTabs = tabs,
            privateTabs = generateFakeTabsList(
                tabCount = 7,
                isPrivate = true,
            ),
            syncedTabs = generateFakeSyncedTabsList(),
        ),
        // TabsTray MultiSelect Preview
        TabsTrayPreviewModel(
            selectedTabId = tabs[0].id,
            mode = TabsTrayState.Mode.Select(tabs.take(4).toSet()),
            normalTabs = tabs,
        ),
        // TabsTray Inactive Tabs Preview
        TabsTrayPreviewModel(
            normalTabs = generateFakeTabsList(tabCount = 3),
            inactiveTabs = generateFakeTabsList(),
            inactiveTabsExpanded = true,
            showInactiveTabsAutoCloseDialog = true,
        ),
        // TabsTray Private Tabs Preview
        TabsTrayPreviewModel(
            selectedPage = Page.PrivateTabs,
            privateTabs = generateFakeTabsList(isPrivate = true),
        ),
        // TabsTray Synced Tab Preview
        TabsTrayPreviewModel(
            selectedPage = Page.SyncedTabs,
            syncedTabs = generateFakeSyncedTabsList(deviceCount = 3),
        ),
        // TabsTray AutoClose Banner Preview
        TabsTrayPreviewModel(
            normalTabs = generateFakeTabsList(),
            showTabAutoCloseBanner = true,
        ),
        // TabsTray Locked Preview
        TabsTrayPreviewModel(
            privateTabs = generateFakeTabsList(isPrivate = true),
            selectedPage = Page.PrivateTabs,
            isPbmLocked = true,
        ),
    )
}

/**
 * This model is necessary because the [TabsTrayPreview] Composable
 * requires inputs for multiple classes in order to preview all cases.
 */
private data class TabsTrayPreviewModel(
    val displayTabsInGrid: Boolean = true,
    val selectedPage: Page = Page.NormalTabs,
    val selectedTabId: String? = null,
    val mode: TabsTrayState.Mode = TabsTrayState.Mode.Normal,
    val normalTabs: List<TabsTrayItem> = emptyList(),
    val inactiveTabs: List<TabsTrayItem.Tab> = emptyList(),
    val privateTabs: List<TabsTrayItem> = emptyList(),
    val syncedTabs: List<SyncedTabsListItem> = emptyList(),
    val inactiveTabsExpanded: Boolean = false,
    val showInactiveTabsAutoCloseDialog: Boolean = false,
    val shouldShowAddToTabGroupButton: Boolean = false,
    val showTabAutoCloseBanner: Boolean = false,
    val isPbmLocked: Boolean = false,
    val isSignedIn: Boolean = true,
    val expandedSyncedTabs: List<Boolean> = emptyList(),
)

private fun generateFakeTabsList(
    tabCount: Int = 10,
    isPrivate: Boolean = false,
): List<TabsTrayItem.Tab> =
    List(tabCount) { index ->
        createTab(
            id = "tabId$index-$isPrivate",
            url = "www.mozilla.com",
            private = isPrivate,
        )
    }

private fun generateFakeSyncedTabsList(deviceCount: Int = 1): List<SyncedTabsListItem> =
    List(deviceCount) { index ->
        SyncedTabsListItem.DeviceSection(
            displayName = "Device $index",
            tabs = listOf(
                generateFakeSyncedTab("Mozilla", "www.mozilla.org"),
                generateFakeSyncedTab("Google", "www.google.com"),
                generateFakeSyncedTab("", "www.google.com"),
            ),
        )
    }

private fun generateFakeSyncedTab(
    tabName: String,
    tabUrl: String,
    action: SyncedTabsListItem.Tab.Action = SyncedTabsListItem.Tab.Action.None,
): SyncedTabsListItem.Tab =
    SyncedTabsListItem.Tab(
        tabName.ifEmpty { tabUrl },
        tabUrl,
        action,
        SyncTab(
            history = listOf(TabEntry(tabName, tabUrl, null)),
            active = 0,
            lastUsed = 0L,
            inactive = false,
        ),
    )
