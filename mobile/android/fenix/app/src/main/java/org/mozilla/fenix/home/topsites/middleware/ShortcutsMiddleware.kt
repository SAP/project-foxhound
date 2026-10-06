/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.topsites.middleware

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import mozilla.components.feature.top.sites.TopSitesUseCases
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import mozilla.components.lib.state.ext.flow
import mozilla.components.service.merino.manifest.MerinoManifestProvider
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.home.topsites.store.ShortcutsAction
import org.mozilla.fenix.home.topsites.store.ShortcutsState
import org.mozilla.fenix.home.topsites.store.ShortcutsStore
import org.mozilla.fenix.home.topsites.store.toPopularSite
import org.mozilla.fenix.utils.Settings

private const val POPULAR_SITES_LIMIT = 8

/**
 * [Middleware] implementation for handling [ShortcutsAction] and managing the [ShortcutsState]
 * for the shortcuts screen.
 *
 * @param appStore The [AppStore] to observe for top site updates.
 * @param topSitesUseCases The [TopSitesUseCases] used to persist new pinned shortcuts.
 * @param merinoManifestProvider The [MerinoManifestProvider] used to read popular site suggestions.
 * @param settings The [Settings] used to read whether the add shortcut tile is enabled.
 * @param scope The lifecycle-aware [CoroutineScope] used to launch coroutines. The consumer is
 * responsible for providing a scope that gets canceled when the consuming component is destroyed
 * to avoid leaking the [ShortcutsStore].
 */
class ShortcutsMiddleware(
    private val appStore: AppStore,
    private val topSitesUseCases: TopSitesUseCases,
    private val merinoManifestProvider: MerinoManifestProvider,
    private val settings: Settings,
    private val scope: CoroutineScope,
) : Middleware<ShortcutsState, ShortcutsAction> {

    override fun invoke(
        store: Store<ShortcutsState, ShortcutsAction>,
        next: (ShortcutsAction) -> Unit,
        action: ShortcutsAction,
    ) {
        when (action) {
            is ShortcutsAction.InitAction -> initialize(store = store)
            is ShortcutsAction.SaveShortcut -> saveShortcut(
                store = store,
                title = action.title,
                url = action.url,
            )

            else -> Unit
        }

        next(action)
    }

    private fun initialize(
        store: Store<ShortcutsState, ShortcutsAction>,
    ) {
        store.dispatch(
            ShortcutsAction.UpdateShowAddShortcut(settings.enableAddShortcutsImprovement),
        )

        store.dispatch(
            ShortcutsAction.UpdatePopularSites(
                merinoManifestProvider.getTopDomains(limit = POPULAR_SITES_LIMIT)
                    .map { it.toPopularSite() },
            ),
        )

        scope.launch {
            appStore.flow()
                .map { it.topSites }
                .distinctUntilChanged()
                .collect { topSites ->
                    store.dispatch(ShortcutsAction.UpdateTopSites(topSites))
                }
        }
    }

    private fun saveShortcut(
        store: Store<ShortcutsState, ShortcutsAction>,
        title: String,
        url: String,
    ) = scope.launch {
        topSitesUseCases.addPinnedSites(title = title, url = url)
        store.dispatch(ShortcutsAction.CloseDialog)
    }
}
