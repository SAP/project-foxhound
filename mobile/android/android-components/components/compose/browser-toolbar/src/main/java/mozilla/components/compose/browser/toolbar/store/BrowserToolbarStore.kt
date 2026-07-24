/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.toolbar.store

import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.BrowserActionsEndUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.BrowserActionsStartUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.NavigationActionsUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.PageActionsEndUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.PageActionsStartUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserDisplayToolbarAction.PageOriginUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserEditToolbarAction.AutocompleteSuggestionUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarInteraction.BrowserToolbarEvent
import mozilla.components.compose.browser.toolbar.ui.BrowserToolbarQuery
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * [Store] for maintaining the state of the browser toolbar.
 */
class BrowserToolbarStore(
    initialState: BrowserToolbarState = BrowserToolbarState(),
    middleware: List<Middleware<BrowserToolbarState, BrowserToolbarAction>> = emptyList(),
) : Store<BrowserToolbarState, BrowserToolbarAction>(
    initialState = initialState,
    reducer = ::reduce,
    middleware = middleware,
) {
    init {
        // Allow integrators intercept and update the initial state.
        dispatch(
            BrowserToolbarAction.Init(
                mode = initialState.mode,
                displayState = initialState.displayState,
                editState = initialState.editState,
                gravity = initialState.gravity,
            ),
        )
    }
}

@Suppress("LongMethod")
private fun reduce(state: BrowserToolbarState, action: BrowserToolbarAction): BrowserToolbarState {
    return when (action) {
        is BrowserToolbarAction.Init -> BrowserToolbarState(
            mode = action.mode,
            displayState = action.displayState,
            editState = action.editState,
            gravity = action.gravity,
        )

        is BrowserToolbarAction.EnterEditMode -> state.copy(
            mode = Mode.EDIT,
            editState = state.editState.copy(
                isQueryPrivate = action.isPrivate,
            ),
        )

        is BrowserToolbarAction.ExitEditMode -> state.copy(
            mode = Mode.DISPLAY,
            editState = state.editState.copy(
                query = BrowserToolbarQuery(""),
            ),
        )

        is BrowserToolbarAction.ToolbarGravityUpdated -> state.copy(
            gravity = action.gravity,
        )

        is BrowserToolbarAction.CommitUrl -> state

        is BrowserActionsStartUpdated -> state.copy(
            displayState = state.displayState.copy(
                browserActionsStart = action.actions,
            ),
        )

        is PageActionsStartUpdated -> state.copy(
            displayState = state.displayState.copy(
                pageActionsStart = action.actions,
            ),
        )

        is PageOriginUpdated -> state.copy(
            displayState = state.displayState.copy(
                pageOrigin = action.pageOrigin,
            ),
        )

        is PageActionsEndUpdated -> state.copy(
            displayState = state.displayState.copy(
                pageActionsEnd = action.actions,
            ),
        )

        is BrowserActionsEndUpdated -> state.copy(
            displayState = state.displayState.copy(
                browserActionsEnd = action.actions,
            ),
        )

        is NavigationActionsUpdated -> state.copy(
            displayState = state.displayState.copy(
                navigationActions = action.actions,
            ),
        )

        is BrowserEditToolbarAction.SearchQueryUpdated -> state.copy(
            editState = state.editState.copy(
                query = action.query,
                isQueryPrefilled = action.isQueryPrefilled,
            ),
        )

        is AutocompleteSuggestionUpdated -> state.copy(
            editState = state.editState.copy(
                suggestion = action.autocompletedSuggestion,
            ),
        )

        is BrowserEditToolbarAction.SearchActionsStartUpdated -> state.copy(
            editState = state.editState.copy(
                editActionsStart = action.actions,
            ),
        )

        is BrowserEditToolbarAction.SearchActionsEndUpdated -> state.copy(
            editState = state.editState.copy(
                editActionsEnd = action.actions,
            ),
        )

        is BrowserDisplayToolbarAction.UpdateProgressBarConfig -> state.copy(
            displayState = state.displayState.copy(
                progressBarConfig = action.config,
            ),
        )

        is BrowserToolbarEvent,
            -> {
            // no-op
            // Expected to be handled in middlewares set by integrators.
            state
        }

        is BrowserEditToolbarAction.HintUpdated ->
            state.copy(editState = state.editState.copy(hint = action.hint))
    }
}
