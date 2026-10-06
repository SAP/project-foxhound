/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import mozilla.components.compose.base.theme.AcornTheme

/**
 * A loading dialog for an in-progress import flow. Displays a spinner with fixed title/description
 * while the importer is working, and a cancel action that invokes [onCancel].
 *
 * The caller is responsible for hiding this dialog by observing the importer state and only
 * composing it while the import is in progress.
 */
@Composable
internal fun PasswordsImporterDialog(
    onCancel: () -> Unit,
) {
    AlertDialog(
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
        ),
        onDismissRequest = { },
        icon = {
            CircularProgressIndicator(modifier = Modifier.size(24.dp))
        },
        title = {
            Text(
                text = stringResource(R.string.mozac_feature_passwords_importer_dialog_title),
                style = AcornTheme.typography.headline5,
            )
        },
        text = {
            Text(
                text = stringResource(R.string.mozac_feature_passwords_importer_dialog_description),
                style = AcornTheme.typography.headline7,
            )
        },
        confirmButton = {
            TextButton(onClick = onCancel) {
                Text(text = stringResource(R.string.mozac_feature_passwords_importer_dialog_cancel))
            }
        },
    )
}
