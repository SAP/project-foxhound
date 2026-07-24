/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.fab

import androidx.annotation.DrawableRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import mozilla.components.browser.state.state.createTab
import mozilla.components.compose.base.button.ExtendedFloatingActionButton
import mozilla.components.compose.base.button.FloatingActionButtonDefaults
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.menu.DropdownMenu
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.modifier.animateRotation
import mozilla.components.compose.base.text.Text
import mozilla.components.compose.base.theme.surfaceDimVariant
import org.mozilla.fenix.R
import org.mozilla.fenix.tabstray.Page
import org.mozilla.fenix.tabstray.TabsTrayAction
import org.mozilla.fenix.tabstray.TabsTrayState
import org.mozilla.fenix.tabstray.TabsTrayState.Mode
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.theme.FirefoxTheme
import androidx.compose.material3.FloatingActionButtonDefaults as M3FloatingActionButtonDefaults
import mozilla.components.ui.icons.R as iconsR

/**
 * Floating Toolbar for the Tab Manager.
 *
 * @param tabsTrayStore [TabsTrayStore] used to listen for changes to [TabsTrayState].
 * @param isSignedIn Whether the user is signed into their Firefox account.
 * @param modifier The [Modifier] to be applied to this FAB.
 * @param expanded Controls the expansion state of this FAB. In an expanded state, the FAB will
 * show both the icon and text. In a collapsed state, the FAB will show only the icon.
 * @param pbmLocked Whether the private browsing mode is currently locked.
 * @param onOpenNewNormalTabClicked Invoked when the fab is clicked in [Page.NormalTabs].
 * @param onOpenNewPrivateTabClicked Invoked when the fab is clicked in [Page.PrivateTabs].
 * @param onSyncedTabsFabClicked Invoked when the fab is clicked in [Page.SyncedTabs].
 * @param onTabSettingsClick Invoked when the user clicks on the tab settings banner menu item.
 * @param onRecentlyClosedClick Invoked when the user clicks on the recently closed banner menu item.
 * @param onAccountSettingsClick Invoked when the user clicks on the account settings banner menu item.
 * @param onDeleteAllTabsClick Invoked when the user clicks on the close all tabs banner menu item.
 */
@Suppress("LongParameterList")
@Composable
internal fun TabManagerFloatingToolbar(
    tabsTrayStore: TabsTrayStore,
    isSignedIn: Boolean,
    modifier: Modifier = Modifier,
    expanded: Boolean = true,
    pbmLocked: Boolean = false,
    onOpenNewNormalTabClicked: () -> Unit,
    onOpenNewPrivateTabClicked: () -> Unit,
    onSyncedTabsFabClicked: () -> Unit,
    onTabSettingsClick: () -> Unit,
    onRecentlyClosedClick: () -> Unit,
    onAccountSettingsClick: () -> Unit,
    onDeleteAllTabsClick: () -> Unit,
) {
    val state by tabsTrayStore.stateFlow.collectAsState()
    val privateTabsLocked = pbmLocked && state.selectedPage == Page.PrivateTabs

    AnimatedVisibility(
        visible = state.mode is Mode.Normal && !privateTabsLocked,
        modifier = modifier,
        enter = fadeIn(),
        exit = fadeOut(),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.CenterEnd,
            ) {
                FloatingToolbarActions(
                    state = state,
                    onMenuShown = {
                        tabsTrayStore.dispatch(TabsTrayAction.ThreeDotMenuShown)
                    },
                    onEnterMultiselectModeClick = {
                        tabsTrayStore.dispatch(TabsTrayAction.EnterSelectMode)
                    },
                    onTabSettingsClick = onTabSettingsClick,
                    onRecentlyClosedClick = onRecentlyClosedClick,
                    onAccountSettingsClick = onAccountSettingsClick,
                    onDeleteAllTabsClick = onDeleteAllTabsClick,
                    onSearchClicked = {
                        tabsTrayStore.dispatch(TabsTrayAction.TabSearchClicked)
                    },
                )
            }

            Spacer(modifier = Modifier.width(FirefoxTheme.layout.space.static100))

            Box(
                modifier = Modifier.weight(1f),
                contentAlignment = Alignment.CenterStart,
            ) {
                FloatingToolbarFAB(
                    state = state,
                    expanded = expanded,
                    isSignedIn = isSignedIn,
                    onOpenNewNormalTabClicked = onOpenNewNormalTabClicked,
                    onOpenNewPrivateTabClicked = onOpenNewPrivateTabClicked,
                    onSyncedTabsFabClicked = onSyncedTabsFabClicked,
                )
            }
        }
    }
}

@Suppress("LongParameterList")
@Composable
private fun FloatingToolbarActions(
    state: TabsTrayState,
    onMenuShown: () -> Unit,
    onEnterMultiselectModeClick: () -> Unit,
    onTabSettingsClick: () -> Unit,
    onRecentlyClosedClick: () -> Unit,
    onAccountSettingsClick: () -> Unit,
    onDeleteAllTabsClick: () -> Unit,
    onSearchClicked: () -> Unit,
) {
    var showBottomAppBarMenu by remember { mutableStateOf(false) }
    var showCloseAllTabsDialog by remember { mutableStateOf(false) }

    val menuItems = generateMenuItems(
        selectedPage = state.selectedPage,
        normalTabCount = state.normalTabs.size,
        privateTabCount = state.privateTabs.size,
        onAccountSettingsClick = onAccountSettingsClick,
        onTabSettingsClick = onTabSettingsClick,
        onRecentlyClosedClick = onRecentlyClosedClick,
        onEnterMultiselectModeClick = onEnterMultiselectModeClick,
        onDeleteAllTabsClick = { showCloseAllTabsDialog = true },
    )

    Card(
        modifier = Modifier.height(56.dp),
        shape = CircleShape,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceDimVariant,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 6.dp),
    ) {
        Row(
            modifier = Modifier.padding(all = FirefoxTheme.layout.space.static100),
            horizontalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static50),
        ) {
            if (state.searchIconVisible) {
                IconButton(
                    onClick = onSearchClicked,
                    modifier = Modifier.testTag(TabsTrayTestTag.TAB_SEARCH_ICON),
                    enabled = state.searchIconEnabled,
                ) {
                    Icon(
                        painter = painterResource(iconsR.drawable.mozac_ic_search_24),
                        contentDescription = stringResource(id = R.string.tab_manager_open_tab_search),
                    )
                }
            }

            IconButton(
                onClick = {
                    onMenuShown()
                    showBottomAppBarMenu = true
                },
                modifier = Modifier.testTag(TabsTrayTestTag.THREE_DOT_BUTTON),
            ) {
                Icon(
                    painter = painterResource(iconsR.drawable.mozac_ic_ellipsis_vertical_24),
                    contentDescription = stringResource(id = R.string.open_tabs_menu),
                )

                DropdownMenu(
                    menuItems = menuItems,
                    expanded = showBottomAppBarMenu,
                    onDismissRequest = { showBottomAppBarMenu = false },
                )
            }
        }
    }

    if (showCloseAllTabsDialog) {
        CloseAllTabsConfirmationDialog(
            onConfirm = {
                showCloseAllTabsDialog = false
                onDeleteAllTabsClick()
            },
            onDismiss = { showCloseAllTabsDialog = false },
        )
    }
}

@Composable
private fun FloatingToolbarFAB(
    state: TabsTrayState,
    expanded: Boolean,
    isSignedIn: Boolean,
    onOpenNewNormalTabClicked: () -> Unit,
    onOpenNewPrivateTabClicked: () -> Unit,
    onSyncedTabsFabClicked: () -> Unit,
) {
    @DrawableRes val icon: Int
    val contentDescription: String
    val label: String
    var colors = FloatingActionButtonDefaults.colorsPrimary()
    var elevation = M3FloatingActionButtonDefaults.elevation()
    val onClick: () -> Unit
    var iconModifier: Modifier = Modifier
    when (state.selectedPage) {
        Page.NormalTabs -> {
            icon = iconsR.drawable.mozac_ic_plus_24
            contentDescription = stringResource(id = R.string.add_tab)
            label = stringResource(id = R.string.tab_manager_floating_action_button_new_normal_tab)
            onClick = onOpenNewNormalTabClicked
        }

        Page.PrivateTabs -> {
            icon = iconsR.drawable.mozac_ic_plus_24
            contentDescription = stringResource(id = R.string.add_private_tab)
            label = stringResource(id = R.string.tab_manager_floating_action_button_new_private_tab)
            onClick = onOpenNewPrivateTabClicked
        }

        Page.SyncedTabs -> {
            icon = iconsR.drawable.mozac_ic_sync_24
            contentDescription = stringResource(id = R.string.resync_button_content_description)
            label = if (state.syncing) {
                stringResource(id = R.string.sync_syncing_in_progress)
            } else {
                stringResource(id = R.string.tab_manager_floating_action_button_sync_tabs)
            }
            onClick = {
                if (isSignedIn) {
                    onSyncedTabsFabClicked()
                }
            }
            if (!isSignedIn) {
                colors = FloatingActionButtonDefaults.colorsDisabled()
                elevation = M3FloatingActionButtonDefaults.elevation(
                    defaultElevation = 0.dp,
                    pressedElevation = 0.dp,
                    focusedElevation = 0.dp,
                    hoveredElevation = 0.dp,
                )
            }
            iconModifier = Modifier.animateRotation(animate = state.syncing)
        }
    }

    ExtendedFloatingActionButton(
        label = label,
        onClick = onClick,
        modifier = Modifier.testTag(TabsTrayTestTag.FAB),
        expanded = expanded,
        colors = colors,
        elevation = elevation,
    ) {
        Icon(
            painter = painterResource(id = icon),
            contentDescription = contentDescription,
            modifier = iconModifier,
        )
    }
}

/**
 * Confirmation dialog shown when the user selects the "Close all tabs" action
 * from the tab manager.
 *
 * @param onConfirm Invoked when the user confirms in closing all open tabs.
 * @param onDismiss Invoked when the dialog is dismissed without confirming.
 */
@Composable
private fun CloseAllTabsConfirmationDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.tab_manager_close_all_tabs_dialog_title),
                style = FirefoxTheme.typography.headline5,
            )
        },
        text = {
            Text(
                text = stringResource(R.string.tab_manager_close_all_tabs_dialog_body),
                style = FirefoxTheme.typography.body2,
            )
        },
        confirmButton = {
            TextButton(
                text = stringResource(R.string.tab_manager_close_all_tabs_dialog_confirm),
                onClick = onConfirm,
            )
        },
        dismissButton = {
            TextButton(
                text = stringResource(R.string.tab_manager_close_all_tabs_dialog_cancel),
                onClick = onDismiss,
            )
        },
    )
}

@Suppress("LongParameterList")
private fun generateMenuItems(
    selectedPage: Page,
    normalTabCount: Int,
    privateTabCount: Int,
    onTabSettingsClick: () -> Unit,
    onRecentlyClosedClick: () -> Unit,
    onEnterMultiselectModeClick: () -> Unit,
    onDeleteAllTabsClick: () -> Unit,
    onAccountSettingsClick: () -> Unit,
): List<MenuItem> {
    val enterSelectModeItem = MenuItem.IconItem(
        text = Text.Resource(R.string.tabs_tray_select_tabs),
        drawableRes = iconsR.drawable.mozac_ic_checkmark_24,
        testTag = TabsTrayTestTag.SELECT_TABS,
        onClick = onEnterMultiselectModeClick,
    )
    val recentlyClosedTabsItem = MenuItem.IconItem(
        text = Text.Resource(R.string.tab_tray_menu_recently_closed),
        drawableRes = iconsR.drawable.mozac_ic_history_24,
        testTag = TabsTrayTestTag.RECENTLY_CLOSED_TABS,
        onClick = onRecentlyClosedClick,
    )
    val tabSettingsItem = MenuItem.IconItem(
        text = Text.Resource(R.string.tab_tray_menu_tab_settings),
        drawableRes = iconsR.drawable.mozac_ic_settings_24,
        testTag = TabsTrayTestTag.TAB_SETTINGS,
        onClick = onTabSettingsClick,
    )
    val deleteAllTabsItem = MenuItem.IconItem(
        text = Text.Resource(R.string.tab_tray_menu_item_close),
        drawableRes = iconsR.drawable.mozac_ic_delete_24,
        testTag = TabsTrayTestTag.CLOSE_ALL_TABS,
        onClick = onDeleteAllTabsClick,
        level = MenuItem.FixedItem.Level.Critical,
    )
    val accountSettingsItem = MenuItem.IconItem(
        text = Text.Resource(R.string.tab_tray_menu_account_settings),
        drawableRes = iconsR.drawable.mozac_ic_avatar_circle_24,
        testTag = TabsTrayTestTag.ACCOUNT_SETTINGS,
        onClick = onAccountSettingsClick,
    )
    return when {
        (selectedPage == Page.NormalTabs && normalTabCount == 0) ||
            (selectedPage == Page.PrivateTabs && privateTabCount == 0) -> listOf(
            recentlyClosedTabsItem,
            tabSettingsItem,
        )

        selectedPage == Page.NormalTabs -> listOf(
            enterSelectModeItem,
            recentlyClosedTabsItem,
            tabSettingsItem,
            deleteAllTabsItem,
        )

        selectedPage == Page.PrivateTabs -> listOf(
            recentlyClosedTabsItem,
            tabSettingsItem,
            deleteAllTabsItem,
        )

        selectedPage == Page.SyncedTabs -> listOf(
            accountSettingsItem,
            recentlyClosedTabsItem,
        )

        else -> emptyList()
    }
}

private data class TabManagerFloatingToolbarPreviewModel(
    val state: TabsTrayState,
    val expanded: Boolean,
    val isSignedIn: Boolean = true,
)

private class TabManagerFloatingToolbarParameterProvider :
    PreviewParameterProvider<TabManagerFloatingToolbarPreviewModel> {
    override val values: Sequence<TabManagerFloatingToolbarPreviewModel>
        get() = sequenceOf(
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    tabSearchEnabled = false,
                    normalTabs = listOf(createTab(url = "url")),
                ),
                expanded = false,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    tabSearchEnabled = false,
                    normalTabs = listOf(createTab(url = "url")),
                ),
                expanded = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    tabSearchEnabled = true,
                    normalTabs = listOf(createTab(url = "url")),
                ),
                expanded = false,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    tabSearchEnabled = true,
                    normalTabs = listOf(createTab(url = "url")),
                ),
                expanded = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.NormalTabs,
                    tabSearchEnabled = true,
                    normalTabs = emptyList(),
                ),
                expanded = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    tabSearchEnabled = true,
                    privateTabs = listOf(createTab(url = "url", private = true)),
                ),
                expanded = false,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    tabSearchEnabled = true,
                    privateTabs = listOf(createTab(url = "url", private = true)),
                ),
                expanded = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.PrivateTabs,
                    tabSearchEnabled = true,
                    privateTabs = emptyList(),
                ),
                expanded = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.SyncedTabs,
                    tabSearchEnabled = true,
                ),
                expanded = false,
                isSignedIn = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.SyncedTabs,
                    tabSearchEnabled = true,
                ),
                expanded = true,
                isSignedIn = true,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.SyncedTabs,
                    tabSearchEnabled = true,
                ),
                expanded = false,
                isSignedIn = false,
            ),
            TabManagerFloatingToolbarPreviewModel(
                state = TabsTrayState(
                    selectedPage = Page.SyncedTabs,
                    tabSearchEnabled = true,
                ),
                expanded = true,
                isSignedIn = false,
            ),
        )
}

@PreviewLightDark
@Composable
private fun TabManagerFloatingToolbarPreview(
    @PreviewParameter(TabManagerFloatingToolbarParameterProvider::class)
    previewDataModel: TabManagerFloatingToolbarPreviewModel,
) {
    FirefoxTheme {
        Surface {
            TabManagerFloatingToolbar(
                tabsTrayStore = remember { TabsTrayStore(initialState = previewDataModel.state) },
                expanded = previewDataModel.expanded,
                isSignedIn = previewDataModel.isSignedIn,
                pbmLocked = false,
                modifier = Modifier.padding(all = 16.dp),
                onOpenNewNormalTabClicked = {},
                onOpenNewPrivateTabClicked = {},
                onSyncedTabsFabClicked = {},
                onTabSettingsClick = {},
                onAccountSettingsClick = {},
                onDeleteAllTabsClick = {},
                onRecentlyClosedClick = {},
            )
        }
    }
}
