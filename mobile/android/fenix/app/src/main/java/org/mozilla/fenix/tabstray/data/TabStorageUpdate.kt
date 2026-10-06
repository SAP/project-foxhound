/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.data

/**
 * Data entity representing an update from the tab storage layer.
 *
 * @property selectedTabId The ID of the selected tab. Null if there is no tab selected (when no tabs are open).
 * @property normalItems The list of normal [TabsTrayItem]s to display in the Tabs Tray.
 * @property normalTabCount The total number of open Normal tabs, including inactive tabs and
 * the tabs within tab groups.
 * @property selectedNormalItemIndex The index of the selected item in the list of normal tab items.
 * @property inactiveTabs The list of inactive [TabsTrayItem.Tab]s to display in the Tabs Tray.
 * @property privateTabs The list of private [TabsTrayItem]s to display in the Tabs Tray.
 * @property selectedPrivateItemIndex The index of the selected item in the list of private tab items.
 * @property tabGroups The list of [TabsTrayItem.TabGroup]s to display in the Tabs Tray.
 */
data class TabStorageUpdate(
    val selectedTabId: String?,
    val normalItems: List<TabsTrayItem>,
    val normalTabCount: Int,
    val selectedNormalItemIndex: Int,
    val inactiveTabs: List<TabsTrayItem.Tab>,
    val privateTabs: List<TabsTrayItem>,
    val selectedPrivateItemIndex: Int,
    val tabGroups: List<TabsTrayItem.TabGroup>,
)
