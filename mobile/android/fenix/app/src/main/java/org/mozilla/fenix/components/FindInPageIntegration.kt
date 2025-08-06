/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components

import android.view.View
import android.view.ViewGroup.MarginLayoutParams
import androidx.annotation.UiThread
import androidx.annotation.VisibleForTesting
import mozilla.components.browser.state.selector.findCustomTabOrSelectedTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.EngineView
import mozilla.components.feature.findinpage.FindInPageFeature
import mozilla.components.feature.findinpage.view.FindInPageBar
import mozilla.components.support.base.feature.LifecycleAwareFeature
import mozilla.components.support.base.feature.UserInteractionHandler
import org.mozilla.fenix.R
import org.mozilla.fenix.components.appstate.AppAction.FindInPageAction
import org.mozilla.fenix.components.appstate.AppState

/**
 * BrowserFragment delegate to handle all layout updates needed to show or hide the find in page bar.
 *
 * @param store The [BrowserStore] used to look up the current selected tab.
 * @param appStore The [AppStore] used to update the [AppState.showFindInPage] state.
 * @param sessionId ID of the [store] session in which the query will be performed.
 * @param view The [FindInPageBar] view to display.
 * @param engineView the browser in which the queries will be made and which needs to be better positioned
 * to suit the find in page bar.
 * @param toolbarsHideCallback Callback to hide all toolbars to ensure an unobstructed browser page
 * in which to search and present results.
 * @param toolbarsResetCallback Callback to reset the toolbars to how they should be displayed
 * after this feature is dismissed.
 * @param findInPageHeight The height of the find in page bar.
 */
class FindInPageIntegration(
    private val store: BrowserStore,
    private val appStore: AppStore,
    private val sessionId: String? = null,
    private val view: FindInPageBar,
    private val engineView: EngineView,
    private val toolbarsHideCallback: () -> Unit,
    private val toolbarsResetCallback: () -> Unit,
    private val findInPageHeight: Int = view.context.resources.getDimensionPixelSize(R.dimen.browser_toolbar_height),
) : LifecycleAwareFeature, UserInteractionHandler {
    @VisibleForTesting
    internal val feature by lazy { FindInPageFeature(store, view, engineView, ::onClose) }
    private var _isFeatureActive = false

    /**
     * Check if the find in page feature is active in this instant.
     */
    val isFeatureActive
        get() = _isFeatureActive

    override fun start() {
        feature.start()
    }

    override fun stop() {
        feature.stop()
        appStore.dispatch(FindInPageAction.FindInPageDismissed)
    }

    override fun onBackPressed(): Boolean {
        return feature.onBackPressed()
    }

    private fun onClose() {
        view.visibility = View.GONE
        getEngineViewsLayoutParams().bottomMargin = 0
        toolbarsResetCallback.invoke()
        appStore.dispatch(FindInPageAction.FindInPageDismissed)
        _isFeatureActive = false
    }

    /**
     * Start the find in page functionality.
     */
    @UiThread
    fun launch() {
        onLaunch(view, feature)
    }

    private fun onLaunch(view: View, feature: LifecycleAwareFeature) {
        store.state.findCustomTabOrSelectedTab(sessionId)?.let { tab ->
            _isFeatureActive = true
            toolbarsHideCallback.invoke()
            getEngineViewsLayoutParams().bottomMargin = findInPageHeight

            view.visibility = View.VISIBLE
            (feature as FindInPageFeature).bind(tab)
            view.layoutParams.height = findInPageHeight
        }
    }

    private fun getEngineViewParent() = engineView.asView().parent as View

    private fun getEngineViewsLayoutParams() = getEngineViewParent().layoutParams as MarginLayoutParams
}
