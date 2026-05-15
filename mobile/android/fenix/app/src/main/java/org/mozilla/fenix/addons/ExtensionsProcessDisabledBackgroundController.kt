/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.webextensions.ExtensionsProcessDisabledPromptObserver
import org.mozilla.fenix.components.AppStore
import kotlin.system.exitProcess

/**
 * Controller for handling extensions process spawning disabled events. This is for when the app is
 * in background, the app is killed to prevent extensions from being disabled and network requests
 * continuing.
 *
 * @param browserStore The [BrowserStore] which holds the state for showing the dialog.
 * @param appStore The [AppStore] containing the application state.
 * @param dispatcher The [CoroutineDispatcher] on which the observer operations will run.
 * @param onExtensionsProcessDisabled Invoked when the app is in background and extensions process
 * is disabled.
 */
class ExtensionsProcessDisabledBackgroundController(
    browserStore: BrowserStore,
    appStore: AppStore,
    dispatcher: CoroutineDispatcher = Dispatchers.Main,
    onExtensionsProcessDisabled: () -> Unit = { killApp() },
) : ExtensionsProcessDisabledPromptObserver(
    store = browserStore,
    shouldCancelOnStop = false,
    dispatcher = dispatcher,
    onShowExtensionsProcessDisabledPrompt = {
        if (!appStore.state.isForeground) {
            onExtensionsProcessDisabled()
        }
    },
) {

    companion object {
        /**
         * When a dialog can't be shown because the app is in the background, instead the app will
         * be killed to prevent leaking network data without extensions enabled.
         */
        private fun killApp() {
            exitProcess(0)
        }
    }
}
