/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.autofill.ui

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * A Store for handling [AutofillSettingsState] and dispatching [AutofillSettingsAction].
 *
 * @param initialState The initial state for the Store.
 * @param reducer Reducer to handle state updates based on dispatched actions.
 * @param middleware Middleware to handle side-effects in response to dispatched actions.
 */
internal class AutofillSettingsStore(
    initialState: AutofillSettingsState = AutofillSettingsState.default,
    reducer: Reducer<AutofillSettingsState, AutofillSettingsAction> = ::autofillSettingsReducer,
    middleware: List<Middleware<AutofillSettingsState, AutofillSettingsAction>> = listOf(),
) : Store<AutofillSettingsState, AutofillSettingsAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = middleware,
) {
    init {
        dispatch(InitializeAddressesAndCreditCards)
    }
}
