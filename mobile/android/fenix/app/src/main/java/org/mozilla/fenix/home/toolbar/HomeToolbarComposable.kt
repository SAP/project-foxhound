/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.toolbar

import android.content.Context
import android.view.Gravity
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.DividerDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.res.colorResource
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.updateLayoutParams
import androidx.navigation.NavController
import mozilla.components.browser.state.action.AwesomeBarAction
import mozilla.components.browser.state.ext.getUrl
import mozilla.components.browser.state.selector.findTab
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.compose.base.utils.BackInvokedHandler
import mozilla.components.compose.browser.toolbar.BrowserToolbar
import mozilla.components.compose.browser.toolbar.store.BrowserEditToolbarAction.SearchQueryUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarAction.ToolbarGravityUpdated
import mozilla.components.compose.browser.toolbar.store.BrowserToolbarStore
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity.Bottom
import mozilla.components.compose.browser.toolbar.store.ToolbarGravity.Top
import mozilla.components.compose.browser.toolbar.ui.BrowserToolbarQuery
import mozilla.components.lib.state.ext.observeAsComposableState
import mozilla.components.support.ktx.android.view.ImeInsetsSynchronizer
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.browser.browsingmode.BrowsingModeManager
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchEnded
import org.mozilla.fenix.components.appstate.AppAction.SearchAction.SearchStarted
import org.mozilla.fenix.components.metrics.MetricsUtils
import org.mozilla.fenix.components.toolbar.ToolbarPosition.BOTTOM
import org.mozilla.fenix.components.toolbar.ToolbarPosition.TOP
import org.mozilla.fenix.databinding.FragmentHomeBinding
import org.mozilla.fenix.theme.FirefoxTheme
import org.mozilla.fenix.utils.Settings
import org.mozilla.fenix.wallpapers.Wallpaper

/**
 * A wrapper over the [BrowserToolbar] composable to allow for extra customisation and
 * integration in the same framework as the [HomeToolbarView].
 *
 * @param context [Context] used for various system interactions.
 * @param homeBinding [FragmentHomeBinding] which will serve as parent for this composable.
 * @param navController [NavController] to use for navigating to other in-app destinations.
 * @param toolbarStore [BrowserToolbarStore] containing the composable toolbar state.
 * @param appStore [AppStore] to sync from.
 * @param browserStore [BrowserStore] to sync from.
 * @param browsingModeManager [BrowsingModeManager] Manager holding current state of whether
 * the browser is in private mode or not.
 * @param settings [Settings] for querying various application settings.
 * @param directToSearchConfig [DirectToSearchConfig] configuration for starting with the toolbar in search mode.
 * @param tabStripContent [Composable] as the tab strip content to be displayed together with this toolbar.
 * @param searchSuggestionsContent [Composable] as the search suggestions content to be displayed
 * together with this toolbar.
 * @param navigationBarContent Composable content for the navigation bar.
 */
@Suppress("LongParameterList")
internal class HomeToolbarComposable(
    private val context: Context,
    private val homeBinding: FragmentHomeBinding,
    private val navController: NavController,
    private val toolbarStore: BrowserToolbarStore,
    private val appStore: AppStore,
    private val browserStore: BrowserStore,
    private val browsingModeManager: BrowsingModeManager,
    private val settings: Settings,
    private val directToSearchConfig: DirectToSearchConfig,
    private val tabStripContent: @Composable () -> Unit,
    private val searchSuggestionsContent: @Composable (Modifier) -> Unit,
    private val navigationBarContent: (@Composable () -> Unit)?,
) : FenixHomeToolbar {
    private val addressBarVisibility = mutableStateOf(true)

    init {
        // Reset the toolbar visibility & position whenever coming back to the home screen
        // like after changing the toolbar position in settings.
        toolbarStore.dispatch(
            ToolbarGravityUpdated(
                buildToolbarGravityConfig(),
            ),
        )
    }

    override val layout = ComposeView(context).apply {
        id = R.id.composable_toolbar

        setContent {
            val isSearching = toolbarStore.observeAsComposableState { it.isEditMode() }.value
            val isSearchEmpty =
                toolbarStore.observeAsComposableState { it.editState.query.current.isEmpty() }.value
            val shouldShowTabStrip: Boolean = remember { settings.isTabStripEnabled }
            val isAddressBarVisible = remember { addressBarVisibility }

            val currentWallpaperName = appStore.observeAsComposableState { it.wallpaperState.currentWallpaper.name }
            val isEdgeToEdgeBackgroundEnabled = currentWallpaperName.value == Wallpaper.EDGE_TO_EDGE

            BackInvokedHandler(isSearching) {
                val sourceTabId = appStore.state.searchState.sourceTabId
                appStore.dispatch(SearchEnded)
                browserStore.dispatch(AwesomeBarAction.EngagementFinished(abandoned = true))
                if (sourceTabId != null) {
                    navController.navigate(R.id.browserFragment)
                }
            }

            FirefoxTheme {
                Column {
                    if (shouldShowTabStrip) {
                        tabStripContent()
                    }

                    if (settings.shouldUseBottomToolbar) {
                        searchSuggestionsContent(Modifier.weight(1f))
                    }
                    Box {
                        if (settings.enableHomepageSearchBar) {
                            BrowserSimpleToolbar(toolbarStore, appStore)
                        }
                        this@Column.AnimatedVisibility(
                            visible = isAddressBarVisible.value || appStore.state.searchState.isSearchActive,
                            enter = fadeIn(
                                animationSpec = tween(
                                    durationMillis = 250,
                                    easing = Easing { fraction -> fraction * fraction },
                                ),
                            ),
                            exit = fadeOut(
                                animationSpec = tween(
                                    durationMillis = 250,
                                    easing = Easing { fraction -> 1f - (1f - fraction) * (1f - fraction) },
                                ),
                            ),
                        ) {
                            val (backgroundColor, outlineColor) =
                                if (browsingModeManager.mode == BrowsingMode.Private) {
                                    MaterialTheme.colorScheme.surface to
                                            colorResource(R.color.homepage_tab_edge_to_edge_private_toolbar_outline)
                                } else if (isEdgeToEdgeBackgroundEnabled && isSearchEmpty) {
                                    colorResource(R.color.homepage_tab_edge_to_edge_toolbar_background) to
                                            colorResource(R.color.homepage_tab_edge_to_edge_toolbar_outline)
                                } else {
                                    MaterialTheme.colorScheme.surface to DividerDefaults.color
                                }

                            BrowserToolbar(
                                store = toolbarStore,
                                backgroundColor = backgroundColor,
                                outlineColor = outlineColor,
                            )
                        }
                    }
                    if (settings.toolbarPosition == BOTTOM) {
                        navigationBarContent?.invoke()
                    }
                    if (!settings.shouldUseBottomToolbar) {
                        searchSuggestionsContent(Modifier.weight(1f))
                    }
                }
            }
        }
        translationZ = context.resources.getDimension(R.dimen.browser_fragment_above_toolbar_panels_elevation)
        homeBinding.homeLayout.addView(this)
    }

    override fun build(browserState: BrowserState, middleSearchEnabled: Boolean) {
        layout.updateLayoutParams {
            (this as? CoordinatorLayout.LayoutParams)?.gravity = when (settings.toolbarPosition) {
                TOP -> Gravity.TOP
                BOTTOM -> Gravity.BOTTOM
            }
        }

        if (settings.shouldUseBottomToolbar) {
            ImeInsetsSynchronizer.setup(homeBinding.root)
        }

        configureStartingInSearchMode()
        updateAddressBarVisibility(!middleSearchEnabled)
    }

    override fun updateDividerVisibility(isVisible: Boolean) {
        // no-op
        // For the toolbar redesign we will always show the toolbar divider
    }

    override fun updateButtonVisibility(
        browserState: BrowserState,
    ) {
        // To be added later
    }

    override fun updateTabCounter(browserState: BrowserState) {
        // To be added later
    }

    override fun updateAddressBarVisibility(isVisible: Boolean) {
        addressBarVisibility.value = isVisible
    }

    private fun buildToolbarGravityConfig(): ToolbarGravity = when (settings.shouldUseBottomToolbar) {
        true -> Bottom
        false -> Top
    }

    private fun configureStartingInSearchMode() {
        if (!directToSearchConfig.startSearch) return
        appStore.dispatch(
            SearchStarted(
                tabId = directToSearchConfig.sessionId,
                source = directToSearchConfig.source,
            ),
        )

        if (directToSearchConfig.sessionId != null) {
            browserStore.state.findTab(directToSearchConfig.sessionId)?.let {
                toolbarStore.dispatch(
                    SearchQueryUpdated(
                        query = BrowserToolbarQuery(it.getUrl() ?: ""),
                        isQueryPrefilled = true,
                    ),
                )
            }
        }
    }

    /**
     * Static configuration and properties of [HomeToolbarComposable].
     */
    companion object {
        /**
         * Configuration for starting with the toolbar in search mode.
         *
         * @property startSearch Whether to start in search mode. Defaults to `false`.
         * @property sessionId The session ID of the current session with details of which to start search.
         * Defaults to `null`.
         * @property source The application feature from where a new search was started.
         */
        data class DirectToSearchConfig(
            val startSearch: Boolean = false,
            val sessionId: String? = null,
            val source: MetricsUtils.Source = MetricsUtils.Source.NONE,
        )
    }
}
