/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.creditcards

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import mozilla.components.concept.storage.CreditCard
import mozilla.components.concept.storage.CreditCardsAddressesStorage
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.list.TextListItem
import org.mozilla.fenix.debugsettings.addresses.FakeCreditCardsAddressesStorage
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import mozilla.components.ui.icons.R as iconsR

/**
 * CreditCards UI for the debug drawer that displays various creditCards related tools.
 */
@Composable
fun CreditCardsTools(
    creditCardsAddressesStorage: CreditCardsAddressesStorage,
) {
    val scope = rememberCoroutineScope()
    var creditCards by remember { mutableStateOf(listOf<CreditCard>()) }
    LaunchedEffect(Unit) {
        creditCards = creditCardsAddressesStorage.getAllCreditCards()
    }
    val onAddCreditCard: () -> Unit = {
        scope.launch {
            creditCardsAddressesStorage.addCreditCard(FakeCreditCardsAddressesStorage.generateCreditCard())
            creditCards = creditCardsAddressesStorage.getAllCreditCards()
        }
    }
    val onDeleteCreditCard: (CreditCard) -> Unit = { creditCard ->
        scope.launch {
            creditCardsAddressesStorage.deleteCreditCard(creditCard.guid)
            creditCards = creditCardsAddressesStorage.getAllCreditCards()
        }
    }
    val onDeleteAllCreditCards: () -> Unit = {
        scope.launch {
            creditCardsAddressesStorage.getAllCreditCards().forEach { creditCard ->
                creditCardsAddressesStorage.deleteCreditCard(creditCard.guid)
            }
            creditCards = creditCardsAddressesStorage.getAllCreditCards()
        }
    }

    Surface {
        CreditCardsContent(
            creditCards = creditCards,
            onAddCreditCardClick = onAddCreditCard,
            onDeleteCreditCardClick = onDeleteCreditCard,
            onDeleteAllCreditCardsClick = onDeleteAllCreditCards,
        )
    }
}

@Composable
private fun CreditCardsContent(
    creditCards: List<CreditCard>,
    onAddCreditCardClick: () -> Unit,
    onDeleteCreditCardClick: (CreditCard) -> Unit,
    onDeleteAllCreditCardsClick: () -> Unit,
) {
    Column {
        Text(
            text = stringResource(R.string.debug_drawer_credit_cards_title),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = FirefoxTheme.typography.headline7,
        )

        Spacer(Modifier.height(8.dp))

        FilledButton(
            text = stringResource(R.string.debug_drawer_add_new_credit_card),
            modifier = Modifier.fillMaxWidth(),
            onClick = { onAddCreditCardClick() },
        )

        Spacer(Modifier.height(8.dp))

        FilledButton(
            text = stringResource(R.string.debug_drawer_delete_all_credit_cards),
            modifier = Modifier.fillMaxWidth(),
            onClick = onDeleteAllCreditCardsClick,
        )

        Spacer(Modifier.height(8.dp))

        Column {
            creditCards.forEach { creditCard ->
                TextListItem(
                    label = creditCard.cardNumberLast4,
                    description = creditCard.billingName,
                    iconPainter = painterResource(iconsR.drawable.mozac_ic_delete_24),
                    onIconClick = { onDeleteCreditCardClick(creditCard) },
                )
            }
        }
    }
}

@Preview
@Composable
private fun CreditCardsScreenPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        CreditCardsTools(
            creditCardsAddressesStorage = FakeCreditCardsAddressesStorage(),
        )
    }
}
