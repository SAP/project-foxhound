/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui.tabitems

/**
 * Class to store a TabTray item's selection state criteria.
 * This item may be a tab or group of tabs.
 *
 * @property isSelected: Appears selected from a multi-select view.  There can be many.
 * @property isFocused: This is the most recently accessed tab - there can only be one!
 * A tab can be both selected and focused.
 * @property multiSelectEnabled: Whether the multi-select mode is enabled for the parent.
 * @property focusEnabled Whether the focus indicator state is enabled.
 */
data class TabsTrayItemSelectionState(
    val isSelected: Boolean = false,
    val isFocused: Boolean = false,
    val multiSelectEnabled: Boolean = false,
    val focusEnabled: Boolean = true,
)
