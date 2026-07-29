/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowLightDarkPreview
import mozilla.components.compose.base.button.TextButton
import mozilla.components.compose.base.textfield.TextField
import mozilla.components.support.ktx.kotlin.isUrl
import mozilla.components.support.ktx.kotlin.toNormalizedUrl
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme

@Composable
internal fun AddShortcutDialog(
    onDismiss: () -> Unit,
    onConfirm: (title: String, url: String) -> Unit,
) {
    var url by remember { mutableStateOf("") }
    var shortcutName by remember { mutableStateOf("") }
    var urlError by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = stringResource(R.string.homepage_shortcuts_add_website_title),
                style = FirefoxTheme.typography.headline5,
            )
        },
        text = {
            AddShortcutDialogContent(
                url = url,
                urlError = urlError,
                shortcutName = shortcutName,
                focusRequester = focusRequester,
                onUrlChange = {
                    url = it
                    urlError = false
                },
                onTitleChange = { shortcutName = it },
            )
        },
        confirmButton = {
            TextButton(
                text = stringResource(R.string.top_sites_edit_dialog_save),
                onClick = {
                    if (url.isUrl()) {
                        onConfirm(shortcutName, url.toNormalizedUrl())
                    } else {
                        urlError = true
                    }
                },
                enabled = url.isNotBlank() && shortcutName.isNotBlank(),
            )
        },
        dismissButton = {
            TextButton(
                text = stringResource(R.string.top_sites_rename_dialog_cancel),
                onClick = onDismiss,
            )
        },
    )
}

@Composable
private fun AddShortcutDialogContent(
    url: String,
    urlError: Boolean,
    shortcutName: String,
    focusRequester: FocusRequester,
    onUrlChange: (String) -> Unit,
    onTitleChange: (String) -> Unit,
) {
    Column {
        TextField(
            value = url,
            onValueChange = onUrlChange,
            placeholder = "",
            errorText = stringResource(R.string.top_sites_edit_dialog_url_error),
            label = stringResource(R.string.top_sites_edit_dialog_url_title),
            isError = urlError,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            modifier = Modifier.focusRequester(focusRequester),
        )

        Spacer(modifier = Modifier.height(16.dp))

        TextField(
            value = shortcutName,
            onValueChange = onTitleChange,
            placeholder = "",
            errorText = "",
            label = stringResource(R.string.shortcut_name_hint),
        )
    }
}

@Composable
@FlexibleWindowLightDarkPreview
private fun AddShortcutDialogPreview() {
    FirefoxTheme {
        Surface {
            AddShortcutDialog(
                onDismiss = {},
                onConfirm = { _, _ -> },
            )
        }
    }
}
