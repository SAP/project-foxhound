/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import mozilla.components.feature.password.importer.PasswordsImporterResult.Canceled
import mozilla.components.feature.password.importer.PasswordsImporterResult.Failure
import mozilla.components.feature.password.importer.PasswordsImporterResult.Success
import mozilla.components.feature.password.importer.PasswordsImporterState.Finished
import mozilla.components.feature.password.importer.PasswordsImporterState.Loading
import mozilla.components.feature.password.importer.PasswordsImporterState.SelectingFile

/**
 * Reduces the given [action] into a new [PasswordsImporterState].
 */
fun passwordsImporterReducer(
    state: PasswordsImporterState,
    action: PasswordsImporterAction,
): PasswordsImporterState = when (action) {
    PasswordsImporterAction.ViewAppeared -> SelectingFile
    is PasswordsImporterAction.FileSelected -> state
    PasswordsImporterAction.ImportStarted -> Loading
    is PasswordsImporterAction.ImportFinished -> Finished(Success(action.passwordsImported))
    PasswordsImporterAction.ImportFailed -> Finished(Failure)
    PasswordsImporterAction.FileSelectionCanceled,
    PasswordsImporterAction.ImportCanceled,
        -> Finished(Canceled)
}
