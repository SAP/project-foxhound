/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray

import mozilla.components.browser.state.state.ContentState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.lib.state.Action
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import org.mozilla.fenix.tabstray.navigation.TabManagerNavDestination
import org.mozilla.fenix.tabstray.redux.reducer.TabSearchActionReducer
import org.mozilla.fenix.tabstray.redux.state.TabSearchState
import org.mozilla.fenix.tabstray.syncedtabs.SyncedTabsListItem

/**
 * The default state of the synced tabs expanded state, which is true.
 */
internal const val DEFAULT_SYNCED_TABS_EXPANDED_STATE = true

/**
 * Value type that represents the state of the tabs tray.
 *
 * @property selectedPage The current page in the tray can be on.
 * @property mode Whether the browser tab list is in multi-select mode or not with the set of
 * currently selected tabs.
 * @property inactiveTabs The list of tabs are considered inactive.
 * @property inactiveTabsExpanded A flag to know if the Inactive Tabs section of the Tabs Tray
 * should be expanded when the tray is opened.
 * @property normalTabs The list of normal tabs that do not fall under [inactiveTabs].
 * @property privateTabs The list of tabs that are [ContentState.private].
 * @property syncedTabs The list of synced tabs.
 * @property syncing Whether the Synced Tabs feature should fetch the latest tabs from paired devices.
 * @property selectedTabId The ID of the currently selected (active) tab.
 * @property tabSearchState The state of the tab search feature.
 * @property tabSearchEnabled  Whether the tab search feature is enabled.
 * @property backStack The navigation history of the Tab Manager feature.
 * @property expandedSyncedTabs The list of expansion states for the syncedTabs.
 */
data class TabsTrayState(
    val selectedPage: Page = Page.NormalTabs,
    val mode: Mode = Mode.Normal,
    val inactiveTabs: List<TabSessionState> = emptyList(),
    val inactiveTabsExpanded: Boolean = false,
    val normalTabs: List<TabSessionState> = emptyList(),
    val privateTabs: List<TabSessionState> = emptyList(),
    val syncedTabs: List<SyncedTabsListItem> = emptyList(),
    val syncing: Boolean = false,
    val selectedTabId: String? = null,
    val tabSearchState: TabSearchState = TabSearchState(),
    val tabSearchEnabled: Boolean = false,
    val backStack: List<TabManagerNavDestination> = listOf(TabManagerNavDestination.Root),
    val expandedSyncedTabs: List<Boolean> = emptyList(),
) : State {

    /**
     * The current mode that the tabs list is in.
     */
    sealed class Mode {

        /**
         * A set of selected tabs which we would want to perform an action on.
         */
        open val selectedTabs = emptySet<TabSessionState>()

        /**
         * The default mode the tabs list is in.
         */
        object Normal : Mode()

        /**
         * The multi-select mode that the tabs list is in containing the set of currently
         * selected tabs.
         */
        data class Select(override val selectedTabs: Set<TabSessionState>) : Mode()
    }

    /**
     * Whether the Tab Search button is visible.
     */
    val searchIconVisible: Boolean
        get() = tabSearchEnabled && selectedPage != Page.SyncedTabs

    /**
     * Whether the Tab Search button is enabled.
     */
    val searchIconEnabled: Boolean
        get() = when {
            selectedPage == Page.NormalTabs && normalTabs.isNotEmpty() -> true
            selectedPage == Page.PrivateTabs && privateTabs.isNotEmpty() -> true
            else -> false
        }
}

/**
 * The different pagers in the tray that we can switch between in the [TrayPagerAdapter].
 */
enum class Page {

    /**
     * The pager position that displays normal tabs.
     */
    NormalTabs,

    /**
     * The pager position that displays private tabs.
     */
    PrivateTabs,

    /**
     * The pager position that displays Synced Tabs.
     */
    SyncedTabs,

    ;

    companion object {
        /**
         * Returns the [Page] that corresponds to the [position].
         *
         * @param position The index of the page.
         */
        fun positionToPage(
            position: Int,
        ): Page {
            return when (position) {
                0 -> PrivateTabs
                1 -> NormalTabs
                else -> SyncedTabs
            }
        }

        /**
         * Returns the visual index that corresponds to the [page].
         *
         * @param page The [Page] whose visual index is being looked-up.
         */
        fun pageToPosition(
            page: Page,
        ): Int {
            return when (page) {
                PrivateTabs -> 0
                NormalTabs -> 1
                SyncedTabs -> 2
            }
        }
    }
}

/**
 * [Action] implementation related to [TabsTrayStore].
 */
sealed interface TabsTrayAction : Action {

    /**
     * Entered multi-select mode.
     */
    object EnterSelectMode : TabsTrayAction

    /**
     * Exited multi-select mode.
     */
    object ExitSelectMode : TabsTrayAction

    /**
     * Added a new [TabSessionState] to the selection set.
     */
    data class AddSelectTab(val tab: TabSessionState) : TabsTrayAction

    /**
     * Removed a [TabSessionState] from the selection set.
     */
    data class RemoveSelectTab(val tab: TabSessionState) : TabsTrayAction

    /**
     * The active page in the tray that is now in focus.
     */
    data class PageSelected(val page: Page) : TabsTrayAction

    /**
     * A request to perform a "sync" action.
     */
    object SyncNow : TabsTrayAction

    /**
     * When a "sync" action has completed; this can be triggered immediately after [SyncNow] if
     * no sync action was able to be performed.
     */
    object SyncCompleted : TabsTrayAction

    /**
     * Updates the [TabsTrayState.inactiveTabsExpanded] boolean
     *
     * @property expanded The updated boolean to [TabsTrayState.inactiveTabsExpanded]
     */
    data class UpdateInactiveExpanded(val expanded: Boolean) : TabsTrayAction

    /**
     * Updates the list of tabs in [TabsTrayState.inactiveTabs].
     */
    data class UpdateInactiveTabs(val tabs: List<TabSessionState>) : TabsTrayAction

    /**
     * Updates the list of tabs in [TabsTrayState.normalTabs].
     */
    data class UpdateNormalTabs(val tabs: List<TabSessionState>) : TabsTrayAction

    /**
     * Updates the list of tabs in [TabsTrayState.privateTabs].
     */
    data class UpdatePrivateTabs(val tabs: List<TabSessionState>) : TabsTrayAction

    /**
     * Updates the list of synced tabs in [TabsTrayState.syncedTabs].
     */
    data class UpdateSyncedTabs(val tabs: List<SyncedTabsListItem>) : TabsTrayAction

    /**
     * Updates the selected tab id.
     *
     * @property tabId The ID of the tab that is currently selected.
     */
    data class UpdateSelectedTabId(val tabId: String?) : TabsTrayAction

    /**
     * Expands or collapses the header on the synced tabs page.
     *
     * @property index The index of the header.
     */
    data class SyncedTabsHeaderToggled(val index: Int) : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the tab auto close dialog is shown.
     */
    object TabAutoCloseDialogShown : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to share all of their normal tabs.
     */
    object ShareAllNormalTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to share all of their private tabs.
     */
    object ShareAllPrivateTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to close all normal tabs.
     */
    object CloseAllNormalTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to close all private tabs.
     */
    object CloseAllPrivateTabs : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the three-dot menu is displayed to the user.
     */
    object ThreeDotMenuShown : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user requests to bookmark selected tabs.
     */
    data class BookmarkSelectedTabs(val tabCount: Int) : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user clicks on the Tab Search icon.
     */
    object TabSearchClicked : TabsTrayAction

    /**
     * [TabsTrayAction] fired when the user clicks on the back button or swipes to navigate back.
     */
    object NavigateBackInvoked : TabsTrayAction
}

/**
 *[TabsTrayAction]'s that represent user interactions and [TabSearchState] updates for the
 * Tab Search feature.
 */
sealed interface TabSearchAction : TabsTrayAction {

    /**
     * Updates the search query.
     *
     * @property query The query of tab search the user has typed in.
     */
    data class SearchQueryChanged(val query: String) : TabSearchAction

    /**
     * When the list of matching open tabs has been computed for the current [SearchQueryChanged] action.
     *
     * @property results The complete list of open tabs that match the current query.
     */
    data class SearchResultsUpdated(
        val results: List<TabSessionState>,
    ) : TabSearchAction

    /**
     * Fired when the user taps on a search result for an open tab.
     *
     * @property tab The tab selected by the user.
     */
    data class SearchResultClicked(val tab: TabSessionState) : TabSearchAction
}

/**
 *[TabsTrayAction]'s that represent user interactions for the Tab Group feature.
 */
sealed interface TabGroupAction : TabsTrayAction {

    /**
     * Confirms the save of a tab group.
     */
    data object SaveClicked : TabGroupAction

    /**
     * Dismisses editing a tab group.
     */
    data object Dismiss : TabGroupAction
}

/**
 * Reducer for [TabsTrayStore].
 */
internal object TabsTrayReducer {
    fun reduce(state: TabsTrayState, action: TabsTrayAction): TabsTrayState {
        return when (action) {
            is TabsTrayAction.EnterSelectMode ->
                state.copy(mode = TabsTrayState.Mode.Select(emptySet()))
            is TabsTrayAction.ExitSelectMode ->
                state.copy(mode = TabsTrayState.Mode.Normal)
            is TabsTrayAction.AddSelectTab ->
                state.copy(mode = TabsTrayState.Mode.Select(state.mode.selectedTabs + action.tab))
            is TabsTrayAction.RemoveSelectTab -> {
                val selected = state.mode.selectedTabs.filter { it.id != action.tab.id }.toSet()
                state.copy(
                    mode = if (selected.isEmpty()) {
                        TabsTrayState.Mode.Normal
                    } else {
                        TabsTrayState.Mode.Select(selected)
                    },
                )
            }
            is TabsTrayAction.PageSelected ->
                state.copy(selectedPage = action.page)
            is TabsTrayAction.SyncNow ->
                state.copy(syncing = true)
            is TabsTrayAction.SyncCompleted ->
                state.copy(syncing = false)
            is TabsTrayAction.UpdateInactiveExpanded ->
                state.copy(inactiveTabsExpanded = action.expanded)
            is TabsTrayAction.UpdateInactiveTabs ->
                state.copy(inactiveTabs = action.tabs)
            is TabsTrayAction.UpdateNormalTabs ->
                state.copy(normalTabs = action.tabs)
            is TabsTrayAction.UpdatePrivateTabs ->
                state.copy(privateTabs = action.tabs)
            is TabsTrayAction.UpdateSyncedTabs -> handleSyncedTabUpdate(state, action)
            is TabsTrayAction.UpdateSelectedTabId ->
                state.copy(selectedTabId = action.tabId)
            is TabsTrayAction.TabAutoCloseDialogShown -> state
            is TabsTrayAction.ShareAllNormalTabs -> state
            is TabsTrayAction.ShareAllPrivateTabs -> state
            is TabsTrayAction.CloseAllNormalTabs -> state
            is TabsTrayAction.CloseAllPrivateTabs -> state
            is TabsTrayAction.BookmarkSelectedTabs -> state
            is TabsTrayAction.ThreeDotMenuShown -> state

            is TabSearchAction -> TabSearchActionReducer.reduce(
                state = state,
                action = action,
            )
            is TabsTrayAction.TabSearchClicked -> {
                state.copy(backStack = state.backStack + TabManagerNavDestination.TabSearch)
            }

            is TabsTrayAction.NavigateBackInvoked -> {
                when {
                    state.mode is TabsTrayState.Mode.Select -> state.copy(mode = TabsTrayState.Mode.Normal)

                    state.backStack.lastOrNull() == TabManagerNavDestination.TabSearch -> state.copy(
                        tabSearchState = TabSearchState(
                            query = "",
                            searchResults = emptyList(),
                        ),
                        backStack = state.popBackStack(),
                    )

                    else -> state.copy(backStack = state.popBackStack())
                }
            }
            is TabsTrayAction.SyncedTabsHeaderToggled -> handleSyncedTabHeaderToggle(state, action)
            is TabGroupAction -> state
        }
    }
}

/**
 * Updates the synced tabs list.  Also updates the expansion state of the tabs.
 * If items are identical in an existing list, their selection state will be preserved
 * (pressing sync tab on an already synced tab will not reset your expansion selections).
 * If the tab list is updated or no tabs existed previously, selections will be the default value.
 *
 * @param state the existing state object
 * @param action the action containing updated tabs.
 */
private fun handleSyncedTabUpdate(state: TabsTrayState, action: TabsTrayAction.UpdateSyncedTabs): TabsTrayState {
    return if (syncStateExists(state, action) && syncedDevicesUnchanged(state, action)) {
        state.copy(
            syncedTabs = action.tabs,
            expandedSyncedTabs = action.tabs.mapIndexed { index, item ->
                if (state.syncedTabs[index] == item && index < state.expandedSyncedTabs.size) {
                    state.expandedSyncedTabs[index]
                } else {
                    DEFAULT_SYNCED_TABS_EXPANDED_STATE
                }
            },
        )
    } else if (action.tabs.isNotEmpty()) {
        state.copy(
            syncedTabs = action.tabs,
            expandedSyncedTabs =
            action.tabs.map { DEFAULT_SYNCED_TABS_EXPANDED_STATE },
        )
    } else {
        state.copy(syncedTabs = action.tabs, expandedSyncedTabs = emptyList())
    }
}

// Does previous state exist for the SyncedTabs we might want to preserve?
private fun syncStateExists(state: TabsTrayState, action: TabsTrayAction.UpdateSyncedTabs): Boolean {
    return state.syncedTabs.isNotEmpty() && action.tabs.isNotEmpty()
}

// Has the list of devices synced in SyncedTabs list changed?
private fun syncedDevicesUnchanged(state: TabsTrayState, action: TabsTrayAction.UpdateSyncedTabs): Boolean {
    return state.syncedTabs.size == action.tabs.size
}

/**
 * When a synced tab header's expansion is toggled, that item should be expanded or collapsed.
 * The rest of the list should be unchanged.
 *
 * @param state the existing state object
 * @param action the action containing the index of the toggled header.
 */
private fun handleSyncedTabHeaderToggle(
    state: TabsTrayState,
    action: TabsTrayAction.SyncedTabsHeaderToggled,
): TabsTrayState {
    return state.copy(
        expandedSyncedTabs = state.expandedSyncedTabs.mapIndexed { index, isExpanded ->
            if (index == action.index) {
                !isExpanded
            } else {
                isExpanded
            }
        },
    )
}

/**
 *  Drops the last entry of the [TabsTray] backstack.
 */
private fun TabsTrayState.popBackStack() =
    backStack.dropLast(1)

/**
 * A [Store] that holds the [TabsTrayState] for the tabs tray and reduces [TabsTrayAction]s
 * dispatched to the store.
 */
class TabsTrayStore(
    initialState: TabsTrayState = TabsTrayState(),
    middlewares: List<Middleware<TabsTrayState, TabsTrayAction>> = emptyList(),
) : Store<TabsTrayState, TabsTrayAction>(
    initialState,
    TabsTrayReducer::reduce,
    middlewares,
)
