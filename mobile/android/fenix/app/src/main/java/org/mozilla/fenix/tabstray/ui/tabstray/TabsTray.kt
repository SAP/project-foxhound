/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalMaterial3Api::class)

package org.mozilla.fenix.tabstray.ui.tabstray

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FabPosition
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.storage.sync.TabEntry
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.snackbar.Snackbar
import mozilla.components.compose.base.snackbar.SnackbarVisuals
import mozilla.components.compose.base.snackbar.displaySnackbar
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.ext.isNormalTab
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem
import org.mozilla.fenix.tabstray.ui.banner.TabsTrayBanner
import org.mozilla.fenix.tabstray.ui.fab.TabManagerFloatingToolbar
import org.mozilla.fenix.tabstray.ui.tabpage.NormalTabsPage
import org.mozilla.fenix.tabstray.ui.tabpage.PrivateTabsPage
import org.mozilla.fenix.tabstray.ui.tabpage.SyncedTabsPage
import org.mozilla.fenix.tabstray.ui.theme.TabManagerThemeProvider
import org.mozilla.fenix.theme.FirefoxTheme
import mozilla.components.browser.storage.sync.Tab as SyncTab
import org.mozilla.fenix.tabstray.ui.syncedtabs.OnTabClick as OnSyncedTabClick
import org.mozilla.fenix.tabstray.ui.syncedtabs.OnTabCloseClick as OnSyncedTabClose

private const val SPACER_BACKGROUND_ALPHA = 0.75f
private val DefaultStatusBarHeight = 50.dp

/**
 * Top-level UI for displaying the Tabs Tray feature.
 *
 * @param tabsTrayStore [TabsTrayStore] used to listen for changes to [TabsTrayState].
 * @param displayTabsInGrid Whether the normal and private tabs should be displayed in a grid.
 * @param isInDebugMode True for debug variant or if secret menu is enabled for this session.
 * @param shouldShowTabAutoCloseBanner Whether the tab auto closer banner should be displayed.
 * @param shouldShowLockPbmBanner Whether the lock private browsing banner should be displayed.
 * @param isSignedIn Whether the user is signed into their Firefox account.
 * @param isPbmLocked Whether the private browsing mode is currently locked.
 * @param snackbarHostState [SnackbarHostState] of this component to read and show [Snackbar]s accordingly.
 * @param modifier The [Modifier] used to style the container of the the Tabs Tray UI.
 * @param shouldShowInactiveTabsAutoCloseDialog Whether the inactive tabs auto close dialog should be displayed.
 * @param onTabPageClick Invoked when the user clicks on the Normal, Private, or Synced tabs page button.
 * @param onTabClose Invoked when the user clicks to close a tab.
 * @param onTabClick Invoked when the user clicks on a tab.
 * @param onTabLongClick Invoked when the user long clicks a tab.
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
 * @param onMove Invoked after the drag and drop gesture completed. Swaps positions of two tabs.
 * @param shouldShowInactiveTabsCFR Returns whether the inactive tabs CFR should be displayed.
 * @param onInactiveTabsCFRShown Invoked when the inactive tabs CFR is displayed.
 * @param onInactiveTabsCFRClick Invoked when the inactive tabs CFR is clicked.
 * @param onInactiveTabsCFRDismiss Invoked when the inactive tabs CFR is dismissed.
 * @param onOpenNewNormalTabClicked Invoked when the fab is clicked in [Page.NormalTabs].
 * @param onOpenNewPrivateTabClicked Invoked when the fab is clicked in [Page.PrivateTabs].
 * @param onSyncedTabsFabClicked Invoked when the fab is clicked in [Page.SyncedTabs].
 * @param onUnlockPbmClick Invoked when user clicks on the Unlock button.
 */
@Suppress("LongMethod", "LongParameterList")
@Composable
fun TabsTray(
    tabsTrayStore: TabsTrayStore,
    displayTabsInGrid: Boolean,
    isInDebugMode: Boolean,
    shouldShowTabAutoCloseBanner: Boolean,
    shouldShowLockPbmBanner: Boolean,
    isSignedIn: Boolean,
    isPbmLocked: Boolean,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier,
    shouldShowInactiveTabsAutoCloseDialog: (Int) -> Boolean,
    onTabPageClick: (Page) -> Unit,
    onTabClose: (TabSessionState) -> Unit,
    onTabClick: (TabSessionState) -> Unit,
    onTabLongClick: (TabSessionState) -> Unit,
    onInactiveTabsHeaderClick: (Boolean) -> Unit,
    onDeleteAllInactiveTabsClick: () -> Unit,
    onInactiveTabsAutoCloseDialogShown: () -> Unit,
    onInactiveTabAutoCloseDialogCloseButtonClick: () -> Unit,
    onEnableInactiveTabAutoCloseClick: () -> Unit,
    onInactiveTabClick: (TabSessionState) -> Unit,
    onInactiveTabClose: (TabSessionState) -> Unit,
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
    onMove: (String, String?, Boolean) -> Unit,
    shouldShowInactiveTabsCFR: () -> Boolean,
    onInactiveTabsCFRShown: () -> Unit,
    onInactiveTabsCFRClick: () -> Unit,
    onInactiveTabsCFRDismiss: () -> Unit,
    onOpenNewNormalTabClicked: () -> Unit,
    onOpenNewPrivateTabClicked: () -> Unit,
    onSyncedTabsFabClicked: () -> Unit,
    onUnlockPbmClick: () -> Unit,
) {
    val tabsTrayState by tabsTrayStore.stateFlow.collectAsState()
    val pagerState = rememberPagerState(
        initialPage = Page.pageToPosition(tabsTrayState.selectedPage),
        pageCount = { Page.entries.size },
    )
    val syncedTabCount = remember(tabsTrayState.syncedTabs) {
        tabsTrayState.syncedTabs
            .filterIsInstance<SyncedTabsListItem.DeviceSection>()
            .sumOf { deviceSection: SyncedTabsListItem.DeviceSection -> deviceSection.tabs.size }
    }

    val systemBarsInsets = WindowInsets.systemBars.asPaddingValues()
    val statusBarHeight = remember(systemBarsInsets) {
        systemBarsInsets.calculateTopPadding().takeIf { it > 0.dp } ?: DefaultStatusBarHeight
    }

    val topAppBarScrollBehavior = TopAppBarDefaults.enterAlwaysScrollBehavior()
    val isScrolled by remember(topAppBarScrollBehavior.state) {
        derivedStateOf {
            topAppBarScrollBehavior.state.collapsedFraction == 1f
        }
    }

    LaunchedEffect(tabsTrayState.selectedPage) {
        pagerState.animateScrollToPage(Page.pageToPosition(tabsTrayState.selectedPage))
    }

    Scaffold(
        modifier = modifier
            .nestedScroll(topAppBarScrollBehavior.nestedScrollConnection)
            .testTag(TabsTrayTestTag.TABS_TRAY),
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
                normalTabCount = tabsTrayState.normalTabs.size + tabsTrayState.inactiveTabs.size,
                privateTabCount = tabsTrayState.privateTabs.size,
                syncedTabCount = syncedTabCount,
                selectionMode = tabsTrayState.mode,
                isInDebugMode = isInDebugMode,
                statusBarHeight = statusBarHeight,
                shouldShowTabAutoCloseBanner = shouldShowTabAutoCloseBanner,
                shouldShowLockPbmBanner = shouldShowLockPbmBanner,
                scrollBehavior = topAppBarScrollBehavior,
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
            )
        },
        floatingActionButton = {
            TabManagerFloatingToolbar(
                tabsTrayStore = tabsTrayStore,
                expanded = !isScrolled,
                isSignedIn = isSignedIn,
                pbmLocked = isPbmLocked,
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
        Box {
            HorizontalPager(
                modifier = Modifier
                    .padding(paddingValues)
                    .fillMaxSize(),
                state = pagerState,
                userScrollEnabled = false,
            ) { position ->
                when (Page.positionToPage(position)) {
                    Page.NormalTabs -> {
                        NormalTabsPage(
                            normalTabs = tabsTrayState.normalTabs,
                            inactiveTabs = tabsTrayState.inactiveTabs,
                            selectedTabId = tabsTrayState.selectedTabId,
                            selectionMode = tabsTrayState.mode,
                            inactiveTabsExpanded = tabsTrayState.inactiveTabsExpanded,
                            displayTabsInGrid = displayTabsInGrid,
                            onTabClose = onTabClose,
                            onTabClick = onTabClick,
                            onTabLongClick = onTabLongClick,
                            shouldShowInactiveTabsAutoCloseDialog = shouldShowInactiveTabsAutoCloseDialog,
                            onInactiveTabsHeaderClick = onInactiveTabsHeaderClick,
                            onDeleteAllInactiveTabsClick = onDeleteAllInactiveTabsClick,
                            onInactiveTabsAutoCloseDialogShown = onInactiveTabsAutoCloseDialogShown,
                            onInactiveTabAutoCloseDialogCloseButtonClick = onInactiveTabAutoCloseDialogCloseButtonClick,
                            onEnableInactiveTabAutoCloseClick = onEnableInactiveTabAutoCloseClick,
                            onInactiveTabClick = onInactiveTabClick,
                            onInactiveTabClose = onInactiveTabClose,
                            onMove = onMove,
                            shouldShowInactiveTabsCFR = shouldShowInactiveTabsCFR,
                            onInactiveTabsCFRShown = onInactiveTabsCFRShown,
                            onInactiveTabsCFRClick = onInactiveTabsCFRClick,
                            onInactiveTabsCFRDismiss = onInactiveTabsCFRDismiss,
                            onTabDragStart = {
                                tabsTrayStore.dispatch(TabsTrayAction.ExitSelectMode)
                            },
                        )
                    }

                    Page.PrivateTabs -> {
                        PrivateTabsPage(
                            privateTabs = tabsTrayState.privateTabs,
                            selectedTabId = tabsTrayState.selectedTabId,
                            selectionMode = tabsTrayState.mode,
                            displayTabsInGrid = displayTabsInGrid,
                            privateTabsLocked = isPbmLocked,
                            onTabClose = onTabClose,
                            onTabClick = onTabClick,
                            onTabLongClick = onTabLongClick,
                            onMove = onMove,
                            onUnlockPbmClick = onUnlockPbmClick,
                        )
                    }

                    Page.SyncedTabs -> {
                        SyncedTabsPage(
                            isSignedIn = isSignedIn,
                            syncedTabs = tabsTrayState.syncedTabs,
                            onTabClick = onSyncedTabClick,
                            onTabClose = onSyncedTabClose,
                            onSignInClick = onSignInClick,
                            expandedState = tabsTrayState.expandedSyncedTabs,
                            onSectionExpansionToggled = { i ->
                                tabsTrayStore.dispatch(TabsTrayAction.SyncedTabsHeaderToggled(i))
                            },
                        )
                    }
                }
            }
        }
        Spacer(
            Modifier
                .height(statusBarHeight)
                .fillMaxWidth()
                .background(
                    MaterialTheme.colorScheme.surface.copy(
                        SPACER_BACKGROUND_ALPHA,
                    ),
                ),
        )
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
                inactiveTabs = tabTrayState.inactiveTabs,
                inactiveTabsExpanded = tabTrayState.inactiveTabsExpanded,
                normalTabs = tabTrayState.normalTabs,
                privateTabs = tabTrayState.privateTabs,
                syncedTabs = tabTrayState.syncedTabs,
                selectedTabId = tabTrayState.selectedTabId,
                expandedSyncedTabs = tabTrayState.expandedSyncedTabs,
            ),
        )
    }

    val page by remember { tabsTrayStore.stateFlow.map { it.selectedPage } }
        .collectAsState(initial = tabsTrayStore.state.selectedPage)

    FirefoxTheme(theme = TabManagerThemeProvider(selectedPage = page).provideTheme()) {
        TabsTray(
            tabsTrayStore = tabsTrayStore,
            displayTabsInGrid = tabTrayState.displayTabsInGrid,
            isInDebugMode = false,
            isSignedIn = tabTrayState.isSignedIn,
            shouldShowInactiveTabsAutoCloseDialog = { true },
            shouldShowTabAutoCloseBanner = tabTrayState.showTabAutoCloseBanner,
            isPbmLocked = tabTrayState.isPbmLocked,
            snackbarHostState = snackbarHostState,
            onTabPageClick = { page ->
                tabsTrayStore.dispatch(TabsTrayAction.PageSelected(page))
            },
            onTabClose = { tab ->
                if (tab.isNormalTab()) {
                    val newTabs = tabsTrayStore.state.normalTabs - tab
                    tabsTrayStore.dispatch(TabsTrayAction.UpdateNormalTabs(newTabs))
                } else {
                    val newTabs = tabsTrayStore.state.privateTabs - tab
                    tabsTrayStore.dispatch(TabsTrayAction.UpdatePrivateTabs(newTabs))
                }

                scope.launch {
                    snackbarHostState.displaySnackbar(
                        visuals = SnackbarVisuals(
                            message = "Tab closed",
                        ),
                    )
                }
            },
            onTabClick = { tab ->
                when (tabsTrayStore.state.mode) {
                    TabsTrayState.Mode.Normal -> {
                        tabsTrayStore.dispatch(TabsTrayAction.UpdateSelectedTabId(tabId = tab.id))
                    }

                    is TabsTrayState.Mode.Select -> {
                        if (tabsTrayStore.state.mode.selectedTabs.contains(tab)) {
                            tabsTrayStore.dispatch(TabsTrayAction.RemoveSelectTab(tab))
                        } else {
                            tabsTrayStore.dispatch(TabsTrayAction.AddSelectTab(tab))
                        }
                    }
                }
            },
            onTabLongClick = { tab ->
                tabsTrayStore.dispatch(TabsTrayAction.AddSelectTab(tab))
            },
            onInactiveTabsHeaderClick = { expanded ->
                tabsTrayStore.dispatch(TabsTrayAction.UpdateInactiveExpanded(expanded))
            },
            onDeleteAllInactiveTabsClick = {
                tabsTrayStore.dispatch(TabsTrayAction.UpdateInactiveTabs(emptyList()))

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
            onInactiveTabClose = { tab ->
                val newTabs = tabsTrayStore.state.inactiveTabs - tab
                tabsTrayStore.dispatch(TabsTrayAction.UpdateInactiveTabs(newTabs))

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
            onMove = { _, _, _ -> },
            shouldShowInactiveTabsCFR = { false },
            onInactiveTabsCFRShown = {},
            onInactiveTabsCFRClick = {},
            onInactiveTabsCFRDismiss = {},
            shouldShowLockPbmBanner = false,
            onOpenNewNormalTabClicked = {
                val newTab = createTab(
                    url = "www.mozilla.com",
                    private = false,
                )
                val allTabs = tabsTrayStore.state.normalTabs + newTab
                tabsTrayStore.dispatch(TabsTrayAction.UpdateNormalTabs(allTabs))
            },
            onOpenNewPrivateTabClicked = {
                val newTab = createTab(
                    url = "www.mozilla.com",
                    private = true,
                )
                val allTabs = tabsTrayStore.state.privateTabs + newTab
                tabsTrayStore.dispatch(TabsTrayAction.UpdatePrivateTabs(allTabs))
            },
            onSyncedTabsFabClicked = {
                val newSyncedTabList = tabsTrayStore.state.syncedTabs + generateFakeSyncedTabsList()
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
    val normalTabs: List<TabSessionState> = emptyList(),
    val inactiveTabs: List<TabSessionState> = emptyList(),
    val privateTabs: List<TabSessionState> = emptyList(),
    val syncedTabs: List<SyncedTabsListItem> = emptyList(),
    val inactiveTabsExpanded: Boolean = false,
    val showInactiveTabsAutoCloseDialog: Boolean = false,
    val showTabAutoCloseBanner: Boolean = false,
    val isPbmLocked: Boolean = false,
    val isSignedIn: Boolean = true,
    val expandedSyncedTabs: List<Boolean> = emptyList(),
)

private fun generateFakeTabsList(
    tabCount: Int = 10,
    isPrivate: Boolean = false,
): List<TabSessionState> =
    List(tabCount) { index ->
        TabSessionState(
            id = "tabId$index-$isPrivate",
            content = ContentState(
                url = "www.mozilla.com",
                private = isPrivate,
            ),
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
