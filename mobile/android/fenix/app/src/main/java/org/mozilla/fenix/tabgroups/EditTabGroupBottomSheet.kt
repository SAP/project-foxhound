/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabgroups

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.unit.dp
import mozilla.components.compose.base.annotation.FlexibleWindowPreview
import mozilla.components.compose.base.button.TextButton
import org.mozilla.fenix.R
import org.mozilla.fenix.compose.BottomSheetHandle
import org.mozilla.fenix.tabstray.TabGroupAction
import org.mozilla.fenix.tabstray.TabsTrayStore
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.theme.PreviewThemeProvider
import org.mozilla.fenix.theme.Theme

private const val BOTTOM_SHEET_HANDLER_ALPHA = 0.4F

/**
 * Prompt to edit a tab group.
 *
 * @param tabsTrayStore [TabsTrayStore] used to listen for changes to
 * [org.mozilla.fenix.tabstray.TabsTrayState].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditTabGroupBottomSheet(
    tabsTrayStore: TabsTrayStore,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LaunchedEffect(Unit) {
        if (!sheetState.isVisible) {
            sheetState.show()
        }
    }

    BottomSheet(
        sheetState = sheetState,
        onDismissRequest = {
            tabsTrayStore.dispatch(TabGroupAction.Dismiss)
        },
        onConfirmSave = {
            tabsTrayStore.dispatch(TabGroupAction.SaveClicked)
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BottomSheet(
    sheetState: SheetState,
    onDismissRequest: () -> Unit,
    onConfirmSave: () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = {
            BottomSheetHandle(
                onRequestDismiss = onDismissRequest,
                contentDescription = stringResource(R.string.edit_tab_group_bottom_sheet_close_content_description),
                modifier = Modifier.padding(all = 16.dp).alpha(BOTTOM_SHEET_HANDLER_ALPHA),
            )
        },
    ) {
        CreateTabGroupContent(
            onConfirmSave = onConfirmSave,
        )
    }
}

@Composable
private fun CreateTabGroupContent(
    onConfirmSave: () -> Unit,
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.create_tab_group_title),
                modifier = Modifier.weight(1f).padding(start = 24.dp),
                style = FirefoxTheme.typography.headline7,
            )

            TextButton(
                text = stringResource(R.string.create_tab_group_save_button),
                onClick = onConfirmSave,
                modifier = Modifier.padding(end = 12.dp),
            )
        }
    }
}

@Preview
@Composable
private fun CreateTabGroupContentPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    FirefoxTheme(theme) {
        Surface {
            CreateTabGroupContent(onConfirmSave = {})
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@FlexibleWindowPreview
@Composable
private fun EditTabGroupBottomSheetPreview(
    @PreviewParameter(PreviewThemeProvider::class) theme: Theme,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    FirefoxTheme(theme) {
        BottomSheet(
            sheetState = sheetState,
            onDismissRequest = {},
            onConfirmSave = {},
        )
    }
}
