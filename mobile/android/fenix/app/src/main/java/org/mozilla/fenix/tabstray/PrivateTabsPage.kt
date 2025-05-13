/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import mozilla.components.browser.state.state.TabSessionState

/**
 * UI for displaying the Private Tabs Page in the Tabs Tray.
 *
 * @param privateTabs The list of private tabs to display.
 * @param selectedTabId The ID of the currently selected tab.
 * @param selectionMode [TabsTrayState.Mode] indicating whether the Tabs Tray is in single selection.
 * @param displayTabsInGrid Whether the normal and private tabs should be displayed in a grid.
 * @param onTabClose Invoked when the user clicks to close a tab.
 * @param onTabMediaClick Invoked when the user interacts with a tab's media controls.
 * @param onTabClick Invoked when the user clicks on a tab.
 * @param onTabLongClick Invoked when the user long clicks on a tab.
 * @param onMove Invoked after the drag and drop gesture completed. Swaps position of two tabs.
 */
@Suppress("LongParameterList")
@Composable
internal fun PrivateTabsPage(
    privateTabs: List<TabSessionState>,
    selectedTabId: String?,
    selectionMode: TabsTrayState.Mode,
    displayTabsInGrid: Boolean,
    onTabClose: (TabSessionState) -> Unit,
    onTabMediaClick: (TabSessionState) -> Unit,
    onTabClick: (TabSessionState) -> Unit,
    onTabLongClick: (TabSessionState) -> Unit,
    onMove: (String, String?, Boolean) -> Unit,
) {
    if (privateTabs.isNotEmpty()) {
        TabLayout(
            tabs = privateTabs,
            displayTabsInGrid = displayTabsInGrid,
            selectedTabId = selectedTabId,
            selectionMode = selectionMode,
            modifier = Modifier.testTag(TabsTrayTestTag.privateTabsList),
            onTabClose = onTabClose,
            onTabMediaClick = onTabMediaClick,
            onTabClick = onTabClick,
            onTabLongClick = onTabLongClick,
            onTabDragStart = {
                // Because we don't currently support selection mode for private tabs,
                // there's no need to exit selection mode when dragging tabs.
            },
            onMove = onMove,
        )
    } else {
        EmptyTabPage(isPrivate = true)
    }
}
