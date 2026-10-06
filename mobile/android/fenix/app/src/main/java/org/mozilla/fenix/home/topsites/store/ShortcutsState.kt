/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.store

import mozilla.components.feature.top.sites.TopSite
import mozilla.components.lib.state.State

/**
 * The UI state of the shortcuts.
 *
 * @property topSites The list of [TopSite] to display.
 * @property popularSites The list of [PopularSite] to suggest when adding a shortcut.
 * @property showAddShortcut Whether to show the "Add shortcut" button.
 * @property dialogState The current dialog being displayed.
 */
data class ShortcutsState(
    val topSites: List<TopSite>,
    val popularSites: List<PopularSite> = emptyList(),
    val showAddShortcut: Boolean = false,
    val dialogState: DialogState = DialogState.Closed,
) : State {
    companion object {
        val INITIAL = ShortcutsState(topSites = emptyList())
    }
}

/**
 * Represents the dialog state of the shortcuts screen.
 */
sealed interface DialogState {
    /**
     * The bottom sheet for adding a shortcut.
     */
    data object AddShortcutBottomSheet : DialogState

    /**
     * The dialog for entering a new website shortcut's details.
     */
    data object AddShortcut : DialogState

    /**
     * No dialog is being shown.
     */
    data object Closed : DialogState
}
