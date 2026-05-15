/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.creditcards.ui

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import mozilla.components.compose.base.button.TextButton
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme

/**
 * Composable for the delete credit card dialog.
 *
 * @param modifier The [Modifier] to be applied to the dialog.
 * @param onCancel The callback to be invoked when the cancel button is clicked.
 * @param onConfirm The callback to be invoked when the confirm button is clicked.
 */
@Composable
internal fun DeleteCreditCardDialog(
    modifier: Modifier = Modifier,
    onCancel: () -> Unit = {},
    onConfirm: () -> Unit = {},
) {
    AlertDialog(
        modifier = modifier,
        text = {
            Text(
                text = stringResource(R.string.credit_cards_delete_dialog_confirmation_2),
                style = FirefoxTheme.typography.body2,
            )
        },
        onDismissRequest = onCancel,
        confirmButton = {
            TextButton(
                modifier = Modifier.testTag(CreditCardEditorTestTags.DELETE_DIALOG_DELETE_BUTTON),
                text = stringResource(R.string.credit_cards_delete_dialog_button),
                onClick = onConfirm,
            )
        },
        dismissButton = {
            TextButton(
                modifier = Modifier.testTag(CreditCardEditorTestTags.DELETE_DIALOG_CANCEL_BUTTON),
                text = stringResource(R.string.credit_cards_cancel_button),
                onClick = onCancel,
            )
        },
    )
}

@Composable
@Preview
private fun PreviewDeleteCreditCardDialog(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) = FirefoxTheme(theme) {
    DeleteCreditCardDialog()
}
