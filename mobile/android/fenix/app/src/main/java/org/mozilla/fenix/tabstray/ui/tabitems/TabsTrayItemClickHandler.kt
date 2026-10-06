/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.tabitems

import org.mozilla.fenix.tabstray.data.TabsTrayItem

/**
 * Data object that orchestrates click handling for a TabTray item.
 * This item may be a tab or group of tabs.
 *
 * @property enabled: Whether this TabItem should listen to clicks
 * @property onClick: Invoked when the TabItem is clicked
 * @property onCloseClick: Invoked when the TabItem is closed
 * @property onLongClick: Invoked when the TabItem is long clicked.
 */
data class TabsTrayItemClickHandler(
    val enabled: Boolean = true,
    val onClick: (arg: TabsTrayItem) -> Unit,
    val onCloseClick: ((arg: TabsTrayItem) -> Unit)? = null,
    val onLongClick: ((arg: TabsTrayItem) -> Unit)? = null,
)
