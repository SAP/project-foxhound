/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.biometric.ui.state

import mozilla.components.lib.state.Reducer
import mozilla.components.lib.state.Store

/**
 * The store for the secure screen.
 *
 * @param initialState The initial state of the secure screen.
 * @param reducer The reducer for the secure screen.
 */
class SecureScreenStore(
    initialState: SecureScreenState = SecureScreenState.Initial,
    reducer: Reducer<SecureScreenState, SecureScreenAction> = ::secureScreenReducer,
) : Store<SecureScreenState, SecureScreenAction>(
    initialState = initialState,
    reducer = reducer,
    middleware = emptyList(),
)
