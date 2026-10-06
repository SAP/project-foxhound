/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.creditcards.ui

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * A Store for handling [CreditCardEditorState] and dispatching [CreditCardEditorAction].
 */
class CreditCardEditorStore(
    initialState: CreditCardEditorState,
    reducer: Reducer<CreditCardEditorState, CreditCardEditorAction> = ::creditCardEditorReducer,
    middleware: List<Middleware<CreditCardEditorState, CreditCardEditorAction>> = listOf(),
) : Store<CreditCardEditorState, CreditCardEditorAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
)
