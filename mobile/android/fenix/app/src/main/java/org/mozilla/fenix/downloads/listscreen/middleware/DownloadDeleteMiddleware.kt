/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.middleware

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import mozilla.components.compose.base.snackbar.SnackbarTimeout
import mozilla.components.feature.downloads.DownloadsUseCases
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIAction
import org.mozilla.fenix.downloads.listscreen.store.DownloadUIState
import org.mozilla.fenix.downloads.listscreen.store.FileItem
import org.mozilla.fenix.utils.Settings.DeleteDownloadBehavior

/**
 * Middleware for deleting a Download from disk.
 *
 * @param undoDelay The recommended time an "undo" action should be available for.
 * @param removeDownloadUseCase The [DownloadsUseCases.RemoveDownloadUseCase] used to remove the download.
 * @param dispatcher The injected dispatcher used to run suspending operations on.
 * @param deleteBehaviorProvider A lambda that returns the desired [DeleteDownloadBehavior] to use when deleting a file.
 */
class DownloadDeleteMiddleware(
    private val undoDelay: Long = SnackbarTimeout.Action.value,
    private val removeDownloadUseCase: DownloadsUseCases.RemoveDownloadUseCase,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val deleteBehaviorProvider: () -> DeleteDownloadBehavior,
) : Middleware<DownloadUIState, DownloadUIAction> {
    private var lastDeleteOperation: DeleteOperation? = null

    /*
     * CoroutineScope used to launch the delete operation. This is a custom CoroutineScope with
     * an injected dispatcher, because the delete operations is short and should not be cancelled
     * when the UI is destroyed.
     */
    private val coroutineScope = CoroutineScope(dispatcher)

    override fun invoke(
        store: Store<DownloadUIState, DownloadUIAction>,
        next: (DownloadUIAction) -> Unit,
        action: DownloadUIAction,
    ) {
        next(action)
        when (action) {
            is DownloadUIAction.RequestDeleteMultiple -> {
                handleCompletedDownloadDeleteRequest(store, action.items)
            }

            is DownloadUIAction.RequestDelete -> {
                when (action.item.status) {
                    is FileItem.Status.Completed -> handleCompletedDownloadDeleteRequest(store, setOf(action.item))
                    else -> {
                        removeDownload(store, action.item.id, removeFromDisk = true)
                    }
                }
            }

            is DownloadUIAction.ConfirmMultiSelectDelete -> {
                val removeFromDisk = deleteBehaviorProvider() == DeleteDownloadBehavior.DELETE_FROM_DEVICE

                store.dispatch(
                    DownloadUIAction.AddPendingDeletionSet(
                        removeFromDisk = removeFromDisk,
                        items = action.items,
                    ),
                )
            }

            is DownloadUIAction.AddPendingDeletionSet ->
                startDelayedRemoval(store, action.items, action.removeFromDisk, undoDelay)

            is DownloadUIAction.UndoPendingDeletion -> lastDeleteOperation?.cancel()

            else -> {
                // no - op
            }
        }
    }

    private fun handleCompletedDownloadDeleteRequest(
        store: Store<DownloadUIState, DownloadUIAction>,
        items: Set<FileItem>,
    ) {
        val deleteBehavior = deleteBehaviorProvider()

        if (deleteBehavior == DeleteDownloadBehavior.ASK_WHEN_DELETING) {
            store.dispatch(DownloadUIAction.ShowDeleteDialog(items))
        } else {
            if (items.size > 1) {
                store.dispatch(DownloadUIAction.ShowMultiSelectDeleteDialog(items))
            } else {
                val removeFromDisk = deleteBehavior == DeleteDownloadBehavior.DELETE_FROM_DEVICE
                store.dispatch(
                    DownloadUIAction.AddPendingDeletionSet(
                        removeFromDisk = removeFromDisk,
                        items = items,
                    ),
                )
            }
        }
    }

    private fun startDelayedRemoval(
        store: Store<DownloadUIState, DownloadUIAction>,
        items: Set<FileItem>,
        removeFromDisk: Boolean,
        delay: Long,
    ) {
        val itemIds = items.map { it.id }.toSet()
        val job = coroutineScope.launch {
            try {
                delay(delay)
                itemIds.forEach {
                    removeDownload(store, it, removeFromDisk)
                }
                store.dispatch(DownloadUIAction.FileItemDeletedSuccessfully)
            } catch (e: CancellationException) {
                store.dispatch(DownloadUIAction.UndoPendingDeletionSet(itemIds))
            } finally {
                // This avoids mistakenly clearing lastDeleteOperation if another job was started before
                // this one finished.
                if (lastDeleteOperation?.items == itemIds) {
                    lastDeleteOperation = null
                }
            }
        }
        lastDeleteOperation = DeleteOperation(job, itemIds)
    }

    private fun removeDownload(
        store: Store<DownloadUIState, DownloadUIAction>,
        id: String,
        removeFromDisk: Boolean,
    ) {
        removeDownloadUseCase(id, removeFromDisk)
        store.dispatch(DownloadUIAction.CancelDownload(id))
    }

    private data class DeleteOperation(
        private val deleteJob: Job,
        val items: Set<String>,
    ) {
        fun cancel() {
            deleteJob.cancel(CancellationException("Undo deletion"))
        }
    }
}
