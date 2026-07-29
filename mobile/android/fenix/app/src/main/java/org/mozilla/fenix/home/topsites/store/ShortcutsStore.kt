/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * The [Store] for holding the [ShortcutsState] and applying [ShortcutsAction]s.
 */
class ShortcutsStore(
    initialState: ShortcutsState,
    middleware: List<Middleware<ShortcutsState, ShortcutsAction>> = listOf(),
) : Store<ShortcutsState, ShortcutsAction>(
    initialState = initialState,
    reducer = ::reducer,
    middleware = middleware,
) {
    init {
        dispatch(ShortcutsAction.InitAction)
    }
}

private fun reducer(state: ShortcutsState, action: ShortcutsAction): ShortcutsState {
    return when (action) {
        is ShortcutsAction.InitAction,
        is ShortcutsAction.SaveShortcut,
            -> state

        is ShortcutsAction.UpdateTopSites -> state.copy(
            topSites = action.topSites,
        )

        is ShortcutsAction.UpdatePopularSites -> state.copy(
            popularSites = action.popularSites,
        )

        is ShortcutsAction.UpdateShowAddShortcut -> state.copy(
            showAddShortcut = action.showAddShortcut,
        )

        is ShortcutsAction.ShowAddShortcutBottomSheet -> state.copy(
            dialogState = DialogState.AddShortcutBottomSheet,
        )

        is ShortcutsAction.ShowAddShortcutDialog -> state.copy(
            dialogState = DialogState.AddShortcut,
        )

        is ShortcutsAction.CloseDialog -> state.copy(
            dialogState = DialogState.Closed,
        )
    }
}
