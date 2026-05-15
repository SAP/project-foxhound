/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import mozilla.components.feature.top.sites.TopSitesProvider
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.utils.RunWhenReadyQueue
import org.mozilla.fenix.perf.StartupPathProvider
import org.mozilla.fenix.utils.Settings

/**
 * Class to refresh the top sites using the [TopSitesProvider]
 *
 * @param settings Fenix [Settings]
 * @param topSitesProvider [TopSitesProvider] to refresh top sites
 * @param visualCompletenessQueue [RunWhenReadyQueue] for visual completeness
 * @param startupPathProvider [StartupPathProvider] that tells us whether the app was started
 * for "app link" (aka [StartupPathProvider.StartupPath.VIEW]) or "home" (aka [StartupPathProvider.StartupPath.MAIN])
 * @param dispatcher [CoroutineDispatcher] to use launch the refresh job.
 * Default value is [Dispatchers.IO]. It is helpful to improve testability
 */
class TopSitesRefresher(
    private val settings: Settings,
    private val topSitesProvider: TopSitesProvider,
    private val visualCompletenessQueue: RunWhenReadyQueue,
    private val startupPathProvider: StartupPathProvider,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : DefaultLifecycleObserver {

    private val logger = Logger("TopSitesRefresher")
    private val scope = CoroutineScope(dispatcher)

    override fun onResume(owner: LifecycleOwner) {
        if (!settings.showContileFeature) return

        if (isAppLinkStartup()) {
            // for app link startups
            // do not refresh top sites until visual completeness is ready
            // see bug https://bugzilla.mozilla.org/show_bug.cgi?id=1987602
            visualCompletenessQueue.runIfReadyOrQueue {
                refreshTopSites()
            }
        } else {
            refreshTopSites()
        }
    }

    override fun onPause(owner: LifecycleOwner) {
        scope.cancel()
    }

    private fun refreshTopSites() {
        scope.launch(dispatcher) {
            runCatching {
                topSitesProvider.refreshTopSitesIfCacheExpired()
            }.onFailure { exception ->
                logger.error("Failed to refresh contile top sites", exception)
            }
        }
    }

    private fun isAppLinkStartup(): Boolean {
        return startupPathProvider.startupPathForActivity == StartupPathProvider.StartupPath.VIEW
    }
}
