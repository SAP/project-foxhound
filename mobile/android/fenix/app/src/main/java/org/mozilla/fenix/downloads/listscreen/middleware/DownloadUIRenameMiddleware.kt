/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.middleware

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.browser.state.action.DownloadAction
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.support.utils.DownloadFileUtils
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIAction
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.downloads.listscreen.store.RenameFileError
import java.io.File

/**
 * Middleware for renaming downloaded files.
 *
 * @param browserStore [BrowserStore] instance to get the download items from.
 * @param scope The [CoroutineScope] that will be used to launch coroutines.
 * @param downloadFileUtils [DownloadFileUtils] instance used for file system operations.
 * @param mainDispatcher The [CoroutineDispatcher] used for dispatching actions back to the stores.
 */
class DownloadUIRenameMiddleware(
    private val browserStore: BrowserStore,
    private val scope: CoroutineScope,
    private val downloadFileUtils: DownloadFileUtils,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : Middleware<DownloadUIState, DownloadUIAction> {

    override fun invoke(
        store: Store<DownloadUIState, DownloadUIAction>,
        next: (DownloadUIAction) -> Unit,
        action: DownloadUIAction,
    ) {
        next(action)

        when (action) {
            is DownloadUIAction.RenameFileConfirmed -> processFileRenaming(store, action.item, action.newName)
            is DownloadUIAction.FileExtensionChangedByUser -> {
                val previousName = action.item.fileName ?: return
                val originalExtension = File(previousName).extension.lowercase()
                val proposedExtension = File(action.newName).extension.lowercase()

                if (
                    proposedExtension.isNotEmpty() && proposedExtension != originalExtension &&
                    store.state.itemToChangeExtension?.fileName == null
                ) {
                    store.dispatch(DownloadUIAction.ShowChangeFileExtensionDialog(action.item))
                } else {
                    store.dispatch(DownloadUIAction.CloseChangeFileExtensionDialog)
                    store.dispatch(DownloadUIAction.RenameFileConfirmed(action.item, action.newName))
                }
            }

            else -> {
                // no - op
            }
        }
    }

    private suspend fun dispatchAction(
        uiStore: Store<DownloadUIState, DownloadUIAction>,
        action: DownloadUIAction,
    ) = withContext(mainDispatcher) { uiStore.dispatch(action) }

    private fun processFileRenaming(
        uiStore: Store<DownloadUIState, DownloadUIAction>,
        item: FileItem,
        newName: String,
    ) {
        scope.launch {
            val download = browserStore.state.downloads[item.id]
            val currentName = download?.fileName

            if (download == null || currentName.isNullOrBlank()) {
                dispatchAction(uiStore, DownloadUIAction.RenameFileFailed(RenameFileError.CannotRename))
                return@launch
            }

            val newNameTrimmed = newName.trim()
            getRenameConflictError(download.directoryPath, currentName, newNameTrimmed)?.let { error ->
                dispatchAction(uiStore, DownloadUIAction.RenameFileFailed(error))
                return@launch
            }

            val attemptFileRename = downloadFileUtils.renameFile(
                directoryPath = download.directoryPath,
                oldName = download.fileName,
                newName = newNameTrimmed,
            )

            if (!attemptFileRename) {
                dispatchAction(
                    uiStore,
                    DownloadUIAction.RenameFileFailed(RenameFileError.CannotRename),
                )
                return@launch
            } else {
                uiStore.dispatch(DownloadUIAction.RenameFileDismissed)
            }

            withContext(mainDispatcher) {
                val updated = download.copy(fileName = newNameTrimmed)
                browserStore.dispatch(DownloadAction.UpdateDownloadAction(updated))
            }
        }
    }

    private fun getRenameConflictError(
        directoryPath: String,
        currentName: String,
        newName: String,
    ): RenameFileError? {
        if (downloadFileUtils.fileExists(directoryPath, newName)) {
            return if (newName.equals(currentName, ignoreCase = true)) {
                RenameFileError.CaseOnlyNameChange(newName)
            } else {
                RenameFileError.NameAlreadyExists(newName)
            }
        }
        return null
    }
}
