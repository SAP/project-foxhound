/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.ui.edit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.exclude
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.search.RegionState
import mozilla.components.compose.base.Dropdown
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.DestructiveButton
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.compose.base.button.OutlinedButton
import mozilla.components.compose.base.menu.MenuItem
import mozilla.components.compose.base.modifier.thenConditional
import mozilla.components.compose.base.textfield.TextField
import mozilla.components.concept.engine.autofill.AddressStructure
import mozilla.components.concept.storage.Address
import mozilla.components.concept.storage.UpdatableAddressFields
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.address.store.AddressState
import org.mozilla.fenix.settings.address.store.AddressStore
import org.mozilla.fenix.settings.address.store.AddressStructureState
import org.mozilla.fenix.settings.address.store.CancelTapped
import org.mozilla.fenix.settings.address.store.DeleteTapped
import org.mozilla.fenix.settings.address.store.FormChange
import org.mozilla.fenix.settings.address.store.SaveTapped
import org.mozilla.fenix.settings.address.store.ViewAppeared
import org.mozilla.fenix.settings.address.store.isEditing
import org.mozilla.fenix.settings.address.utils.generateAddress
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.compose.base.text.Text as DropdownText

/**
 * The UI host for the Edit Address Screen.
 *
 * @param store the [AddressStore] used to power the screen.
 */
@Composable
fun EditAddressScreen(store: AddressStore) {
    Scaffold(
        topBar = {
            EditAddressTopBar(store)
        },
    ) { paddingValues ->
        val structureState by remember {
            store.stateFlow.map { it.structureState }
        }.collectAsState(initial = store.state.structureState)
        var hasRequestedFocus by remember { mutableStateOf(false) }
        val focusRequester = remember { FocusRequester() }

        LaunchedEffect(Unit) {
            store.dispatch(ViewAppeared)
        }

        LaunchedEffect(structureState) {
            if (!hasRequestedFocus && structureState is AddressStructureState.Loaded) {
                focusRequester.requestFocus()
                hasRequestedFocus = true
            }
        }

        DeleteAddressDialog(store)

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
            state = rememberLazyListState(),
            modifier = Modifier
                .padding(paddingValues)
                .consumeWindowInsets(paddingValues)
                .padding(
                    horizontal = FirefoxTheme.layout.space.static200,
                    vertical = FirefoxTheme.layout.space.static100,
                )
                .windowInsetsPadding(WindowInsets.ime.exclude(WindowInsets.navigationBars)),
        ) {
            val firstTextField = structureState.structure.fields.firstOrNull {
                it is AddressStructure.Field.TextField
            }

            items(
                items = structureState.structure.fields,
                key = { it.id.id },
            ) { item ->
                when (item) {
                    is AddressStructure.Field.TextField -> {
                        TextField(
                            store = store,
                            field = item,
                            modifier = Modifier.thenConditional(
                                Modifier.focusRequester(focusRequester),
                            ) { item == firstTextField },
                        )
                    }
                    is AddressStructure.Field.SelectField -> SelectField(store, field = item)
                }
            }

            item {
                if (structureState !is AddressStructureState.Inert) {
                    FormButtons(store)
                }
            }
        }
    }
}

@Composable
private fun TextField(
    store: AddressStore,
    field: AddressStructure.Field.TextField,
    modifier: Modifier = Modifier,
) {
    val value by remember { store.stateFlow.map { it.address.valueForID(field.id) } }
        .collectAsState(initial = store.state.address.valueForID(field.id))

    TextField(
        value = value,
        onValueChange = { store.dispatch(field.id.formChangeAction(it)) },
        placeholder = "",
        errorText = "",
        modifier = modifier.testTag(field.id.testTag),
        label = field.localizationKey.localizedString(),
    )
}

@Composable
private fun SelectField(
    store: AddressStore,
    field: AddressStructure.Field.SelectField,
) {
    val value by remember { store.stateFlow.map { it.address.valueForID(field.id) } }
        .collectAsState(store.state.address.valueForID(field.id))

    val items = field.options.map {
        MenuItem.CheckableItem(
            text = DropdownText.String(it.value),
            isChecked = value == it.key,
            testTag = field.id.testTag + ".${it.key}",
        ) {
            store.dispatch(field.id.formChangeAction(it.key))
        }
    }

    Dropdown(
        label = field.localizationKey.localizedString(),
        placeholder = "",
        dropdownItems = items,
        modifier = Modifier.testTag(field.id.testTag),
    )
}

@Composable
private fun FormButtons(store: AddressStore) {
    Row {
        if (store.state.isEditing) {
            DestructiveButton(
                text = stringResource(R.string.addressess_delete_address_button),
                modifier = Modifier.testTag(EditAddressTestTag.DELETE_BUTTON),
            ) {
                store.dispatch(DeleteTapped)
            }
        }

        Spacer(Modifier.weight(1f))

        OutlinedButton(
            text = stringResource(R.string.addresses_cancel_button),
            modifier = Modifier.testTag(EditAddressTestTag.CANCEL_BUTTON),
        ) {
            store.dispatch(CancelTapped)
        }

        Spacer(Modifier.width(8.dp))

        FilledButton(
            text = stringResource(R.string.addresses_save_button),
            modifier = Modifier.testTag(EditAddressTestTag.SAVE_BUTTON),
        ) {
            store.dispatch(SaveTapped)
        }
    }
}

private data class InvalidIDException(val id: String) : IllegalStateException("Invalid id: $id")

private fun UpdatableAddressFields.valueForID(id: AddressStructure.Field.ID) = when (id) {
    is AddressStructure.Field.ID.Name -> name
    is AddressStructure.Field.ID.Organization -> organization
    is AddressStructure.Field.ID.StreetAddress -> streetAddress
    is AddressStructure.Field.ID.AddressLevel1 -> addressLevel1
    is AddressStructure.Field.ID.AddressLevel2 -> addressLevel2
    is AddressStructure.Field.ID.AddressLevel3 -> addressLevel3
    is AddressStructure.Field.ID.PostalCode -> postalCode
    is AddressStructure.Field.ID.Country -> country
    is AddressStructure.Field.ID.Tel -> tel
    is AddressStructure.Field.ID.Email -> email
    is AddressStructure.Field.ID.Unknown -> throw InvalidIDException(id.value)
}

private fun AddressStructure.Field.ID.formChangeAction(value: String) = when (this) {
    is AddressStructure.Field.ID.Name -> FormChange.Name(value)
    is AddressStructure.Field.ID.Organization -> FormChange.Organization(value)
    is AddressStructure.Field.ID.StreetAddress -> FormChange.StreetAddress(value)
    is AddressStructure.Field.ID.AddressLevel1 -> FormChange.AddressLevel1(value)
    is AddressStructure.Field.ID.AddressLevel2 -> FormChange.AddressLevel2(value)
    is AddressStructure.Field.ID.AddressLevel3 -> FormChange.AddressLevel3(value)
    is AddressStructure.Field.ID.PostalCode -> FormChange.PostalCode(value)
    is AddressStructure.Field.ID.Country -> FormChange.Country(value)
    is AddressStructure.Field.ID.Tel -> FormChange.Tel(value)
    is AddressStructure.Field.ID.Email -> FormChange.Email(value)
    is AddressStructure.Field.ID.Unknown -> throw InvalidIDException(value)
}

private val AddressStructure.Field.ID.testTag: String
    get() = when (this) {
        is AddressStructure.Field.ID.Name -> EditAddressTestTag.NAME_FIELD
        is AddressStructure.Field.ID.Organization -> EditAddressTestTag.ORGANIZATION_FIELD
        is AddressStructure.Field.ID.StreetAddress -> EditAddressTestTag.STREET_ADDRESS_FIELD
        is AddressStructure.Field.ID.AddressLevel1 -> EditAddressTestTag.ADDRESS_LEVEL1_FIELD
        is AddressStructure.Field.ID.AddressLevel2 -> EditAddressTestTag.ADDRESS_LEVEL2_FIELD
        is AddressStructure.Field.ID.AddressLevel3 -> EditAddressTestTag.ADDRESS_LEVEL3_FIELD
        is AddressStructure.Field.ID.PostalCode -> EditAddressTestTag.POSTAL_CODE_FIELD
        is AddressStructure.Field.ID.Country -> EditAddressTestTag.COUNTRY_FIELD
        is AddressStructure.Field.ID.Tel -> EditAddressTestTag.TEL_FIELD
        is AddressStructure.Field.ID.Email -> EditAddressTestTag.EMAIL_FIELD
        is AddressStructure.Field.ID.Unknown -> throw InvalidIDException(value)
    }

@Composable
private fun AddressStructure.Field.LocalizationKey.localizedString() = when (this) {
    is AddressStructure.Field.LocalizationKey.Name -> stringResource(R.string.addresses_name)
    is AddressStructure.Field.LocalizationKey.Organization -> stringResource(R.string.addresses_organization)
    is AddressStructure.Field.LocalizationKey.StreetAddress -> stringResource(R.string.addresses_street_address)
    is AddressStructure.Field.LocalizationKey.Street -> stringResource(R.string.addresses_street_address)
    is AddressStructure.Field.LocalizationKey.Neighborhood -> stringResource(R.string.addresses_neighborhood)
    is AddressStructure.Field.LocalizationKey.VillageTownship -> stringResource(R.string.addresses_village_township)
    is AddressStructure.Field.LocalizationKey.Island -> stringResource(R.string.addresses_island)
    is AddressStructure.Field.LocalizationKey.Townland -> stringResource(R.string.addresses_townland)
    is AddressStructure.Field.LocalizationKey.City -> stringResource(R.string.addresses_city)
    is AddressStructure.Field.LocalizationKey.District -> stringResource(R.string.addresses_district)
    is AddressStructure.Field.LocalizationKey.PostTown -> stringResource(R.string.addresses_post_town)
    is AddressStructure.Field.LocalizationKey.Suburb -> stringResource(R.string.addresses_suburb)
    is AddressStructure.Field.LocalizationKey.Province -> stringResource(R.string.addresses_province)
    is AddressStructure.Field.LocalizationKey.State -> stringResource(R.string.addresses_state)
    is AddressStructure.Field.LocalizationKey.County -> stringResource(R.string.addresses_county)
    is AddressStructure.Field.LocalizationKey.Parish -> stringResource(R.string.addresses_parish)
    is AddressStructure.Field.LocalizationKey.Prefecture -> stringResource(R.string.addresses_prefecture)
    is AddressStructure.Field.LocalizationKey.Area -> stringResource(R.string.addresses_area)
    is AddressStructure.Field.LocalizationKey.DoSi -> stringResource(R.string.addresses_do_si)
    is AddressStructure.Field.LocalizationKey.Department -> stringResource(R.string.addresses_department)
    is AddressStructure.Field.LocalizationKey.Emirate -> stringResource(R.string.addresses_emirate)
    is AddressStructure.Field.LocalizationKey.Oblast -> stringResource(R.string.addresses_oblast)
    is AddressStructure.Field.LocalizationKey.Pin -> stringResource(R.string.addresses_pin)
    is AddressStructure.Field.LocalizationKey.PostalCode -> stringResource(R.string.addresses_postal_code)
    is AddressStructure.Field.LocalizationKey.Zip -> stringResource(R.string.addresses_zip)
    is AddressStructure.Field.LocalizationKey.Eircode -> stringResource(R.string.addresses_eircode)
    is AddressStructure.Field.LocalizationKey.Country -> stringResource(R.string.addresses_country)
    is AddressStructure.Field.LocalizationKey.CountryOnly -> stringResource(R.string.addresses_country_only)
    is AddressStructure.Field.LocalizationKey.Tel -> stringResource(R.string.addresses_phone)
    is AddressStructure.Field.LocalizationKey.Email -> stringResource(R.string.addresses_email)
    is AddressStructure.Field.LocalizationKey.Unknown -> key
}

private fun createStore(
    region: RegionState? = null,
    address: Address? = null,
) = AddressStore(
    initialState = AddressState.initial(region = region, address = address).copy(
        structureState = AddressStructureState.Loaded(
            structure = AddressStructure(
                fields = listOf(
                    AddressStructure.Field.TextField(
                        AddressStructure.Field.ID.Name,
                        AddressStructure.Field.LocalizationKey.Name,
                    ),
                    AddressStructure.Field.TextField(
                        AddressStructure.Field.ID.Organization,
                        AddressStructure.Field.LocalizationKey.Organization,
                    ),
                    AddressStructure.Field.TextField(
                        AddressStructure.Field.ID.StreetAddress,
                        AddressStructure.Field.LocalizationKey.StreetAddress,
                    ),
                ),
            ),
        ),
    ),
    listOf(),
).also { it.dispatch(ViewAppeared) }

@FlexibleWindowPreview
@Composable
private fun AddAddressPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    val store = createStore()

    FirefoxTheme(theme) {
        EditAddressScreen(store)
    }
}

@FlexibleWindowPreview
@Composable
private fun EditAddressPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    val store = createStore(
        address = generateAddress(),
    )

    FirefoxTheme(theme) {
        EditAddressScreen(store)
    }
}
