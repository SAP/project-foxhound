/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.password.importer

import android.net.Uri
import mozilla.components.lib.state.Action

/**
 * Actions for the [PasswordsImporterStore].
 */
sealed interface PasswordsImporterAction : Action {

    /** The import UI became visible. */
    data object ViewAppeared : PasswordsImporterAction

    /** The user picked a file */
    data class FileSelected(val uri: Uri) : PasswordsImporterAction

    /** The user canceled picking a file */
    data object FileSelectionCanceled : PasswordsImporterAction

    /** An import started. */
    data object ImportStarted : PasswordsImporterAction

    /** The in-progress import completed successfully.
     *
     * @property passwordsImported the number of passwords imported
     **/
    data class ImportFinished(val passwordsImported: Int) : PasswordsImporterAction

    /** The in-progress import completed with a failure. */
    data object ImportFailed : PasswordsImporterAction

    /** The user canceled the in-progress import. */
    data object ImportCanceled : PasswordsImporterAction
}
