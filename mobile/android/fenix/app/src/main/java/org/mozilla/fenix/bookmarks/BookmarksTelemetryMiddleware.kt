/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bookmarks

import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.telemetry.glean.private.NoExtras
import org.mozilla.fenix.GleanMetrics.BookmarksManagement
import org.mozilla.fenix.components.metrics.MetricsUtils

private val EDIT_SCREEN_METRIC_SOURCE = MetricsUtils.BookmarkAction.Source.BOOKMARK_EDIT_PAGE
private val LIST_SCREEN_METRIC_SOURCE = MetricsUtils.BookmarkAction.Source.BOOKMARK_PANEL

internal class BookmarksTelemetryMiddleware : Middleware<BookmarksState, BookmarksAction> {

    @Suppress("CyclomaticComplexMethod")
    override fun invoke(
        store: Store<BookmarksState, BookmarksAction>,
        next: (BookmarksAction) -> Unit,
        action: BookmarksAction,
    ) {
        val preReductionState = store.state
        next(action)
        when (action) {
            BackClicked -> preReductionState.handleBackClick()
            is DeletionDialogAction -> preReductionState.handleDeleteDialogAction(action)
            is BookmarkClicked -> {
                if (preReductionState.selectedItems.isEmpty()) {
                    BookmarksManagement.open.record(NoExtras())
                    MetricsUtils.recordBookmarkMetrics(
                        MetricsUtils.BookmarkAction.OPEN,
                        LIST_SCREEN_METRIC_SOURCE,
                    )
                }
            }

            is BookmarksListMenuAction.Folder -> handleBookmarksListMenuFolderAction(action)
            is BookmarksListMenuAction.Bookmark -> handleBookmarksListMenuBookmarkAction(action)
            is BookmarksListMenuAction.MultiSelect -> preReductionState.handleBookmarksListMenuMultiSelectAction(
                action,
            )
            is SnackbarAction -> preReductionState.handleSnackbarDismissedAction(action)
            SearchClicked -> {
                BookmarksManagement.searchIconTapped.record(NoExtras())
            }
            is BookmarksListMenuAction.SortMenu -> action.record()
            SelectFolderAction.SearchClicked,
            SelectFolderAction.SearchDismissed,
            is SelectFolderAction.SearchQueryUpdated,
            CloseClicked,
            AddFolderClicked,
            is SelectFolderAction.SortMenu,
            is BookmarkLongClicked,
            BookmarksListMenuAction.SelectAll,
            is BookmarksLoaded,
            is SearchDismissed,
            EditBookmarkAction.DeleteClicked,
            is EditBookmarkClicked,
            is FolderClicked,
            EditBookmarkAction.FolderClicked,
            is FolderLongClicked,
            is SelectFolderAction.FoldersLoaded,
            is SelectFolderAction.FilteredFoldersLoaded,
            is SelectFolderAction.ExpandedFolderLoaded,
            Init,
            is SelectFolderAction.ItemClicked,
            is SelectFolderAction.ChevronClicked,
            AddFolderAction.ParentFolderClicked,
            SignIntoSyncClicked,
            is AddFolderAction.FolderCreated,
            is AddFolderAction.TitleChanged,
            is EditBookmarkAction.TitleChanged,
            is EditBookmarkAction.URLChanged,
            SelectFolderAction.ViewAppeared,
            EditFolderAction.DeleteClicked,
            EditFolderAction.ParentFolderClicked,
            is RecursiveSelectionCountLoaded,
            is EditFolderAction.TitleChanged,
            OpenTabsConfirmationDialogAction.CancelTapped,
            OpenTabsConfirmationDialogAction.ConfirmTapped,
            is OpenTabsConfirmationDialogAction.Present,
            is InitEdit,
            is InitEditLoaded,
            is ReceivedSyncSignInUpdate,
            FirstSyncCompleted,
            ViewDisposed,
            PrivateBrowsingAuthorized,
            -> Unit
        }
    }

    private fun BookmarksState.handleSnackbarDismissedAction(action: SnackbarAction) {
        when (action) {
            SnackbarAction.Dismissed -> {
                val snackSnate = bookmarksSnackbarState
                if (snackSnate is BookmarksSnackbarState.UndoDeletion && snackSnate.guidsToDelete.size == 1) {
                    BookmarksManagement.removed.record(NoExtras())
                    val source = if (bookmarksEditFolderState != null) {
                        EDIT_SCREEN_METRIC_SOURCE
                    } else {
                        LIST_SCREEN_METRIC_SOURCE
                    }
                    MetricsUtils.recordBookmarkMetrics(MetricsUtils.BookmarkAction.DELETE, source)
                }
            }
            SnackbarAction.SelectFolderFailed,
            SnackbarAction.Undo,
            -> Unit
        }
    }

    private fun BookmarksState.handleBookmarksListMenuMultiSelectAction(action: BookmarksListMenuAction.MultiSelect) {
        when (action) {
            BookmarksListMenuAction.MultiSelect.OpenInNormalTabsClicked -> {
                BookmarksManagement.openInNewTabs.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.OPEN,
                    LIST_SCREEN_METRIC_SOURCE,
                )
            }

            BookmarksListMenuAction.MultiSelect.OpenInPrivateTabsClicked -> {
                BookmarksManagement.openInPrivateTabs.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.OPEN,
                    LIST_SCREEN_METRIC_SOURCE,
                )
            }

            BookmarksListMenuAction.MultiSelect.ShareClicked -> {
                selectedItems.filterIsInstance<BookmarkItem.Bookmark>()
                    .forEach { _ -> BookmarksManagement.shared.record(NoExtras()) }
            }

            BookmarksListMenuAction.MultiSelect.DeleteClicked,
            BookmarksListMenuAction.MultiSelect.EditClicked,
            BookmarksListMenuAction.MultiSelect.MoveClicked,
                -> Unit
        }
    }

    private fun handleBookmarksListMenuBookmarkAction(action: BookmarksListMenuAction.Bookmark) {
        when (action) {
            is BookmarksListMenuAction.Bookmark.OpenInNormalTabClicked -> {
                BookmarksManagement.openInNewTab.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.OPEN,
                    LIST_SCREEN_METRIC_SOURCE,
                )
            }

            is BookmarksListMenuAction.Bookmark.OpenInPrivateTabClicked -> {
                BookmarksManagement.openInPrivateTab.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.OPEN,
                    LIST_SCREEN_METRIC_SOURCE,
                )
            }

            is BookmarksListMenuAction.Bookmark.ShareClicked -> {
                BookmarksManagement.shared.record(NoExtras())
            }

            is BookmarksListMenuAction.Bookmark.CopyClicked -> {
                BookmarksManagement.copied.record(NoExtras())
            }

            is BookmarksListMenuAction.Bookmark.DeleteClicked,
            is BookmarksListMenuAction.Bookmark.EditClicked,
            is BookmarksListMenuAction.Bookmark.SelectClicked,
                -> Unit
        }
    }

    private fun handleBookmarksListMenuFolderAction(action: BookmarksListMenuAction.Folder) {
        when (action) {
            is BookmarksListMenuAction.Folder.OpenAllInNormalTabClicked -> {
                BookmarksManagement.openAllInNewTabs.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.OPEN,
                    LIST_SCREEN_METRIC_SOURCE,
                )
            }

            is BookmarksListMenuAction.Folder.OpenAllInPrivateTabClicked -> {
                BookmarksManagement.openInPrivateTabs.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.OPEN,
                    LIST_SCREEN_METRIC_SOURCE,
                )
            }

            is BookmarksListMenuAction.Folder.EditClicked,
            is BookmarksListMenuAction.Folder.DeleteClicked,
            is BookmarksListMenuAction.Folder.SelectClicked,
                -> Unit
        }
    }

    private fun BookmarksState.handleBackClick() {
        when {
            bookmarksEditBookmarkState != null -> {
                BookmarksManagement.edited.record(NoExtras())
                MetricsUtils.recordBookmarkMetrics(
                    MetricsUtils.BookmarkAction.EDIT,
                    EDIT_SCREEN_METRIC_SOURCE,
                )
                if (bookmarksEditBookmarkState.folder != currentFolder) {
                    BookmarksManagement.moved.record(NoExtras())
                }
            }

            bookmarksAddFolderState != null -> {
                if (bookmarksAddFolderState.folderBeingAddedTitle != "") {
                    BookmarksManagement.folderAdd.record(NoExtras())
                }
            }

            bookmarksSelectFolderState != null -> {
                if (bookmarksMultiselectMoveState != null &&
                    bookmarksMultiselectMoveState.destination != currentFolder.guid
                ) {
                    BookmarksManagement.moved.record(NoExtras())
                }
            }
        }
    }

    private fun BookmarksListMenuAction.SortMenu.record() = when (this) {
        BookmarksListMenuAction.SortMenu.SortMenuButtonClicked -> BookmarksManagement.sortMenuClicked.record()
        BookmarksListMenuAction.SortMenu.SortMenuDismissed -> Unit
        BookmarksListMenuAction.SortMenu.CustomSortClicked -> BookmarksManagement.sortByCustom.record()
        BookmarksListMenuAction.SortMenu.NewestClicked -> BookmarksManagement.sortByNewest.record()
        BookmarksListMenuAction.SortMenu.OldestClicked -> BookmarksManagement.sortByOldest.record()
        BookmarksListMenuAction.SortMenu.AtoZClicked -> BookmarksManagement.sortByAToZ.record()
        BookmarksListMenuAction.SortMenu.ZtoAClicked -> BookmarksManagement.sortByZToA.record()
    }

    private fun BookmarksState.handleDeleteDialogAction(action: DeletionDialogAction) {
        when (action) {
            DeletionDialogAction.DeleteTapped -> {
                val deletedItems = bookmarkItems.filter {
                    it.guid in bookmarksDeletionDialogState.guidsToDelete
                }
                if (deletedItems.any { it is BookmarkItem.Folder }) {
                    BookmarksManagement.folderRemove.record(NoExtras())
                }

                if (deletedItems.size > 1) {
                    BookmarksManagement.multiRemoved.record(NoExtras())
                }
            }

            is DeletionDialogAction.CountLoaded,
            DeletionDialogAction.CancelTapped,
                -> Unit
        }
    }
}
