/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.toolbar.compose

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import mozilla.components.compose.browser.toolbar.BrowserDisplayToolbar
import mozilla.components.compose.browser.toolbar.BrowserEditToolbar
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity
import mozilla.components.compose.browser.toolbar.ui.BrowserToolbarQuery
import mozilla.components.lib.state.ext.observeAsComposableState

/**
 * A customizable toolbar for browsers.
 *
 * The toolbar can switch between two modes: display and edit. The display mode displays the current
 * URL and controls for navigation. In edit mode the current URL can be edited. Those two modes are
 * implemented by the [BrowserDisplayToolbar] and [BrowserEditToolbar] composables.
 *
 * @param onTextEdit Invoked when the user edits the text in the toolbar in "edit" mode.
 * @param onTextCommit Invoked when the user has finished editing the URL and wants
 * to commit the entered text.
 */
@Composable
fun BrowserToolbar(
    store: BrowserToolbarStore,
    onTextEdit: (BrowserToolbarQuery) -> Unit,
    onTextCommit: (String) -> Unit,
    url: String = "",
) {
    val uiState by store.stateFlow.collectAsState()
    val progressBarConfig = store.observeAsComposableState { it.displayState.progressBarConfig }.value

    val input = when (val editText = uiState.editState.query.current) {
        "" -> url
        else -> editText
    }

    if (uiState.isEditMode()) {
        BrowserEditToolbar(
            query = input,
            gravity = ToolbarGravity.Top,
            editActionsStart = uiState.editState.editActionsStart,
            editActionsEnd = uiState.editState.editActionsEnd,
            hint = stringResource(uiState.editState.hint),
            onUrlCommitted = { text -> onTextCommit(text) },
            onUrlEdit = { query -> onTextEdit(query) },
            onInteraction = { store.dispatch(it) },
        )
    } else {
        BrowserDisplayToolbar(
            pageOrigin = uiState.displayState.pageOrigin,
            progressBarConfig = progressBarConfig,
            gravity = ToolbarGravity.Top,
            browserActionsStart = uiState.displayState.browserActionsStart,
            pageActionsStart = uiState.displayState.pageActionsStart,
            pageActionsEnd = uiState.displayState.pageActionsEnd,
            browserActionsEnd = uiState.displayState.browserActionsEnd,
            onInteraction = { store.dispatch(it) },
        )
    }
}
