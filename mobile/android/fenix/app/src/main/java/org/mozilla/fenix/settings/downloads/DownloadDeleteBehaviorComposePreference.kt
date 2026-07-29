/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.downloads

import android.content.Context
import android.util.AttributeSet
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import mozilla.components.compose.base.button.RadioButton
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.ComposePreference
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme
import org.mozilla.fenix.utils.Settings.DeleteDownloadBehavior

/**
 * A custom [ComposePreference] that displays a radio group for selecting the user's
 * preferred download deletion behavior.
 *
 * @param context The context in which this preference is operating.
 * @param attrs The attribute set provided by the XML layout.
 * @param defStyleAttr An attribute in the current theme that contains a reference to a style resource.
 */
class DownloadDeleteBehaviorComposePreference @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0,
) : ComposePreference(context, attrs, defStyleAttr) {

    var currentBehavior by mutableStateOf(DeleteDownloadBehavior.ASK_WHEN_DELETING)
    var onBehaviorSelected: ((DeleteDownloadBehavior) -> Unit)? = null

    @Composable
    override fun Content() {
        DeleteBehaviorRadioGroup(
            selectedBehavior = currentBehavior,
            onBehaviorSelected = { newBehavior ->
                currentBehavior = newBehavior
                onBehaviorSelected?.invoke(newBehavior)
            },
        )
    }
}

/**
 * Renders a vertical group of radio buttons representing the available [DeleteDownloadBehavior] options.
 *
 * @param selectedBehavior The currently active [DeleteDownloadBehavior] to display as checked.
 * @param onBehaviorSelected Callback invoked when the user selects a new radio button option.
 */
@Composable
fun DeleteBehaviorRadioGroup(
    selectedBehavior: DeleteDownloadBehavior,
    onBehaviorSelected: (DeleteDownloadBehavior) -> Unit,
) {
    Column {
        DeleteBehaviorRow(
            title = stringResource(R.string.preferences_downloads_delete_from_device),
            summary = stringResource(R.string.preferences_downloads_delete_from_device_description),
            selected = selectedBehavior == DeleteDownloadBehavior.DELETE_FROM_DEVICE,
            onClick = { onBehaviorSelected(DeleteDownloadBehavior.DELETE_FROM_DEVICE) },
        )
        DeleteBehaviorRow(
            title = stringResource(R.string.preferences_downloads_remove_from_download_history),
            summary = stringResource(R.string.preferences_downloads_remove_from_download_history_description),
            selected = selectedBehavior == DeleteDownloadBehavior.REMOVE_FROM_HISTORY,
            onClick = { onBehaviorSelected(DeleteDownloadBehavior.REMOVE_FROM_HISTORY) },
        )
        DeleteBehaviorRow(
            title = stringResource(R.string.preferences_downloads_ask_when_to_delete_files),
            summary = null,
            selected = selectedBehavior == DeleteDownloadBehavior.ASK_WHEN_DELETING,
            onClick = { onBehaviorSelected(DeleteDownloadBehavior.ASK_WHEN_DELETING) },
        )
    }
}

@Composable
private fun DeleteBehaviorRow(
    title: String,
    summary: String?,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onClick, role = Role.RadioButton)
            .padding(
                horizontal = FirefoxTheme.layout.space.dynamic200,
                vertical = FirefoxTheme.layout.space.static150,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(FirefoxTheme.layout.space.static200, Alignment.Start),
    ) {
        RadioButton(selected = selected, onClick = onClick)

        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )

            if (summary != null) {
                Text(
                    text = summary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Preview
@Composable
private fun DeleteBehaviorRadioGroupPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        Box(modifier = Modifier.background(MaterialTheme.colorScheme.surface)) {
            var selectedBehavior by remember {
                mutableStateOf(DeleteDownloadBehavior.ASK_WHEN_DELETING)
            }

            DeleteBehaviorRadioGroup(
                selectedBehavior = selectedBehavior,
                onBehaviorSelected = { selectedBehavior = it },
            )
        }
    }
}
