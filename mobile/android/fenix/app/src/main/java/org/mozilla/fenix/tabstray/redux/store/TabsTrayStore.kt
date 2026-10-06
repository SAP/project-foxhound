/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.redux.store

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapNotNull
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.tabstray.data.TabsTrayItem
import org.mozilla.fenix.tabstray.redux.action.TabsTrayAction
import org.mozilla.fenix.tabstray.redux.reducer.TabsTrayReducer
import org.mozilla.fenix.tabstray.redux.state.TabGroupFormState
import org.mozilla.fenix.tabstray.redux.state.TabsTrayState

/**
 * A [Store] that holds the [TabsTrayState] for the tabs tray and reduces [TabsTrayAction]s
 * dispatched to the store.
 */
class TabsTrayStore(
    initialState: TabsTrayState = TabsTrayState(),
    middlewares: List<Middleware<TabsTrayState, TabsTrayAction>> = emptyList(),
) : Store<TabsTrayState, TabsTrayAction>(
    initialState,
    TabsTrayReducer::reduce,
    middlewares,
) {
    val tabGroupFormStateFlow: Flow<TabGroupFormState> = stateFlow.mapNotNull { it.tabGroupState.formState }

    init {
        dispatch(TabsTrayAction.InitAction)
    }

    /**
     * Observe [TabsTrayStore] to listen to changes to the provided [TabsTrayItem.TabGroup].
     */
    fun observeTabGroup(tabGroup: TabsTrayItem.TabGroup): Flow<TabsTrayItem.TabGroup> = stateFlow
        .map { it.tabGroupState.groups }
        .distinctUntilChanged()
        .map { it.find { group -> group.id == tabGroup.id } ?: tabGroup }
        .distinctUntilChanged()
}
