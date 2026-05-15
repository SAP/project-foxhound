/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.topsites

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import org.mozilla.focus.R
import org.mozilla.focus.ui.dialog.DialogButtonConfig
import org.mozilla.focus.ui.dialog.DialogInputField
import org.mozilla.focus.ui.dialog.FocusDialog

/**
 * Display a dialog for renaming a top site.
 *
 * @param currentName The current name of the top site.
 * @param onConfirm Callback invoked when the user confirms the rename operation.
 * The new name is passed as an argument.
 * @param onDismiss Callback invoked when the dialog is dismissed, either by pressing
 * the cancel button or by tapping outside the dialog.
 */
@Composable
fun RenameTopSiteDialog(
    currentName: String,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var text by remember { mutableStateOf(currentName) }

    FocusDialog(
        dialogTitle = stringResource(R.string.rename_top_site),
        dialogTextComposable = {
            DialogInputField(
                text = text,
                placeholder = { Text(stringResource(id = R.string.placeholder_rename_top_site)) },
            ) { newText -> text = newText }
        },
        onDismissRequest = { onDismiss.invoke() },
        confirmButtonConfig = DialogButtonConfig(
            text = stringResource(android.R.string.ok),
            onClick = { onConfirm.invoke(text) },
            enabled = text.isNotEmpty(),
        ),
        dismissButtonConfig = DialogButtonConfig(
            text = stringResource(android.R.string.cancel),
            onClick = { onDismiss.invoke() },
        ),
    )
}
