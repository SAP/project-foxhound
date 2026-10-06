/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.theme.AcornTheme

/**
 * A warning dialog for when IP Protection proxy is not available.
 *
 * @param onDismiss Invoked on a dismiss request.
 * @param onTurnOffProxyClicked Invoked on turn off proxy request.
 * @param onOpenTabsTrayClicked Invoked on open tabs tray request.
 */
@Composable
fun IPProtectionUnavailableDialog(
    onDismiss: () -> Unit,
    onTurnOffProxyClicked: () -> Unit,
    onOpenTabsTrayClicked: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = {
            onDismiss()
        },
        title = {
            Text(
                text = stringResource(R.string.mozac_feature_ipprotection_unavaliable_dialog_title),
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
                style = AcornTheme.typography.headline5,
            )
        },
        text = {
            Text(
                text = stringResource(R.string.mozac_feature_ipprotection_unavaliable_dialog_body),
                modifier = Modifier.fillMaxWidth(),
                style = AcornTheme.typography.body2,
            )
        },
        confirmButton = {
            TextButton(
                text = stringResource(R.string.mozac_feature_ipprotection_unavaliable_dialog_confirm_button),
                onClick = {
                    onOpenTabsTrayClicked()
                },
            )
        },
        dismissButton = {
            TextButton(
                text = stringResource(R.string.mozac_feature_ipprotection_unavaliable_dialog_dismiss_button),
                onClick = {
                    onTurnOffProxyClicked()
                },
            )
        },
    )
}

@FlexibleWindowLightDarkPreview
@Composable
private fun IPProtectionUnavailableDialogPreview() {
    AcornTheme {
        IPProtectionUnavailableDialog(
            onDismiss = {},
            onOpenTabsTrayClicked = {},
            onTurnOffProxyClicked = {},
        )
    }
}
