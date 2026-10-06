/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.importer

import mozilla.components.lib.state.State

/**
 * State for the bookmark importer feature.
 */
sealed interface ImporterState : State {
    /** The importer has not yet been triggered. */
    object Inert : ImporterState

    /** The user is being prompted to pick a file. */
    object SelectingFile : ImporterState

    /** An import is in progress. */
    object Loading : ImporterState

    /**
     * The import has completed.
     *
     * @property result The outcome of the import.
     */
    data class Finished(val result: ImporterResult) : ImporterState
}

/**
 * Represents the outcome of a completed import operation.
 */
sealed interface ImporterResult {
    /**
     * The import succeeded.
     *
     * @property importCount The number of items imported.
     */
    data class Success(val importCount: Int) : ImporterResult

    /** The import failed due to an error. */
    data object Failure : ImporterResult

    /** The user cancelled the import. */
    data object Canceled : ImporterResult
}
