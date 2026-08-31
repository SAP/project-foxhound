/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.addresses

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import mozilla.components.compose.base.button.FilledButton
import mozilla.components.concept.storage.Address
import mozilla.components.concept.storage.CreditCardsAddressesStorage
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.RadioButtonListItem
import org.mozilla.fenix.compose.list.SwitchListItem
import org.mozilla.fenix.compose.list.TextListItem
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * Addresses UI for the debug drawer that displays various addresses related tools.
 */
@Composable
fun AddressesTools(
    debugRegionRepository: AddressesDebugRegionRepository,
    creditCardsAddressesStorage: CreditCardsAddressesStorage,
) {
    var possibleDebugRegions by remember {
        mutableStateOf(debugRegionRepository.initialEnabledState())
    }
    val onRegionToggled = { region: DebugRegion, isEnabled: Boolean ->
        debugRegionRepository.setRegionEnabled(region, isEnabled)
        possibleDebugRegions = possibleDebugRegions.updateRegionEnabled(region, isEnabled)
    }

    val scope = rememberCoroutineScope()
    var addresses by remember { mutableStateOf(listOf<Address>()) }
    LaunchedEffect(Unit) {
        addresses = creditCardsAddressesStorage.getAllAddresses()
    }
    val onAddAddress: (String) -> Unit = { selectedLangTag ->
        scope.launch {
            creditCardsAddressesStorage.addAddress(selectedLangTag.generateFakeAddressForLangTag())
            addresses = creditCardsAddressesStorage.getAllAddresses()
        }
    }
    val onDeleteAddress: (Address) -> Unit = { address ->
        scope.launch {
            creditCardsAddressesStorage.deleteAddress(address.guid)
            addresses = creditCardsAddressesStorage.getAllAddresses()
        }
    }
    val onDeleteAllAddresses: () -> Unit = {
        scope.launch {
            creditCardsAddressesStorage.getAllAddresses().forEach { address ->
                creditCardsAddressesStorage.deleteAddress(address.guid)
            }
            addresses = creditCardsAddressesStorage.getAllAddresses()
        }
    }

    Surface {
        AddressesContent(
            debugRegionStates = possibleDebugRegions,
            onRegionToggled = onRegionToggled,
            addresses = addresses,
            onAddAddressClick = onAddAddress,
            onDeleteAddressClick = onDeleteAddress,
            onDeleteAllAddressesClick = onDeleteAllAddresses,
        )
    }
}

@Composable
private fun AddressesContent(
    debugRegionStates: List<DebugRegionEnabledState>,
    onRegionToggled: (DebugRegion, Boolean) -> Unit,
    addresses: List<Address>,
    onAddAddressClick: (region: String) -> Unit,
    onDeleteAddressClick: (Address) -> Unit,
    onDeleteAllAddressesClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .padding(all = 16.dp)
            .verticalScroll(state = rememberScrollState()),
    ) {
        Text(
            text = stringResource(R.string.debug_drawer_addresses_title),
            style = FirefoxTheme.typography.headline5,
        )

        Spacer(Modifier.height(16.dp))

        DebugRegionsToEnableSection(
            debugRegionStates = debugRegionStates,
            onRegionToggled = onRegionToggled,
        )

        Spacer(Modifier.height(16.dp))

        AddressesManagementSection(
            addresses = addresses,
            onAddAddressClick = onAddAddressClick,
            onDeleteAddressClick = onDeleteAddressClick,
            onDeleteAllAddressesClick = onDeleteAllAddressesClick,
        )
    }
}

@Composable
private fun DebugRegionsToEnableSection(
    debugRegionStates: List<DebugRegionEnabledState>,
    onRegionToggled: (DebugRegion, Boolean) -> Unit,
) {
    Text(
        text = stringResource(R.string.debug_drawer_addresses_debug_locales_header),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        style = FirefoxTheme.typography.headline7,
    )

    Column {
        debugRegionStates.forEach { debugLocaleState ->
            SwitchListItem(
                label = debugLocaleState.region.name,
                checked = debugLocaleState.enabled,
                showSwitchAfter = true,
                onClick = { onRegionToggled(debugLocaleState.region, it) },
            )
        }
    }
}

@Composable
private fun AddressesManagementSection(
    addresses: List<Address>,
    onAddAddressClick: (locale: String) -> Unit,
    onDeleteAddressClick: (Address) -> Unit,
    onDeleteAllAddressesClick: () -> Unit,
) {
    val possibleLocales = remember { FakeCreditCardsAddressesStorage.getAllPossibleLocaleLangTags() }
    var selectedLocaleLangTagForAddingAddress by remember { mutableStateOf(possibleLocales.first()) }

    Column {
        Text(
            text = stringResource(R.string.debug_drawer_addresses_management_header),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = FirefoxTheme.typography.headline7,
        )

        Column {
            possibleLocales.forEach { langTag ->
                RadioButtonListItem(
                    label = langTag,
                    selected = langTag == selectedLocaleLangTagForAddingAddress,
                    onClick = { selectedLocaleLangTagForAddingAddress = langTag },
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        FilledButton(
            text = stringResource(R.string.debug_drawer_add_new_address),
            modifier = Modifier.fillMaxWidth(),
            onClick = { onAddAddressClick(selectedLocaleLangTagForAddingAddress) },
        )

        FilledButton(
            text = stringResource(R.string.debug_drawer_delete_all_addresses),
            modifier = Modifier.fillMaxWidth(),
            onClick = onDeleteAllAddressesClick,
        )

        Spacer(Modifier.height(8.dp))

        Column {
            addresses.forEach { address ->
                TextListItem(
                    label = address.name,
                    description = address.addressLabel,
                    iconPainter = painterResource(iconsR.drawable.mozac_ic_delete_24),
                    onIconClick = { onDeleteAddressClick(address) },
                )
            }
        }
    }
}

private data class DebugRegionEnabledState(
    val region: DebugRegion,
    val enabled: Boolean,
)

private fun AddressesDebugRegionRepository.initialEnabledState(): List<DebugRegionEnabledState> =
    DebugRegion.entries.map { debugRegion ->
        DebugRegionEnabledState(
            region = debugRegion,
            enabled = isRegionEnabled(debugRegion),
        )
    }

private fun List<DebugRegionEnabledState>.updateRegionEnabled(regionToUpdate: DebugRegion, isEnabled: Boolean) =
    this.map { regionState ->
        if (regionState.region == regionToUpdate) {
            regionState.copy(enabled = isEnabled)
        } else {
            regionState
        }
    }

@Preview
@Composable
private fun AddressesScreenPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        AddressesTools(
            debugRegionRepository = FakeAddressesDebugRegionRepository(),
            creditCardsAddressesStorage = FakeCreditCardsAddressesStorage(),
        )
    }
}
