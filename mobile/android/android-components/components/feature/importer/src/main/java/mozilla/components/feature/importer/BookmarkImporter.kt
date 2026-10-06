/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.importer

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import mozilla.components.concept.bookmarks.file.BookmarksFileImporter

/**
 * Self-contained bookmarks import flow that drives file selection, the in-progress dialog, and
 * completion via an internal [ImporterStore].
 *
 * @param onFinished Invoked when the import flow has reached a terminal [ImporterState.Finished]
 * state, carrying the [ImporterResult]. Hosts typically use this to dismiss the surrounding UI.
 */
@Composable
fun BookmarkImporter(
    importer: BookmarksFileImporter,
    onFinished: (ImporterResult) -> Unit,
) {
    val viewModel: ImporterViewModel = viewModel(
        factory = ImporterViewModel.factory(importer),
    )
    val state by viewModel.store.stateFlow.collectAsState(initial = viewModel.store.state)

    when (val current = state) {
        ImporterState.Inert -> {
            LaunchedEffect(Unit) {
                viewModel.store.dispatch(ImporterAction.ViewAppeared)
            }
        }
        ImporterState.SelectingFile -> {
            FilePicker(
                onFileSelected = { uri ->
                    if (uri != null) {
                        viewModel.store.dispatch(ImporterAction.FileSelected(uri))
                    } else {
                        viewModel.store.dispatch(ImporterAction.FileSelectionCanceled)
                    }
                },
            )
        }
        ImporterState.Loading -> {
            ImporterDialog(
                onCancel = {
                    viewModel.store.dispatch(ImporterAction.ImportCancelled)
                },
            )
        }
        is ImporterState.Finished -> {
            LaunchedEffect(current) {
                onFinished(current.result)
            }
        }
    }
}
