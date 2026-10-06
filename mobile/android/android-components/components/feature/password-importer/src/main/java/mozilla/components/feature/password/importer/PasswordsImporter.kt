/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import mozilla.components.concept.passwords.file.PasswordsFileImporter

/**
 * Self-contained passwords import flow that drives file selection, the in-progress dialog, and
 * completion via an internal [PasswordsImporterStore].
 *
 * @param onFinished Invoked when the import flow has reached a terminal [PasswordsImporterState.Finished]
 * state, carrying the [PasswordsImporterResult]. Hosts typically use this to dismiss the surrounding UI.
 */
@Composable
fun PasswordsImporter(
    importer: PasswordsFileImporter,
    onFinished: (PasswordsImporterResult) -> Unit,
) {
    val viewModel: PasswordsImporterViewModel = viewModel(
        factory = PasswordsImporterViewModel.factory(importer),
    )
    val state by viewModel.store.stateFlow.collectAsState(initial = viewModel.store.state)

    when (val current = state) {
        PasswordsImporterState.Inert -> {
            LaunchedEffect(Unit) {
                viewModel.store.dispatch(PasswordsImporterAction.ViewAppeared)
            }
        }
        PasswordsImporterState.SelectingFile -> {
            FilePicker(
                onFileSelected = { uri ->
                    if (uri != null) {
                        viewModel.store.dispatch(PasswordsImporterAction.FileSelected(uri))
                    } else {
                        viewModel.store.dispatch(PasswordsImporterAction.FileSelectionCanceled)
                    }
                },
            )
        }
        PasswordsImporterState.Loading -> {
            PasswordsImporterDialog(
                onCancel = {
                    viewModel.store.dispatch(PasswordsImporterAction.ImportCanceled)
                },
            )
        }
        is PasswordsImporterState.Finished -> {
            LaunchedEffect(current) {
                onFinished(current.result)
            }
        }
    }
}
