/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import mozilla.components.lib.state.State

/**
 * State for the passwords importer feature.
 */
sealed interface PasswordsImporterState : State {
    /** The passwords importer has not yet been triggered. */
    object Inert : PasswordsImporterState

    /** The user is being prompted to pick a file. */
    object SelectingFile : PasswordsImporterState

    /** An import is in progress. */
    object Loading : PasswordsImporterState

    /**
     * The import has completed.
     *
     * @property result The outcome of the import.
     */
    data class Finished(val result: PasswordsImporterResult) : PasswordsImporterState
}

/**
 * Represents the outcome of a completed import operation.
 */
sealed interface PasswordsImporterResult {
    /**
     * The import succeeded.
     *
     * @property importCount The number of items imported.
     */
    data class Success(val importCount: Int) : PasswordsImporterResult

    /** The import failed due to an error. */
    data object Failure : PasswordsImporterResult

    /** The user cancelled the import. */
    data object Canceled : PasswordsImporterResult
}
