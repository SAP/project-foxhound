/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.store

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.concept.engine.autofill.AddressStructure
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store

/**
 * Exception that is thrown when we encounter an unknown address field ID.
 *
 * @property countryCode used to load the address structure.
 * @property id that was unexpected.
 */
data class UnknownID(
    val countryCode: String,
    val id: String,
) : IllegalStateException("Unknown ID: $id in: $countryCode")

/**
 * Exception that is submitted when we encounter an unknown localization key.
 *
 * @property countryCode used to load the address structure.
 * @property key that was unexpected.
 */
data class UnknownLocalizationKey(
    val countryCode: String,
    val key: String,
) : IllegalStateException("Unknown localization key: $key in: $countryCode")

/**
 * Middleware that handles [AddressStore] side-effects.
 *
 * @param environment used to hold the dependencies.
 * @param scope a [CoroutineScope] used to launch coroutines.
 * @param ioDispatcher the dispatcher to run background code on.
 */
class AddressStructureMiddleware(
    private val environment: AddressEnvironment,
    private val scope: CoroutineScope,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) : Middleware<AddressState, AddressAction> {
    override fun invoke(
        store: Store<AddressState, AddressAction>,
        next: (AddressAction) -> Unit,
        action: AddressAction,
    ) {
        val preReductionCountry = store.state.address.country
        next(action)

        when (action) {
            is ViewAppeared -> loadAddressStructure(store, true)
            is FormChange.Country -> if (preReductionCountry != store.state.address.country) {
                loadAddressStructure(store, false)
            }
            else -> { /* noop */ }
        }
    }

    private fun loadAddressStructure(
        store: Store<AddressState, AddressAction>,
        initialLoad: Boolean,
    ) = scope.launch(ioDispatcher) {
        val structure = environment.getAddressStructure(store.state.address.country)
        structure.validate(store.state.address.country)
        store.dispatch(
            AddressStructureLoaded(
                structure,
                initialLoad,
            ),
        )
    }

    private fun AddressStructure.validate(countryCode: String) {
        for (field in fields) {
            val id = field.id
            val localizationKey = field.localizationKey

            if (id is AddressStructure.Field.ID.Unknown) {
                throw UnknownID(countryCode, id.value)
            }

            if (localizationKey is AddressStructure.Field.LocalizationKey.Unknown) {
                environment.submitCaughtException(
                    UnknownLocalizationKey(countryCode, localizationKey.value),
                )
            }
        }
    }
}
