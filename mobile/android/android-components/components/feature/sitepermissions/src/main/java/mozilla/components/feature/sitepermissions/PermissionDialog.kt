/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.sitepermissions

import androidx.annotation.DrawableRes
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewLightDark
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.theme.AcornTheme
import mozilla.components.compose.base.theme.acornPrivateColorScheme
import mozilla.components.compose.base.theme.privateColorPalette
import mozilla.components.support.ktx.util.PromptAbuserDetector
import mozilla.components.ui.icons.R as iconsR

/**
 * Reusable composable for a permission dialog.
 * Includes a [PromptAbuserDetector] to better control dialog abuse.
 *
 * @param title Text displayed as the dialog title.
 * @param message The message text providing additional information.
 * @param icon Optional drawable resource for an icon.
 * @param positiveButtonLabel Text label for the positive action button.
 * @param negativeButtonLabel Text label for the negative action button.
 * @param dialogAbuseMillisLimit Represents a customized timeout used to avoid prompt abuse.
 * @param onConfirmRequest Action to perform when the positive button is clicked.
 * @param onDismissRequest Action to perform on dialog dismissal.
 */
@Composable
fun PermissionDialog(
    title: String,
    message: String,
    @DrawableRes icon: Int? = null,
    positiveButtonLabel: String,
    negativeButtonLabel: String,
    dialogAbuseMillisLimit: Int = 0,
    onConfirmRequest: () -> Unit,
    onDismissRequest: () -> Unit,
) {
    val promptAbuserDetector =
        PromptAbuserDetector(dialogAbuseMillisLimit)

    LaunchedEffect(Unit) {
        promptAbuserDetector.updateJSDialogAbusedState()
    }

    AlertDialog(
        icon = {
            icon?.let {
                Icon(
                    painter = painterResource(icon),
                    contentDescription = null,
                )
            }
        },
        title = {
            Text(
                text = title,
                style = AcornTheme.typography.headline5,
            )
        },
        text = {
            Text(
                text = message,
                style = AcornTheme.typography.body2,
            )
        },
        confirmButton = {
            TextButton(
                text = positiveButtonLabel,
                onClick = {
                    if (promptAbuserDetector.areDialogsBeingAbused()) {
                        promptAbuserDetector.updateJSDialogAbusedState()
                    } else {
                        onConfirmRequest()
                        onDismissRequest()
                    }
                },
            )
        },
        dismissButton = {
            TextButton(
                text = negativeButtonLabel,
                onClick = onDismissRequest,
            )
        },
        onDismissRequest = onDismissRequest,
    )
}

@PreviewLightDark
@Composable
private fun PermissionDialogPreview() {
    AcornTheme {
        PermissionDialog(
            icon = iconsR.drawable.mozac_ic_notification_24,
            message = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sodales laoreet commodo.",
            title = "Dialog title",
            positiveButtonLabel = "Go to settings",
            negativeButtonLabel = "Cancel",
            onConfirmRequest = {},
            onDismissRequest = {},
        )
    }
}

@Preview
@Composable
private fun PermissionDialogPrivatePreview() {
    AcornTheme(
        colors = privateColorPalette,
        colorScheme = acornPrivateColorScheme(),
    ) {
        PermissionDialog(
            icon = iconsR.drawable.mozac_ic_notification_24,
            message = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sodales laoreet commodo.",
            title = "Dialog title",
            positiveButtonLabel = "Go to settings",
            negativeButtonLabel = "Cancel",
            onConfirmRequest = {},
            onDismissRequest = {},
        )
    }
}
