/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.search.SearchEngine
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.selectedOrDefaultSearchEngine
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.top.sites.presenter.DefaultTopSitesPresenter
import mozilla.components.lib.state.helpers.AbstractBinding

/**
 * A binding for starting the [DefaultTopSitesPresenter] and observing the [SearchEngine]
 * to update the top sites that are displayed.
 *
 * @param browserStore The [BrowserStore] to observe state changes.
 * @param presenter The [DefaultTopSitesPresenter] that connects the top sites view
 * with the storage.
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will
 * occur. Defaults to [Dispatchers.Main].
 */
class TopSitesBinding(
    browserStore: BrowserStore,
    private val presenter: DefaultTopSitesPresenter,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<BrowserState>(browserStore, mainDispatcher) {

    override fun start() {
        super.start()
        presenter.start()
    }

    override fun stop() {
        super.stop()
        presenter.stop()
    }

    override suspend fun onState(flow: Flow<BrowserState>) {
        // Whenever the selected search engine changes, update the top sites that are presented.
        flow.map { state -> state.search.selectedOrDefaultSearchEngine?.name }
            .distinctUntilChanged()
            .collect {
                presenter.onStorageUpdated()
            }
    }
}
