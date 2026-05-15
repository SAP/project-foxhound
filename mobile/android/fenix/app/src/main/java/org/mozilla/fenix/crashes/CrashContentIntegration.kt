/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import android.view.ViewGroup.MarginLayoutParams
import androidx.annotation.VisibleForTesting
import androidx.navigation.NavController
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.distinctUntilChangedBy
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.mapNotNull
import kotlinx.coroutines.launch
import mozilla.components.browser.state.selector.findTabOrCustomTabOrSelectedTab
import mozilla.components.browser.state.selector.normalTabs
import mozilla.components.browser.state.selector.privateTabs
import mozilla.components.browser.state.state.EngineState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.browser.toolbar.BrowserToolbar
import mozilla.components.concept.toolbar.ScrollableToolbar
import mozilla.components.lib.state.ext.flow
import mozilla.components.support.base.feature.LifecycleAwareFeature
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.Components
import org.mozilla.fenix.utils.Settings

/**
 * Helper for observing [BrowserStore] and show an in-app crash reporter for tabs with content crashes.
 *
 * Note that you have to call `integration.viewProvider` to set the provider that will provide
 *
 * @param browserStore [BrowserStore] observed for any changes related to [EngineState.crashed].
 * @param appStore [AppStore] that tracks all content crashes in the current app session until the user
 * decides to either send or dismiss all crash reports.
 * @param toolbar [BrowserToolbar] that will be expanded when showing the in-app crash reporter.
 * @param components [Components] allowing interactions with other app features.
 * @param settings [Settings] allowing to check whether crash reporting is enabled or not.
 * @param navController [NavController] used to navigate to other parts of the app.
 * @param customTabSessionId [String] Id of the tab or custom tab which should be observed for [EngineState.crashed]
 * depending on which the [CrashContentView] provided by [viewProvider] will be shown or hidden.
 * @param dispatcher The [CoroutineDispatcher] to use for launching coroutines. Defaults to [Dispatchers.Main].
 * @param getTopToolbarHeightValue Function to provide the top toolbar height.
 * @param getBottomToolbarHeightValue Function to provide the bottom toolbar height.
 *
 * Sample usage:
 *
 * ```kotlin
 * class MyFragment : Fragment() {
 *
 *   override fun onCreateView(view: View, savedInstanceState: Bundle) {
 *      //...
 *      val integration = CrashContentIntegration(
 *          // ... other params ...
 *          getTopToolbarHeightValue = { includeTabStrip -> this.getTopToolbarHeight(includeTabStrip) },
 *          getBottomToolbarHeightValue = { includeNavBar -> this.getBottomToolbarHeight(includeNavBar) }
 *      )
 *
 *      // set the view provider. it will be automatically cleared when the lifecycle gets to the
 *      // `STOPPED` state
 *      integration.viewProvider = { binding.crashContentView }
 *   }
 * }
 * ```
 */

@Suppress("LongParameterList")
class CrashContentIntegration(
    private val browserStore: BrowserStore,
    private val appStore: AppStore,
    private val toolbar: ScrollableToolbar,
    private val components: Components,
    private val settings: Settings,
    private val navController: NavController,
    private val customTabSessionId: String?,
    private val dispatcher: CoroutineDispatcher = Dispatchers.Main,
    private val getTopToolbarHeightValue: (includeTabStripIfAvailable: Boolean) -> Int,
    private val getBottomToolbarHeightValue: (includeNavBarIfEnabled: Boolean) -> Int,
) : LifecycleAwareFeature {

    /**
     * Nullable provider to provide the [CrashContentView]
     * which will be shown if the current tab is marked as crashed.
     */
    internal var viewProvider: (() -> CrashContentView)? = null

    private lateinit var scope: CoroutineScope
    private val crashReporterView: CrashContentView?
        get() = viewProvider?.invoke()

    override fun start() {
        scope = CoroutineScope(dispatcher + SupervisorJob())
        scope.launch {
            browserStore.flow()
                .mapNotNull { state -> state.findTabOrCustomTabOrSelectedTab(customTabSessionId) }
                .distinctUntilChangedBy { tab -> tab.engineState.crashed }
                .collect { tab ->
                    if (tab.engineState.crashed) {
                        toolbar.expand()

                        crashReporterView?.apply {
                            val controller = CrashReporterController(
                                sessionId = tab.id,
                                currentNumberOfTabs = if (tab.content.private) {
                                    browserStore.state.privateTabs.size
                                } else {
                                    browserStore.state.normalTabs.size
                                },
                                components = components,
                                settings = settings,
                                navController = navController,
                                appStore = appStore,
                            )

                            show(controller)

                            updateVerticalMargins()
                        }
                    } else {
                        crashReporterView?.hide()
                    }
                }
        }

        scope.launch {
            appStore.flow()
                .distinctUntilChangedBy { it.orientation }
                .map { it.orientation }
                .collect {
                    updateVerticalMargins()
                }
        }
    }

    override fun stop() {
        viewProvider = null
        scope.cancel()
    }

    @VisibleForTesting
    internal fun updateVerticalMargins() = crashReporterView?.apply {
        with(layoutParams as MarginLayoutParams) {
            // TabStrip and navBar are not used in custom tabs
            topMargin = getTopToolbarHeightValue(customTabSessionId == null)
            bottomMargin = getBottomToolbarHeightValue(customTabSessionId == null)
        }
    }
}
