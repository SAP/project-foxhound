/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.emailmasks

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * A Store for handling [EmailMasksStore] and dispatching [EmailMasksAction].
 *
 * @param initialState The initial state of the Store.
 * @param reducer Reducer to handle state updates based on dispatched actions.
 * @param middleware A list of Middleware to handle side-effects in response to dispatched actions.
 */
class EmailMasksStore(
    initialState: EmailMasksState,
    reducer: Reducer<EmailMasksState, EmailMasksAction> = ::emailMasksReducer,
    middleware: List<Middleware<EmailMasksState, EmailMasksAction>>,
) : Store<EmailMasksState, EmailMasksAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
)

/**
 * Function for reducing [EmailMasksState] in response to [EmailMasksAction]s.
 */
internal fun emailMasksReducer(state: EmailMasksState, action: EmailMasksAction) = when (action) {
    is EmailMasksUserAction -> state.handleUserAction(action)
    is EmailMasksSystemAction -> state.handleSystemAction(action)
}

private fun EmailMasksState.handleUserAction(action: EmailMasksUserAction): EmailMasksState =
    when (action) {
        is EmailMasksUserAction.SuggestEmailMasksEnabled ->
            copy(isSuggestMasksEnabled = true)

        is EmailMasksUserAction.SuggestEmailMasksDisabled ->
            copy(isSuggestMasksEnabled = false)

        is EmailMasksUserAction.ManageClicked,
        is EmailMasksUserAction.LearnMoreClicked,
            -> this
    }

private fun EmailMasksState.handleSystemAction(action: EmailMasksSystemAction): EmailMasksState =
    when (action) {
        is EmailMasksSystemAction.ManageTabOpened,
        is EmailMasksSystemAction.LearnMoreTabOpened,
            -> this
    }
