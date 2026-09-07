/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.store

import mozilla.components.browser.state.search.RegionState
import mozilla.components.concept.engine.autofill.AddressStructure
import mozilla.components.concept.storage.Address
import mozilla.components.concept.storage.UpdatableAddressFields
import mozilla.components.lib.state.State

private const val DEFAULT_COUNTRY = "US"

/**
 * Represents the state of the deletion dialog.
 */
sealed class DialogState {
    /**
     * Waiting to be presented.
     */
    data object Inert : DialogState()

    /**
     * Currently being presented.
     */
    data object Presenting : DialogState()
}

/**
 * Represents the various states of loading an [AddressStructure].
 */
sealed class AddressStructureState {
    /**
     * Provides convenient access to the underlying [AddressStructure]
     */
    abstract val structure: AddressStructure

    /**
     * The initial state before a structure is loaded
     */
    data object Inert : AddressStructureState() {
        /**
         * Provides a default address structure of an empty list of fields.
         */
        override val structure: AddressStructure
            get() = AddressStructure(listOf())
    }

    /**
     * Represents the state of a loaded [AddressStructure].
     */
    data class Loaded(override val structure: AddressStructure) : AddressStructureState()
}

/**
 * Represents the state of the Bookmarks list screen and its various subscreens.
 *
 * @property guidToUpdate guid of the address we are editing.
 * @property address updatable properties of the address.
 * @property structureState the address structure used render the address edtior.
 * @property deleteDialog state for the dialog that is presented when deleting an address.
 */
data class AddressState(
    val guidToUpdate: String?,
    val address: UpdatableAddressFields,
    val structureState: AddressStructureState = AddressStructureState.Inert,
    val deleteDialog: DialogState = DialogState.Inert,
) : State {
    /**
     * Static functions for [AddressState]
     */
    companion object {
        /**
         * Creates a new [AddressState] with [UpdatableAddressFields] pre-filled with the values from
         * [Address].
         *
         * @param region The current [RegionState] of a user.
         * @param address [Address] for creating the [UpdatableAddressFields].
         */
        fun initial(
            region: RegionState? = null,
            address: Address? = null,
        ): AddressState {
            // We want to use the country unless it is empty, we fall back to the users region unless
            // it hasn't loaded yet meaning that we will have the Default value of XX falling back to
            // DEFAULT_COUNTRY.
            val countryCode = address?.country?.takeUnless { it.isEmpty() }
                ?: (region?.takeUnless { it == RegionState.Default })?.home
                ?: DEFAULT_COUNTRY

            return AddressState(
                guidToUpdate = address?.guid,
                address = UpdatableAddressFields(
                    name = address?.name ?: "",
                    organization = address?.organization ?: "",
                    streetAddress = address?.streetAddress ?: "",
                    addressLevel3 = address?.addressLevel3 ?: "",
                    addressLevel2 = address?.addressLevel2 ?: "",
                    addressLevel1 = address?.addressLevel1 ?: "",
                    postalCode = address?.postalCode ?: "",
                    country = countryCode,
                    tel = address?.tel ?: "",
                    email = address?.email ?: "",
                ),
            )
        }
    }
}

internal val AddressState.isEditing: Boolean
    get() = guidToUpdate != null

internal fun AddressState.update(transform: UpdatableAddressFields.() -> UpdatableAddressFields): AddressState {
    return copy(address = address.transform())
}
