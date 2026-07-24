/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.toolbar

import androidx.navigation.NavController
import mozilla.components.browser.state.state.selectedOrDefaultSearchEngine
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.support.ktx.kotlin.isUrl
import org.mozilla.fenix.GleanMetrics.Events
import org.mozilla.fenix.NavGraphDirections
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.BrowserAnimator
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.NimbusComponents
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchStarted
import org.mozilla.fenix.components.metrics.MetricsUtils
import org.mozilla.fenix.components.usecases.FenixBrowserUseCases
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.utils.Settings

/**
 * An interface that handles the view manipulation of the home screen toolbar.
 */
interface ToolbarController {
    /**
     * @see [ToolbarInteractor.onPasteAndGo]
     */
    fun handlePasteAndGo(clipboardText: String)

    /**
     * @see [ToolbarInteractor.onPaste]
     */
    fun handlePaste(clipboardText: String)

    /**
     * @see [ToolbarInteractor.onNavigateSearch]
     */
    fun handleNavigateSearch()
}

/**
 * The default implementation of [ToolbarController].
 */
class DefaultToolbarController(
    private val appStore: AppStore,
    private val browserStore: BrowserStore,
    private val nimbusComponents: NimbusComponents,
    private val navController: NavController,
    private val settings: Settings,
    private val fenixBrowserUseCases: FenixBrowserUseCases,
) : ToolbarController {
    override fun handlePasteAndGo(clipboardText: String) {
        val searchEngine = browserStore.state.search.selectedOrDefaultSearchEngine

        navController.navigate(R.id.browserFragment)
        fenixBrowserUseCases.loadUrlOrSearch(
            searchTermOrURL = clipboardText,
            newTab = !settings.enableHomepageAsNewTab,
            private = appStore.state.mode.isPrivate,
            searchEngine = searchEngine,
        )

        if (clipboardText.isUrl() || searchEngine == null) {
            Events.enteredUrl.record(Events.EnteredUrlExtra(autocomplete = false))
        } else {
            val searchAccessPoint = MetricsUtils.Source.ACTION
            MetricsUtils.recordSearchMetrics(
                engine = searchEngine,
                isDefault = searchEngine == browserStore.state.search.selectedOrDefaultSearchEngine,
                searchAccessPoint = searchAccessPoint,
                nimbusEventStore = nimbusComponents.events,
            )
        }
    }
    override fun handlePaste(clipboardText: String) {
        val directions = NavGraphDirections.actionGlobalSearchDialog(
            sessionId = null,
            pastedText = clipboardText,
        )
        navController.nav(navController.currentDestination?.id, directions)
    }

    override fun handleNavigateSearch() {
        if (settings.shouldUseComposableToolbar) {
            appStore.dispatch(SearchStarted())
        } else {
            val directions =
                NavGraphDirections.actionGlobalSearchDialog(
                    sessionId = null,
                )

            navController.nav(
                navController.currentDestination?.id,
                directions,
                BrowserAnimator.getToolbarNavOptions(toolbarPosition = settings.toolbarPosition),
            )
        }
        Events.searchBarTapped.record(Events.SearchBarTappedExtra("HOME"))
    }
}
