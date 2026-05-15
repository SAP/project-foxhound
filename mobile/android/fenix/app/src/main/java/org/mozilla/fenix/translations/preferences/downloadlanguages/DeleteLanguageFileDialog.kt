/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations.preferences.downloadlanguages

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import mozilla.components.compose.base.button.TextButton
import mozilla.components.feature.downloads.DefaultFileSizeFormatter
import mozilla.components.feature.downloads.FileSizeFormatter
import org.mozilla.fenix.R
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import java.util.Locale

/**
 * Download Languages Delete Dialog.
 *
 * @param language Language name that should be displayed in the dialogue title.
 * @param isAllLanguagesItemType Whether the download language file item is of type all languages.
 * @param fileSizeFormatter [FileSizeFormatter] used to format the size of the file item.
 * @param fileSize Language file size in bytes that should be displayed in the dialogue title.
 * @param onConfirmDelete Invoked when the user clicks on the "Delete" dialog button.
 * @param onCancel Invoked when the user clicks on the "Cancel" dialog button.
 */
@Composable
fun DeleteLanguageFileDialog(
    language: String? = null,
    isAllLanguagesItemType: Boolean,
    fileSizeFormatter: FileSizeFormatter,
    fileSize: Long? = null,
    onConfirmDelete: () -> Unit,
    onCancel: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = {},
        title = {
            val title: String? = if (isAllLanguagesItemType) {
                stringResource(
                    id = R.string.delete_language_all_languages_file_dialog_title,
                    fileSizeFormatter.formatSizeInBytes(fileSize ?: 0L),
                )
            } else {
                language?.let {
                    stringResource(
                        id = R.string.delete_language_file_dialog_title,
                        it,
                        fileSizeFormatter.formatSizeInBytes(fileSize ?: 0L),
                    )
                }
            }

            title?.let {
                Text(
                    text = it,
                    style = FirefoxTheme.typography.headline5,
                )
            }
        },
        text = {
            val message: String = if (isAllLanguagesItemType) {
                stringResource(
                    id = R.string.delete_language_all_languages_file_dialog_message,
                    stringResource(id = R.string.firefox),
                )
            } else {
                stringResource(
                    id = R.string.delete_language_file_dialog_message,
                    stringResource(id = R.string.firefox),
                )
            }

            Text(
                text = message,
                style = FirefoxTheme.typography.body2,
            )
        },
        confirmButton = {
            TextButton(
                text = stringResource(id = R.string.delete_language_file_dialog_positive_button_text),
                onClick = { onConfirmDelete() },
            )
        },
        dismissButton = {
            TextButton(
                text = stringResource(id = R.string.delete_language_file_dialog_negative_button_text),
                onClick = { onCancel() },
            )
        },
    )
}

@Preview
@Composable
private fun DeleteLanguageFileDialogPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        DeleteLanguageFileDialog(
            language = Locale.CHINA.displayLanguage,
            isAllLanguagesItemType = false,
            fileSizeFormatter = DefaultFileSizeFormatter(LocalContext.current),
            fileSize = 4000L,
            onConfirmDelete = {},
            onCancel = {},
        )
    }
}

@Preview
@Composable
private fun DeleteAllLanguagesFileDialogPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        DeleteLanguageFileDialog(
            language = Locale.CHINA.displayLanguage,
            isAllLanguagesItemType = true,
            fileSizeFormatter = DefaultFileSizeFormatter(LocalContext.current),
            fileSize = 4000L,
            onConfirmDelete = {},
            onCancel = {},
        )
    }
}
