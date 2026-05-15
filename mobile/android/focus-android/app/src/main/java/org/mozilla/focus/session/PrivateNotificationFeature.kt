/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.session

import android.content.Context
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.selector.privateTabs
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.lib.state.ext.flowScoped
import mozilla.components.support.base.feature.LifecycleAwareFeature

/**
 * Responsible for starting or stopping a [SessionNotificationService]
 * depending on whether a private tab is open.
 *
 * This feature observes the number of private tabs in the [BrowserStore].
 * When a private tab is opened, it starts the [SessionNotificationService].
 * When all private tabs are closed, it stops the service.
 *
 * @param context The application context.
 * @param browserStore The [BrowserStore] used to observe the number of private tabs.
 * @param crashReporter The [CrashReporting] instance for error reporting.
 * @param mainDispatcher The [CoroutineDispatcher] to be used for observing the store.
 * @param permissionRequestHandler A lambda function to handle permission requests for the notification service.
 */
class PrivateNotificationFeature(
    context: Context,
    private val browserStore: BrowserStore,
    private val crashReporter: CrashReporting,
    private val mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val permissionRequestHandler: (() -> Unit),
) : LifecycleAwareFeature {

    private val applicationContext = context.applicationContext
    private var scope: CoroutineScope? = null

    override fun start() {
        scope = browserStore.flowScoped(dispatcher = mainDispatcher) { flow ->
            flow.map { state -> state.privateTabs.isNotEmpty() }
                .distinctUntilChanged()
                .collect { hasPrivateTabs ->
                    if (hasPrivateTabs) {
                        SessionNotificationService.start(applicationContext, permissionRequestHandler, crashReporter)
                    } else {
                        SessionNotificationService.stop(applicationContext)
                    }
                }
        }
    }

    override fun stop() {
        scope?.cancel()
    }
}
