/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.search

import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.ext.flow
import org.mozilla.fenix.search.SearchFragmentAction.Init
import org.mozilla.fenix.search.SearchFragmentAction.UpdateSearchState
import org.mozilla.fenix.search.SearchFragmentStore.Environment
import mozilla.components.lib.state.Action as MVIAction

/**
 * [SearchFragmentStore] [Middleware] to synchronize search related details from [BrowserStore].
 *
 * @param browserStore The [BrowserStore] to sync from.
 * @param scope [CoroutineScope] used for running long running operations in background.
 */
class BrowserStoreToFenixSearchMapperMiddleware(
    private val browserStore: BrowserStore,
    private val scope: CoroutineScope,
) : Middleware<SearchFragmentState, SearchFragmentAction> {
    @VisibleForTesting
    internal var environment: Environment? = null
    private var observeBrowserSearchStateJob: Job? = null

    override fun invoke(
        store: Store<SearchFragmentState, SearchFragmentAction>,
        next: (SearchFragmentAction) -> Unit,
        action: SearchFragmentAction,
    ) {
        next(action)

        if (action is Init) {
            observeBrowserSearchState(store)
        }
    }

    private fun observeBrowserSearchState(store: Store<SearchFragmentState, SearchFragmentAction>) {
        observeBrowserSearchStateJob = browserStore.observeWhileActive {
            map { it.search }
                .distinctUntilChanged()
                .collect { searchState ->
                    store.dispatch(
                        UpdateSearchState(searchState, true),
                    )
                }
        }
    }

    private inline fun <S : State, A : MVIAction> Store<S, A>.observeWhileActive(
        crossinline observe: suspend (Flow<S>.() -> Unit),
    ): Job = scope.launch { flow().observe() }
}
