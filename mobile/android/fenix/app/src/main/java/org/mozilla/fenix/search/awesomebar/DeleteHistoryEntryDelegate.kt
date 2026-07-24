/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search.awesomebar

import android.view.View
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.components.browser.storage.sync.PlacesHistoryStorage
import mozilla.components.concept.awesomebar.AwesomeBar
import mozilla.components.concept.awesomebar.AwesomeBar.GroupedSuggestion
import mozilla.components.feature.awesomebar.provider.SearchTermSuggestionsProvider
import mozilla.components.support.ktx.kotlin.toShortUrl
import org.mozilla.fenix.R
import org.mozilla.fenix.components.Components
import org.mozilla.fenix.search.SearchFragmentAction.SuggestionHidden
import org.mozilla.fenix.search.SearchFragmentAction.SuggestionRestored
import org.mozilla.fenix.search.SearchFragmentStore
import org.mozilla.fenix.utils.allowUndo

/**
 * Helper for deleting a history entry shown in the AwesomeBar
 * while showing to users a snackbar allowing to undo the operation.
 *
 * @param container Container [View] in which the snackbar will be shown
 * @param components [Components] allowing interactions with other application features.
 * @param searchStore [SearchFragmentStore] controlling what search results are displayed.
 * Updated for soft deletions.
 * @param snackbarDispatcher [Dispatchers] used for handling the undo operation of the shown snackbar.
 * @param ioDispatcher [Dispatchers] used for deleting history entries from disk.
 */
class DeleteHistoryEntryDelegate(
    private val container: View,
    private val components: Components,
    private val searchStore: SearchFragmentStore,
    private val snackbarDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    /**
     * Handle soft and hard deletions of history items shown in the [AwesomeBar].
     *
     * @param item The history item to delete.
     */
    fun handleDeletingHistoryEntry(
        item: GroupedSuggestion,
    ) {
        searchStore.dispatch(SuggestionHidden(item))

        val historyStorage = components.core.historyStorage
        CoroutineScope(snackbarDispatcher).allowUndo(
            view = container,
            message = container.context.getString(
                R.string.search_suggestions_delete_history_item_snackbar,
                when (item.isSearchTerm) {
                    true -> item.suggestion.title
                    false -> item.suggestion.description?.toShortUrl(components.publicSuffixList)
                 },
            ),
            undoActionTitle = container.context.getString(R.string.snackbar_deleted_undo),
            onCancel = {
                searchStore.dispatch(SuggestionRestored(item))
            },
            operation = {
                deleteHistorySuggestion(
                    historyStorage = historyStorage,
                    item = item,
                )
            },
        )
    }

    private suspend fun deleteHistorySuggestion(
        historyStorage: PlacesHistoryStorage,
        item: GroupedSuggestion,
    ) = withContext(ioDispatcher) {
        when (item.isSearchTerm) {
            true -> item.suggestion.title?.let {
                historyStorage.deleteHistoryMetadata(it)
            }
            else -> item.suggestion.description?.let {
                historyStorage.deleteVisitsFor(it)
            }
        }
    }

    private val GroupedSuggestion.isSearchTerm
        get() = suggestion.provider is SearchTermSuggestionsProvider
}
