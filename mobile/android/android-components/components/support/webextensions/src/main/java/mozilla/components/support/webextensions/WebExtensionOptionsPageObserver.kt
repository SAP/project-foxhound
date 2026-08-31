/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.webextensions

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.state.ActiveOptionsPage
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.support.base.feature.LifecycleAwareFeature

/**
 * Feature implementation that opens options page for web extensions.
 *
 * @property store the application's [BrowserStore].
 * @property onOpenOptionsPage a callback invoked when the application should open an
 * options page. This is a lambda accepting the [ActiveOptionsPage] of the extension
 * that wants to open an options page.
 */
class WebExtensionOptionsPageObserver(
    private val store: BrowserStore,
    private val onOpenOptionsPage: (ActiveOptionsPage) -> Unit = { },
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : LifecycleAwareFeature {
    private var optionsPageScope: CoroutineScope? = null

    override fun start() {
        optionsPageScope = store.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.distinctUntilChangedBy { it.extensions }
                .map { it.extensions.filterValues { ext -> ext.activeOptionsPage != null } }
                .distinctUntilChanged()
                .collect { extensionStates ->
                    if (extensionStates.values.isNotEmpty()) {
                        // We currently limit to one active options page at a time
                        onOpenOptionsPage(extensionStates.values.first().activeOptionsPage!!)
                    }
                }
        }
    }

    override fun stop() {
        optionsPageScope?.cancel()
    }
}
