/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.bindings

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import mozilla.components.browser.state.selector.selectedTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.app.links.AppLinksUseCases
import mozilla.components.lib.state.helpers.AbstractBinding
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.SupportedMenuNotifications
import org.mozilla.fenix.utils.Settings

/**
 * Observes the current url from the [BrowserStore] and updates the [AppStore]
 * to show a notification in the main menu when an external app can be opened for the current url.
 *
 * @param settings The settings to check if an external app was opened.
 * @param appLinksUseCases The use cases for handling app links.
 * @param appStore The application store for dispatching actions.
 * @param browserStore The browser store to observe state changes.
 * @param mainDispatcher The [CoroutineDispatcher] on which the state observation and updates will occur.
 *                       Defaults to [Dispatchers.Main].
 */
class ExternalAppLinkStatusBinding(
    private val settings: Settings,
    private val appLinksUseCases: AppLinksUseCases,
    private val appStore: AppStore,
    browserStore: BrowserStore,
    mainDispatcher: CoroutineDispatcher = Dispatchers.Main,
) : AbstractBinding<BrowserState>(browserStore, mainDispatcher) {

    override suspend fun onState(flow: Flow<BrowserState>) {
        flow
            .map { it.selectedTab?.content?.url }
            .distinctUntilChanged()
            .map { url ->
                url != null && !settings.openInAppOpened &&
                        appLinksUseCases.appLinkRedirect(url).hasExternalApp()
            }
            .distinctUntilChanged()
            .collect { shouldShowNotification ->
                val action = if (shouldShowNotification) {
                    AppAction.MenuNotification.AddMenuNotification(
                        SupportedMenuNotifications.OpenInApp,
                    )
                } else {
                    AppAction.MenuNotification.RemoveMenuNotification(
                        SupportedMenuNotifications.OpenInApp,
                    )
                }
                appStore.dispatch(action)
            }
    }
}
