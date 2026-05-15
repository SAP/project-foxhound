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
 * @param mainDispatcher The [CoroutineDispatcher] used for dispatching actions back to the stores.
 */
class DownloadUIRenameMiddleware(
    private val browserStore: BrowserStore,
    private val scope: CoroutineScope,
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

                if (proposedExtension.isNotEmpty() && proposedExtension != originalExtension) {
                    store.dispatch(DownloadUIAction.ShowChangeFileExtensionDialog)
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
            val from = File(download.directoryPath, currentName)
            val to = File(download.directoryPath, newNameTrimmed)

            if (to.exists()) {
                dispatchAction(
                    uiStore,
                    DownloadUIAction.RenameFileFailed(
                            RenameFileError.NameAlreadyExists(newNameTrimmed),
                        ),
                    )
                return@launch
            }

            if (!attemptFileRename(from, to)) {
                dispatchAction(uiStore, DownloadUIAction.RenameFileFailed(RenameFileError.CannotRename))
                return@launch
            }

            withContext(mainDispatcher) {
                val updated = download.copy(fileName = newNameTrimmed)
                browserStore.dispatch(DownloadAction.UpdateDownloadAction(updated))
                uiStore.dispatch(DownloadUIAction.RenameFileDismissed)
            }
        }
    }

    private fun attemptFileRename(from: File, to: File): Boolean {
        return try {
            from.exists() && from.isFile && from.renameTo(to)
        } catch (_: Throwable) {
            false
        }
    }
}
