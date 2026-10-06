/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.importer

import android.net.Uri
import mozilla.components.lib.state.Action

/**
 * Actions for the [ImporterStore].
 */
sealed interface ImporterAction : Action {

    /** The import UI became visible. */
    data object ViewAppeared : ImporterAction

    /** The user picked a file */
    data class FileSelected(val uri: Uri) : ImporterAction

    /** The user canceled picking a file */
    data object FileSelectionCanceled : ImporterAction

    /** An import started. */
    data object ImportStarted : ImporterAction

    /** The in-progress import completed successfully.
     *
     * @property bookmarksImported the number of bookmarks imported
     **/
    data class ImportFinished(val bookmarksImported: Int) : ImporterAction

    /** The in-progress import completed with a failure. */
    data object ImportFailed : ImporterAction

    /** The user canceled the in-progress import. */
    data object ImportCancelled : ImporterAction
}
