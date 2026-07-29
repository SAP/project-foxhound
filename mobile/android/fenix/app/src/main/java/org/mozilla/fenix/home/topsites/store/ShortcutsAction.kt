/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.store

import mozilla.components.feature.top.sites.TopSite
import mozilla.components.lib.state.Action

/**
 * Actions to dispatch through the [ShortcutsStore] to modify the [ShortcutsState].
 */
sealed class ShortcutsAction : Action {

    /**
     * [ShortcutsAction] dispatched to indicate that the store is initialized and ready to use.
     * This action is dispatched automatically before any other action is processed.
     * Its main purpose is to trigger initialization logic in middlewares.
     */
    data object InitAction : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched when the list of top sites is updated.
     *
     * @property topSites The new list of [TopSite] to display.
     */
    data class UpdateTopSites(val topSites: List<TopSite>) : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched when the list of popular sites is updated.
     *
     * @property popularSites The new list of [PopularSite]s to display.
     */
    data class UpdatePopularSites(val popularSites: List<PopularSite>) : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched when the visibility of the add shortcut tile is updated.
     *
     * @property showAddShortcut Whether the add shortcut tile should be visible.
     */
    data class UpdateShowAddShortcut(val showAddShortcut: Boolean) : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched to show the bottom sheet for adding a new shortcut.
     */
    data object ShowAddShortcutBottomSheet : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched to show the dialog for adding a new shortcut.
     */
    data object ShowAddShortcutDialog : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched to close the current dialog.
     */
    data object CloseDialog : ShortcutsAction()

    /**
     * [ShortcutsAction] dispatched when the user confirms adding a website as a shortcut.
     *
     * @property title The title for the new shortcut.
     * @property url The URL for the new shortcut.
     */
    data class SaveShortcut(val title: String, val url: String) : ShortcutsAction()
}
