/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.store

import mozilla.components.concept.engine.autofill.AddressStructure
import mozilla.components.concept.storage.UpdatableAddressFields

/**
 * Function for reducing a new address state based on the received action.
 */
fun addressReducer(state: AddressState, action: AddressAction): AddressState {
    return when (action) {
        is FormChange.Name -> state.update { copy(name = action.updatedText) }
        is FormChange.Organization -> state.update { copy(organization = action.updatedText) }
        is FormChange.StreetAddress -> state.update { copy(streetAddress = action.updatedText) }
        is FormChange.AddressLevel1 -> state.update { copy(addressLevel1 = action.updatedText) }
        is FormChange.AddressLevel2 -> state.update { copy(addressLevel2 = action.updatedText) }
        is FormChange.AddressLevel3 -> state.update { copy(addressLevel3 = action.updatedText) }
        is FormChange.PostalCode -> state.update { copy(postalCode = action.updatedText) }
        is FormChange.Country -> state.update { copy(country = action.countryCode) }
        is FormChange.Tel -> state.update { copy(tel = action.updatedText) }
        is FormChange.Email -> state.update { copy(email = action.updatedText) }
        is DeleteTapped -> state.copy(deleteDialog = DialogState.Presenting)
        is DeleteDialogAction.CancelTapped -> state.copy(deleteDialog = DialogState.Inert)
        is AddressStructureLoaded -> state.copy(
            structureState = AddressStructureState.Loaded(action.structure),
        ).update {
            // We don't want to reset the values on the initial load of the form so bail out early.
            if (action.initialLoad && state.guidToUpdate != null) {
                return@update this
            }

            // Always clear select values because they are not persisted between countries.
            // For example from US with state NY, we don't want the address-level1 to be NY
            // when changing to another country that doesn't have state options
            val initialState = this.copy(addressLevel1 = "")

            // We want to pre-select a field
            action.structure.fields.fold(initialState) { acc, field ->
                if (field is AddressStructure.Field.SelectField) {
                    acc.update(field)
                } else {
                    acc
                }
            }
        }
        is DeleteDialogAction.DeleteTapped, ViewAppeared,
        is BackTapped, CancelTapped, SaveTapped,
            -> state
    }
}

private fun UpdatableAddressFields.update(field: AddressStructure.Field.SelectField) = when (field.id) {
    AddressStructure.Field.ID.AddressLevel1 -> copy(addressLevel1 = field.value)
    AddressStructure.Field.ID.AddressLevel2 -> copy(addressLevel2 = field.value)
    AddressStructure.Field.ID.AddressLevel3 -> copy(addressLevel3 = field.value)
    AddressStructure.Field.ID.Country -> copy(country = field.value)
    AddressStructure.Field.ID.Email -> copy(email = field.value)
    AddressStructure.Field.ID.Name -> copy(name = field.value)
    AddressStructure.Field.ID.Organization -> copy(organization = field.value)
    AddressStructure.Field.ID.PostalCode -> copy(postalCode = field.value)
    AddressStructure.Field.ID.StreetAddress -> copy(streetAddress = field.value)
    AddressStructure.Field.ID.Tel -> copy(tel = field.value)
    is AddressStructure.Field.ID.Unknown -> this
}

private val AddressStructure.Field.SelectField.value: String
    get() = defaultSelectionKey.takeUnless { it.isEmpty() } ?: options.firstOrNull()?.key ?: ""
