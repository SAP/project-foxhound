/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.browser.integration

import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import mozilla.components.browser.state.selector.findTabOrCustomTabOrSelectedTab
import mozilla.components.browser.state.state.SessionState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.session.SessionUseCases
import mozilla.components.feature.top.sites.TopSitesUseCases
import org.mozilla.focus.GleanMetrics.BrowserMenu
import org.mozilla.focus.GleanMetrics.CustomTabsToolbar
import org.mozilla.focus.GleanMetrics.Shortcuts
import org.mozilla.focus.ext.titleOrDomain
import org.mozilla.focus.menu.ToolbarMenu // Assuming ToolbarMenu.FocusMenuItem is defined here
import org.mozilla.focus.state.AppAction
import org.mozilla.focus.state.AppStore
import org.mozilla.focus.state.Screen

/**
 * Manages the interactions and logic for the browser menu.
 *
 * This controller handles actions such as navigation (back, forward, reload, stop),
 * sharing, finding text on the page, managing desktop view, adding to home screen,
 * opening content in other apps, and managing shortcuts (top sites).
 * It also records telemetry for these actions.
 *
 * @param sessionUseCases Use cases for managing browser sessions.
 * @param appStore The main application store for dispatching actions.
 * @param store The browser store for accessing session state.
 * @param topSitesUseCases Use cases for managing top sites (shortcuts).
 * @param currentTabId The ID of the currently active tab.
 * @param shareCallback Callback function to invoke when the share action is triggered.
 * @param requestDesktopCallback Callback function to invoke when the request desktop site action is triggered.
 * @param addToHomeScreenCallback Callback function to invoke when the add to home screen action is triggered.
 * @param showFindInPageCallback Callback function to invoke when the find in page action is triggered.
 * @param openInCallback Callback function to invoke when the open in app action is triggered.
 * @param openInBrowser Callback function to invoke when the open in browser action is triggered (for custom tabs).
 * @param showShortcutAddedSnackBar Callback function to display a snackbar when a shortcut is added.
 * @param coroutineScope The coroutine scope for launching asynchronous operations.
 */
@Suppress("LongParameterList")
class BrowserMenuController(
    private val sessionUseCases: SessionUseCases,
    private val appStore: AppStore,
    private val store: BrowserStore,
    private val topSitesUseCases: TopSitesUseCases,
    private val currentTabId: String,
    private val shareCallback: () -> Unit,
    private val requestDesktopCallback: (isChecked: Boolean) -> Unit,
    private val addToHomeScreenCallback: () -> Unit,
    private val showFindInPageCallback: () -> Unit,
    private val openInCallback: () -> Unit,
    private val openInBrowser: () -> Unit,
    private val showShortcutAddedSnackBar: () -> Unit,
    private val coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.IO),
) {
    @VisibleForTesting
    private val currentTab: SessionState?
        get() = store.state.findTabOrCustomTabOrSelectedTab(currentTabId)

    /**
     * Defines constant string values used for telemetry reporting related to browser menu actions.
     */
    private object TelemetryActions {
        const val BACK = "back"
        const val FORWARD = "forward"
        const val RELOAD = "reload"
        const val STOP = "stop"
        const val SHARE = "share"
        const val FIND_IN_PAGE = "find_in_page"
        const val DESKTOP_VIEW_ON = "desktop_view_on"
        const val DESKTOP_VIEW_OFF = "desktop_view_off"
        const val ADD_TO_HOME_SCREEN = "add_to_home_screen"
        const val OPEN_IN_APP = "open_in_app"
        const val SETTINGS = "settings"
        const val OPEN_IN_BROWSER = "open_in_browser"
        const val REMOVED_FROM_BROWSER_MENU = "removed_from_browser_menu"
    }

    /**
     * Handles the interaction with a menu item from the toolbar.
     *
     * This function triggers telemetry recording for the interaction and then performs the
     * corresponding action based on the type of menu item selected.
     *
     * @param item The [ToolbarMenu.FocusMenuItem] that was interacted with.
     */
    fun handleMenuInteraction(item: ToolbarMenu.FocusMenuItem) {
        recordBrowserMenuTelemetry(item)

        when (item) {
            is ToolbarMenu.Item.Back, ToolbarMenu.CustomTabItem.Back -> sessionUseCases.goBack(
                currentTabId,
            )
            is ToolbarMenu.Item.Forward, ToolbarMenu.CustomTabItem.Forward -> sessionUseCases.goForward(
                currentTabId,
            )
            is ToolbarMenu.Item.Reload, ToolbarMenu.CustomTabItem.Reload -> {
                sessionUseCases.reload(currentTabId)
            }
            is ToolbarMenu.Item.Stop, ToolbarMenu.CustomTabItem.Stop -> sessionUseCases.stopLoading(
                currentTabId,
            )
            is ToolbarMenu.Item.Share -> shareCallback()
            is ToolbarMenu.Item.FindInPage, ToolbarMenu.CustomTabItem.FindInPage -> showFindInPageCallback()
            is ToolbarMenu.Item.AddToShortcuts -> {
                addToShortcuts()
                showShortcutAddedSnackBar()
            }
            is ToolbarMenu.Item.RemoveFromShortcuts -> removeFromShortcuts()
            is ToolbarMenu.Item.RequestDesktop -> requestDesktopCallback(item.isChecked)
            is ToolbarMenu.CustomTabItem.RequestDesktop -> requestDesktopCallback(item.isChecked)
            is ToolbarMenu.Item.AddToHomeScreen, ToolbarMenu.CustomTabItem.AddToHomeScreen -> addToHomeScreenCallback()
            is ToolbarMenu.CustomTabItem.OpenInBrowser -> openInBrowser()
            is ToolbarMenu.Item.OpenInApp, ToolbarMenu.CustomTabItem.OpenInApp -> openInCallback()
            is ToolbarMenu.Item.Settings -> appStore.dispatch(AppAction.OpenSettings(page = Screen.Settings.Page.Start))
        }
    }

    /**
     * Removes the current tab from the list of top sites (shortcuts).
     * This function is launched in a coroutine to perform the operation asynchronously.
     * It retrieves the current tab's URL and attempts to find a matching top site.
     * If a match is found, the top site is removed using [TopSitesUseCases.removeTopSites].
     */
    private fun removeFromShortcuts() {
        coroutineScope.launch {
            currentTab?.let { state ->
                appStore.state.topSites.find { it.url == state.content.url }
                    ?.let { topSite ->
                        topSitesUseCases.removeTopSites(topSite)
                    }
            }
        }
    }

    /**
     * Adds the current tab to the list of top sites (shortcuts).
     *
     * This function retrieves the current tab's state and uses its title (or domain if title is unavailable)
     * and URL to add it as a pinned site using the `topSitesUseCases`.
     * This operation is performed asynchronously within a coroutine.
     */
    @VisibleForTesting
    internal fun addToShortcuts() {
        coroutineScope.launch {
            currentTab?.let { state ->
                topSitesUseCases.addPinnedSites(
                    title = state.content.titleOrDomain,
                    url = state.content.url,
                )
            }
        }
    }

    /**
     * Records telemetry data for a browser menu interaction.
     *
     * This function determines whether the interaction occurred in a regular tab or a custom tab
     * and calls the appropriate telemetry recording function.
     *
     * @param item The [ToolbarMenu.FocusMenuItem] that was interacted with.
     */
    @VisibleForTesting
    internal fun recordBrowserMenuTelemetry(item: ToolbarMenu.FocusMenuItem) {
        when (item) {
            is ToolbarMenu.Item -> recordTabBrowserMenuTelemetry(item)
            is ToolbarMenu.CustomTabItem -> recordCustomTabBrowserMenuTelemetry(item)
        }
    }

    /**
     * Records telemetry for actions performed within the tab browser menu.
     *
     * This function maps each [ToolbarMenu.Item] to its corresponding telemetry event and records it.
     * The telemetry data helps in understanding user interaction with the browser menu features.
     *
     * @param item The specific [ToolbarMenu.Item] that was interacted with.
     */
    private fun recordTabBrowserMenuTelemetry(item: ToolbarMenu.Item) {
        when (item) {
            ToolbarMenu.Item.Back -> BrowserMenu.navigationToolbarAction.record(
                BrowserMenu.NavigationToolbarActionExtra(TelemetryActions.BACK),
            )

            ToolbarMenu.Item.Forward -> BrowserMenu.navigationToolbarAction.record(
                BrowserMenu.NavigationToolbarActionExtra(TelemetryActions.FORWARD),
            )

            ToolbarMenu.Item.Reload -> {
                BrowserMenu.navigationToolbarAction.record(
                    BrowserMenu.NavigationToolbarActionExtra(TelemetryActions.RELOAD),
                )
            }

            ToolbarMenu.Item.Stop -> BrowserMenu.navigationToolbarAction.record(
                BrowserMenu.NavigationToolbarActionExtra(TelemetryActions.STOP),
            )

            ToolbarMenu.Item.Share -> BrowserMenu.navigationToolbarAction.record(
                BrowserMenu.NavigationToolbarActionExtra(TelemetryActions.SHARE),
            )

            ToolbarMenu.Item.FindInPage -> BrowserMenu.browserMenuAction.record(
                BrowserMenu.BrowserMenuActionExtra(TelemetryActions.FIND_IN_PAGE),
            )

            ToolbarMenu.Item.AddToShortcuts ->
                Shortcuts.shortcutAddedCounter.add()

            ToolbarMenu.Item.RemoveFromShortcuts ->
                Shortcuts.shortcutRemovedCounter[TelemetryActions.REMOVED_FROM_BROWSER_MENU].add()

            ToolbarMenu.Item.AddToHomeScreen -> BrowserMenu.browserMenuAction.record(
                BrowserMenu.BrowserMenuActionExtra(TelemetryActions.ADD_TO_HOME_SCREEN),
            )

            ToolbarMenu.Item.OpenInApp -> BrowserMenu.browserMenuAction.record(
                BrowserMenu.BrowserMenuActionExtra(TelemetryActions.OPEN_IN_APP),
            )

            ToolbarMenu.Item.Settings -> BrowserMenu.browserMenuAction.record(
                BrowserMenu.BrowserMenuActionExtra(TelemetryActions.SETTINGS),
            )

            is ToolbarMenu.Item.RequestDesktop -> {
                val action =
                    if (item.isChecked) TelemetryActions.DESKTOP_VIEW_ON else TelemetryActions.DESKTOP_VIEW_OFF
                BrowserMenu.browserMenuAction.record(
                    BrowserMenu.BrowserMenuActionExtra(action),
                )
            }
        }
    }

    /**
     * Records telemetry data for actions performed within a custom tab's browser menu.
     *
     * This function maps each `CustomTabItem` to its corresponding telemetry action and records it
     * using the `CustomTabsToolbar` telemetry service. This helps in tracking user engagement
     * with different features available in the custom tab menu.
     *
     * @param item The [ToolbarMenu.CustomTabItem] representing the action taken by the user.
     */
    private fun recordCustomTabBrowserMenuTelemetry(item: ToolbarMenu.CustomTabItem) {
        when (item) {
            ToolbarMenu.CustomTabItem.Back -> CustomTabsToolbar.navigationToolbarAction.record(
                CustomTabsToolbar.NavigationToolbarActionExtra(TelemetryActions.BACK),
            )

            ToolbarMenu.CustomTabItem.Forward -> CustomTabsToolbar.navigationToolbarAction.record(
                CustomTabsToolbar.NavigationToolbarActionExtra(TelemetryActions.FORWARD),
            )

            ToolbarMenu.CustomTabItem.Stop -> CustomTabsToolbar.navigationToolbarAction.record(
                CustomTabsToolbar.NavigationToolbarActionExtra(TelemetryActions.STOP),
            )

            ToolbarMenu.CustomTabItem.Reload -> {
                CustomTabsToolbar.navigationToolbarAction.record(
                    CustomTabsToolbar.NavigationToolbarActionExtra(TelemetryActions.RELOAD),
                )
            }

            ToolbarMenu.CustomTabItem.AddToHomeScreen -> CustomTabsToolbar.browserMenuAction.record(
                CustomTabsToolbar.BrowserMenuActionExtra(TelemetryActions.ADD_TO_HOME_SCREEN),
            )

            ToolbarMenu.CustomTabItem.OpenInApp -> CustomTabsToolbar.browserMenuAction.record(
                CustomTabsToolbar.BrowserMenuActionExtra(TelemetryActions.OPEN_IN_APP),
            )

            ToolbarMenu.CustomTabItem.OpenInBrowser -> CustomTabsToolbar.browserMenuAction.record(
                CustomTabsToolbar.BrowserMenuActionExtra(TelemetryActions.OPEN_IN_BROWSER),
            )

            ToolbarMenu.CustomTabItem.FindInPage -> CustomTabsToolbar.browserMenuAction.record(
                CustomTabsToolbar.BrowserMenuActionExtra(TelemetryActions.FIND_IN_PAGE),
            )

            is ToolbarMenu.CustomTabItem.RequestDesktop -> {
                val action =
                    if (item.isChecked) TelemetryActions.DESKTOP_VIEW_ON else TelemetryActions.DESKTOP_VIEW_OFF
                CustomTabsToolbar.browserMenuAction.record(
                    CustomTabsToolbar.BrowserMenuActionExtra(action),
                )
            }
        }
    }
}
