/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.store

import mozilla.components.lib.state.Action

/**
 * Actions to dispatch through the `DownloadStore` to modify `DownloadState` through the reducer.
 */
sealed interface DownloadUIAction : Action {
    /**
     * [DownloadUIAction] to initialize the state.
     */
    data object Init : DownloadUIAction

    /**
     * [DownloadUIAction] to exit edit mode.
     */
    data object ExitEditMode : DownloadUIAction

    /**
     * [DownloadUIAction] add an item to the removal list.
     */
    data class AddItemForRemoval(val item: FileItem) : DownloadUIAction

    /**
     * [DownloadUIAction] to add all items to the removal list.
     */
    data object AddAllItemsForRemoval : DownloadUIAction

    /**
     * [DownloadUIAction] to remove an item from the removal list.
     */
    data class RemoveItemForRemoval(val item: FileItem) : DownloadUIAction

    /**
     * [DownloadUIAction] to add a set of [FileItem] IDs to the pending deletion set.
     */
    data class AddPendingDeletionSet(val itemIds: Set<String>) : DownloadUIAction

    /**
     * [DownloadUIAction] to undo the last pending deletion of a set of downloaded files.
     */
    data object UndoPendingDeletion : DownloadUIAction

    /**
     * [DownloadUIAction] to undo a set of [FileItem] IDs from the pending deletion set.
     */
    data class UndoPendingDeletionSet(val itemIds: Set<String>) : DownloadUIAction

    /**
     * [DownloadUIAction] when a file item is deleted successfully.
     */
    data object FileItemDeletedSuccessfully : DownloadUIAction

    /**
     * [DownloadUIAction] to update the list of [FileItem]s.
     */
    data class UpdateFileItems(val items: List<FileItem>) : DownloadUIAction

    /**
     * [DownloadUIAction] to select a content type filter.
     */
    data class ContentTypeSelected(val contentTypeFilter: FileItem.ContentTypeFilter) :
        DownloadUIAction

    /**
     * [DownloadUIAction] to share the URL of a [FileItem].
     */
    data class ShareUrlClicked(val url: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to share the file of a [FileItem].
     */
    data class ShareFileClicked(val filePath: String, val contentType: String?) : DownloadUIAction

    /**
     * [DownloadUIAction] to rename the file of a [FileItem].
     */
    data class RenameFileClicked(val item: FileItem) : DownloadUIAction

    /**
     * [DownloadUIAction] to confirm renaming the file of a [FileItem].
     */
    data class RenameFileConfirmed(val item: FileItem, val newName: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to dismiss the renaming of a [FileItem].
     */
    data object RenameFileDismissed : DownloadUIAction

    /**
     * [DownloadUIAction] to change the file extension.
     */
    data class FileExtensionChangedByUser(val item: FileItem, val newName: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to show the dialog to change the file extension of a [FileItem].
     */
    data object ShowChangeFileExtensionDialog : DownloadUIAction

    /**
     * [DownloadUIAction] to close the dialog to change the file extension of a [FileItem].
     */
    data object CloseChangeFileExtensionDialog : DownloadUIAction

    /**
     * [DownloadUIAction] to confirm renaming the file of a [FileItem].
     */
    data class RenameFileFailed(val error: RenameFileError) : DownloadUIAction

    /**
     * [DownloadUIAction] to dismiss the failure of renaming the file of a [FileItem].
     */
    data object RenameFileFailureDismissed : DownloadUIAction

    /**
     * [DownloadUIAction] when a search query is entered.
     */
    data class SearchQueryEntered(val searchQuery: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to show or hide the delete confirmation dialog.
     */
    data class UpdateDeleteDialogVisibility(val visibility: Boolean) : DownloadUIAction

    /**
     * [DownloadUIAction] to show the search bar.
     */
    data object SearchBarVisibilityRequest : DownloadUIAction

    /**
     * [DownloadUIAction] to hide the search bar.
     */
    data object SearchBarDismissRequest : DownloadUIAction

    /**
     * [DownloadUIAction] to pause a downloading file.
     */
    data class PauseDownload(val downloadId: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to resume a paused download file.
     */
    data class ResumeDownload(val downloadId: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to cancel an incomplete download file.
     */
    data class CancelDownload(val downloadId: String) : DownloadUIAction

    /**
     * [DownloadUIAction] to retry a failed download file.
     */
    data class RetryDownload(val downloadId: String) : DownloadUIAction

    /**
     * [DownloadUIAction] fired when a navigation to settings event occurs.
     */
    object SettingsIconClicked : DownloadUIAction

    /**
     * [DownloadUIAction] fired when a back navigation event occurs.
     */
    object NavigationIconClicked : DownloadUIAction
}

/**
 * User-visible errors that can occur while renaming a downloaded file.
 */
sealed interface RenameFileError {
    /**
     * The proposed file name conflicts with an existing file.
     *
     * @property proposedFileName The name the user attempted to rename the file to.
     */
    data class NameAlreadyExists(val proposedFileName: String) : RenameFileError

    /**
     * The proposed file name is not valid and has a path separator or slash.
     */
    data object InvalidFileName : RenameFileError

    /**
     * The file could not be renamed due to a system or storage failure.
     */
    data object CannotRename : RenameFileError
}
