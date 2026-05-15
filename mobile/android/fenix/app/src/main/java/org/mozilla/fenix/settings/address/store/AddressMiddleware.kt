/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.store

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.GleanMetrics.Addresses

/**
 * Middleware that handles [AddressStore] side-effects.
 *
 * @param environment used to hold the dependencies.
 * @param scope a [CoroutineScope] used to launch coroutines.
 * @param mainDispatcher the dispatcher to run UI-related code on.
 * @param ioDispatcher the dispatcher to run background code on.
 */
class AddressMiddleware(
    private val environment: AddressEnvironment,
    private val scope: CoroutineScope,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val ioDispatcher: CoroutineDispatcher = IO,
) : Middleware<AddressState, AddressAction> {
    override fun invoke(
        store: Store<AddressState, AddressAction>,
        next: (AddressAction) -> Unit,
        action: AddressAction,
    ) {
        next(action)
        when (action) {
            is SaveTapped -> runAndNavigateBack {
                store.state.guidToUpdate?.let {
                    environment.updateAddress(it, store.state.address)
                    Addresses.updated.add()
                } ?: run {
                    environment.createAddress(store.state.address)
                    Addresses.saved.add()
                }
            }
            is DeleteDialogAction.DeleteTapped -> runAndNavigateBack {
                store.state.guidToUpdate?.also {
                    environment.deleteAddress(it)
                    Addresses.deleted.add()
                }
            }
            BackTapped, CancelTapped -> environment.navigateBack()
            else -> {} // noop
        }
    }

    private fun runAndNavigateBack(action: suspend () -> Unit) = scope.launch(ioDispatcher) {
        action()

        withContext(mainDispatcher) {
            environment.navigateBack()
        }
    }
}
