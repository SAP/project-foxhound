/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.mapNotNull
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.support.base.feature.LifecycleAwareFeature
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.snackbar.SnackbarState

/**
 * Manages the display of snackbars related to download status changes.
 *
 * @param store The [BrowserStore] instance to observe download states from.
 * @param appStore The [AppStore] instance to dispatch snackbar-related actions to.
 * @param mainDispatcher The [CoroutineDispatcher] to use for main-thread operations.
 */
class DownloadSnackbar(
    private val store: BrowserStore,
    private val appStore: AppStore,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : LifecycleAwareFeature {
    private var scope: CoroutineScope? = null

    override fun start() {
        scope = store.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.mapNotNull { it.downloads }
                .distinctUntilChangedBy { it.values }
                .collect { downloads ->
                    val snackbarState = appStore.state.snackbarState
                    if (snackbarState is SnackbarState.None &&
                        snackbarState.previous is SnackbarState.DownloadInProgress
                    ) {
                        val previousDownloadId = snackbarState.previous.downloadId
                        downloads.values.find {
                            it.status == DownloadState.Status.CANCELLED && it.id == previousDownloadId
                        }?.let {
                            appStore.dispatch(AppAction.SnackbarAction.SnackbarDismissed)
                        }
                    }
                }
        }
    }

    override fun stop() {
        scope?.cancel()
    }
}
