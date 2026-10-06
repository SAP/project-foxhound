/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * A Store for handling [AddressState] and dispatching [AddressAction].
 *
 * @param initialState The initial state for the Store.
 * @param middleware Middleware to handle side-effects in response to dispatched actions.
 */
class AddressStore(
    initialState: AddressState,
    middleware: List<Middleware<AddressState, AddressAction>>,
) : Store<AddressState, AddressAction>(initialState, ::addressReducer, middleware)
