/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.importer

import mozilla.components.feature.importer.ImporterResult.Canceled
import mozilla.components.feature.importer.ImporterResult.Failure
import mozilla.components.feature.importer.ImporterResult.Success
import mozilla.components.feature.importer.ImporterState.Finished
import mozilla.components.feature.importer.ImporterState.Loading
import mozilla.components.feature.importer.ImporterState.SelectingFile

/**
 * Reduces the given [action] into a new [ImporterState].
 */
fun importerReducer(state: ImporterState, action: ImporterAction): ImporterState = when (action) {
    ImporterAction.ViewAppeared -> SelectingFile
    is ImporterAction.FileSelected -> state
    ImporterAction.ImportStarted -> Loading
    is ImporterAction.ImportFinished -> Finished(Success(action.bookmarksImported))
    ImporterAction.ImportFailed -> Finished(Failure)
    ImporterAction.FileSelectionCanceled,
    ImporterAction.ImportCancelled,
    -> Finished(Canceled)
}
