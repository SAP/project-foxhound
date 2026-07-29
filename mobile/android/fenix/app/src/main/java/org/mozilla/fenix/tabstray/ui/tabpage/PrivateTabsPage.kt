/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.tabpage

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import org.mozilla.fenix.R
import org.mozilla.fenix.pbmlock.UnlockPrivateTabsTrayScreen
import org.mozilla.fenix.tabstray.TabsTrayTestTag
import org.mozilla.fenix.tabstray.controller.TabInteractionHandler
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

private val EmptyPageWidth = 190.dp

/**
 * UI for displaying the Private Tabs Page in the Tab Manager.
 *
 * @param privateTabs The list of private tabs to display.
 * @param selectedItemIndex The index of the currently selected tab. This will be scrolled to on first-render.
 * @param selectionMode [TabsTrayState.Mode] indicating whether the Tab Manager is in single selection.
 * @param displayTabsInGrid Whether the normal and private tabs should be displayed in a grid.
 * @param privateTabsLocked Whether the private browsing mode is currently locked.
 * @param onTabClose Invoked when the user clicks to close a tab.
 * @param onItemClick Invoked when the user clicks on a tab.
 * @param onItemLongClick Invoked when the user long clicks on a tab.
 * @param tabInteractionHandler Handlers tab interactions such as moves and drag and drop.
 * @param onUnlockPbmClick Invoked when user clicks on Unlock button.
 */
@Suppress("LongParameterList")
@Composable
internal fun PrivateTabsPage(
    privateTabs: List<TabsTrayItem>,
    selectedItemIndex: Int,
    selectionMode: TabsTrayState.Mode,
    displayTabsInGrid: Boolean,
    privateTabsLocked: Boolean,
    onTabClose: (TabsTrayItem.Tab) -> Unit,
    onItemClick: (TabsTrayItem) -> Unit,
    onItemLongClick: (TabsTrayItem) -> Unit,
    tabInteractionHandler: TabInteractionHandler,
    onUnlockPbmClick: () -> Unit,
) {
    when {
        privateTabs.isEmpty() -> {
            EmptyPrivateTabsPage()
        }

        privateTabsLocked -> {
            UnlockPrivateTabsTrayScreen { onUnlockPbmClick() }
        }

        else -> {
            TabLayout(
                tabs = privateTabs,
                displayTabsInGrid = displayTabsInGrid,
                tabInteractionHandler = tabInteractionHandler,
                selectedItemIndex = selectedItemIndex,
                selectionMode = selectionMode,
                modifier = Modifier.testTag(TabsTrayTestTag.PRIVATE_TABS_LIST),
                onTabClose = onTabClose,
                onItemClick = onItemClick,
                onItemLongClick = onItemLongClick,
                onDeleteTabGroupClick = {},
                onEditTabGroupClick = {},
                onCloseTabGroupClick = {},
                onTabGroupOnboardingDismiss = {},
                dragAndDropEnabled = false,
                displayTabGroupOnboarding = false,
                focusEnabled = true, // Drag and drop is not possible, so there's no reason to hide the focus state
            )
        }
    }
}

/**
 * UI for displaying the empty state of the Private Tabs Page in the Tab Manager.
 *
 * @param modifier The [Modifier] to be applied to the layout.
 */
@Composable
private fun EmptyPrivateTabsPage(
    modifier: Modifier = Modifier,
) {
    EmptyTabPage(
        modifier = modifier.testTag(TabsTrayTestTag.EMPTY_PRIVATE_TABS_LIST),
    ) {
        Column(
            modifier = Modifier.width(EmptyPageWidth),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                painter = painterResource(id = iconsR.drawable.mozac_ic_private_mode_fill_72),
                contentDescription = null,
            )

            Text(
                text = stringResource(id = R.string.tab_manager_empty_private_tabs_page_header),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.headline7,
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = stringResource(
                    id = R.string.tab_manager_empty_private_tabs_page_description,
                    stringResource(id = R.string.app_name),
                ),
                textAlign = TextAlign.Center,
                style = FirefoxTheme.typography.caption,
            )
        }
    }
}

@FlexibleWindowPreview
@Composable
private fun EmptyPrivateTabsPagePreview() {
    FirefoxTheme(theme = Theme.Private) {
        Surface {
            EmptyPrivateTabsPage()
        }
    }
}
