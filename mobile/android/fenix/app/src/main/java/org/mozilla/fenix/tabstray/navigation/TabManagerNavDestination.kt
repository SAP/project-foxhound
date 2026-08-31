/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.navigation

import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.ui.tabsearch.TabSearchScreen
import org.mozilla.fenix.tabstray.ui.tabstray.TabsTray
import org.mozilla.fenix.tabgroups.EditTabGroup as EditTabGroupSheet
import org.mozilla.fenix.tabgroups.ExpandedTabGroup as ExpandedTabGroupScreen

/**
 * Destinations the user can visit within the Tab Manager
 */
sealed interface TabManagerNavDestination {

    /**
     * [TabManagerNavDestination] representing the root screen of the Tab Manager, [TabsTray], where
     * users access their tabs.
     */
    data object Root : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [TabSearchScreen].
     */
    data object TabSearch : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [EditTabGroupSheet].
     */
    data object EditTabGroup : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [AddToTabGroup].
     */
    data object AddToTabGroup : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [ExpandedTabGroupScreen].
     *
     * @property group The displayed [TabsTrayItem.TabGroup].
     */
    data class ExpandedTabGroup(val group: TabsTrayItem.TabGroup) : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [DeleteTabGroupConfirmationDialog].
     *
     * @property group The tab group to be deleted.
     */
    data class DeleteTabGroupConfirmationDialog(val group: TabsTrayItem.TabGroup) : TabManagerNavDestination

    /**
     * [TabManagerNavDestination] representing the [CloseTabAndDeleteGroupConfirmationDialog].
     *
     * @property group The tab group to be deleted along with the currently focused tab.
     */
    data class CloseTabAndDeleteGroupConfirmationDialog(val group: TabsTrayItem.TabGroup) : TabManagerNavDestination
}
