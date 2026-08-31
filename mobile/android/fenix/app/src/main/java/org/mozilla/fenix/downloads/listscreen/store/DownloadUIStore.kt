/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.store

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState.Mode

/**
 * The [Store] for holding the [DownloadUIState] and applying [DownloadUIAction]s.
 */
class DownloadUIStore(
    initialState: DownloadUIState,
    middleware: List<Middleware<DownloadUIState, DownloadUIAction>> = emptyList(),
) : Store<DownloadUIState, DownloadUIAction>(
    initialState = initialState,
    reducer = ::downloadStateReducer,
    middleware = middleware,
) {

    init {
        dispatch(DownloadUIAction.Init)
    }
}

/**
 * The DownloadState Reducer.
 */
@Suppress("LongMethod")
private fun downloadStateReducer(
    state: DownloadUIState,
    action: DownloadUIAction,
): DownloadUIState {
    return when (action) {
        is DownloadUIAction.AddItemForRemoval ->
            state.copy(
                mode = Mode.Editing(state.mode.selectedItems + action.item),
            )

        is DownloadUIAction.AddAllItemsForRemoval -> {
            state.copy(
                mode = Mode.Editing(
                    selectedItems = state.itemsMatchingFilters
                        .filter { it.status == FileItem.Status.Completed }
                        .toSet(),
                ),
            )
        }

        is DownloadUIAction.RemoveItemForRemoval -> {
            val selected = state.mode.selectedItems - action.item
            state.copy(
                mode = if (selected.isEmpty()) {
                    Mode.Normal
                } else {
                    Mode.Editing(selected)
                },
            )
        }

        is DownloadUIAction.ExitEditMode -> state.copy(mode = Mode.Normal)
        is DownloadUIAction.AddPendingDeletionSet ->
            state.copy(
                pendingDeletionIds = state.pendingDeletionIds + action.items.map { it.id }.toSet(),
                deletionSnackbarState = DownloadUIState.SnackbarState.UndoDeletion(action.items),
                dialogState = DownloadUIState.DialogState.None,
                mode = Mode.Normal,
            )

        is DownloadUIAction.UndoPendingDeletionSet ->
            state.copy(
                pendingDeletionIds = state.pendingDeletionIds - action.itemIds,
                deletionSnackbarState = DownloadUIState.SnackbarState.None,
            )

        is DownloadUIAction.UpdateFileItems -> state.copy(items = action.items)

        is DownloadUIAction.ContentTypeSelected -> state.copy(userSelectedContentTypeFilter = action.contentTypeFilter)

        is DownloadUIAction.FileItemDeletedSuccessfully ->
            state.copy(deletionSnackbarState = DownloadUIState.SnackbarState.None)

        is DownloadUIAction.SearchQueryEntered -> state.copy(searchQuery = action.searchQuery)

        DownloadUIAction.Init -> state
        is DownloadUIAction.ShareUrlClicked -> state
        is DownloadUIAction.ShareFileClicked -> state
        is DownloadUIAction.RenameFileClicked -> state.copy(fileToRename = action.item)
        is DownloadUIAction.RenameFileConfirmed -> state
        is DownloadUIAction.RenameFileDismissed ->
            state.copy(
                fileToRename = null,
                renameFileError = null,
                isChangeFileExtensionDialogVisible = false,
                itemToChangeExtension = null,
            )

        is DownloadUIAction.RenameFileFailed -> state.copy(renameFileError = action.error)
        is DownloadUIAction.RenameFileFailureDismissed -> state.copy(renameFileError = null)
        is DownloadUIAction.FileExtensionChangedByUser -> state
        is DownloadUIAction.ShowChangeFileExtensionDialog -> state.copy(
            isChangeFileExtensionDialogVisible = true,
            itemToChangeExtension = action.item,
        )

        is DownloadUIAction.CloseChangeFileExtensionDialog -> state.copy(isChangeFileExtensionDialogVisible = false)
        is DownloadUIAction.UndoPendingDeletion -> state
        is DownloadUIAction.PauseDownload -> state
        is DownloadUIAction.ResumeDownload -> state
        is DownloadUIAction.RetryDownload -> state
        is DownloadUIAction.CancelDownload -> state
        is DownloadUIAction.NavigationIconClicked -> state
        is DownloadUIAction.SettingsIconClicked -> state

        is DownloadUIAction.RequestDeleteMultiple -> state
        is DownloadUIAction.RequestDelete -> state
        is DownloadUIAction.ShowDeleteDialog ->
            state.copy(dialogState = DownloadUIState.DialogState.DeleteConfirmation(action.items))

        is DownloadUIAction.DismissDeleteDialog ->
            state.copy(dialogState = DownloadUIState.DialogState.None)

        is DownloadUIAction.SearchBarDismissRequest -> state.copy(
            isSearchFieldRequested = false,
            searchQuery = "",
        )

        is DownloadUIAction.SearchBarVisibilityRequest -> state.copy(isSearchFieldRequested = true)

        is DownloadUIAction.ShowMultiSelectDeleteDialog ->
            state.copy(
                dialogState = DownloadUIState.DialogState.MultiSelectDeleteConfirmation(
                    items = action.items,
                ),
            )

        is DownloadUIAction.ConfirmMultiSelectDelete ->
            state.copy(dialogState = DownloadUIState.DialogState.None)
    }
}
