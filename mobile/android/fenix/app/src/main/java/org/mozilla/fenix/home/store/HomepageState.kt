/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.store

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import mozilla.components.feature.top.sites.TopSite
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.components
import org.mozilla.fenix.ext.shouldShowRecentSyncedTabs
import org.mozilla.fenix.ext.shouldShowRecentTabs
import org.mozilla.fenix.home.bookmarks.Bookmark
import org.mozilla.fenix.home.collections.CollectionsState
import org.mozilla.fenix.home.pocket.PocketState
import org.mozilla.fenix.home.recentsyncedtabs.RecentSyncedTab
import org.mozilla.fenix.home.recentsyncedtabs.RecentSyncedTabState
import org.mozilla.fenix.home.recenttabs.RecentTab
import org.mozilla.fenix.home.recentvisits.RecentlyVisitedItem
import org.mozilla.fenix.home.topsites.TopSiteColors
import org.mozilla.fenix.utils.Settings

/**
 * State object that describes the homepage.
 */
internal sealed class HomepageState {

    /**
     * State type corresponding with private browsing mode.
     *
     * @property feltPrivateBrowsingEnabled Whether felt private browsing is enabled.
     */
    internal data class Private(
        val feltPrivateBrowsingEnabled: Boolean,
    ) : HomepageState()

    /**
     * State corresponding with the homepage in normal browsing mode.
     *
     * @property topSites List of [TopSite] to display.
     * @property recentTabs List of [RecentTab] to display.
     * @property syncedTab The [RecentSyncedTab] to display.
     * @property bookmarks List of [Bookmark] to display.
     * @property recentlyVisited List of [RecentlyVisitedItem] to display.
     * @property collectionsState State of the collections section to display.
     * @property pocketState State of the pocket section to display.
     * @property showTopSites Whether to show top sites or not.
     * @property showRecentTabs Whether to show recent tabs or not.
     * @property showRecentSyncedTab Whether to show recent synced tab or not.
     * @property showBookmarks Whether to show bookmarks.
     * @property showRecentlyVisited Whether to show recent history section.
     * @property showPocketStories Whether to show the pocket stories section.
     * @property topSiteColors The color set defined by [TopSiteColors] used to style a top site.
     * @property cardBackgroundColor Background color for card items.
     * @property buttonBackgroundColor Background [Color] for buttons.
     * @property buttonTextColor Text [Color] for buttons.
     */
    internal data class Normal(
        val topSites: List<TopSite>,
        val recentTabs: List<RecentTab>,
        val syncedTab: RecentSyncedTab?,
        val bookmarks: List<Bookmark>,
        val recentlyVisited: List<RecentlyVisitedItem>,
        val collectionsState: CollectionsState,
        val pocketState: PocketState,
        val showTopSites: Boolean,
        val showRecentTabs: Boolean,
        val showRecentSyncedTab: Boolean,
        val showBookmarks: Boolean,
        val showRecentlyVisited: Boolean,
        val showPocketStories: Boolean,
        val topSiteColors: TopSiteColors,
        val cardBackgroundColor: Color,
        val buttonBackgroundColor: Color,
        val buttonTextColor: Color,
    ) : HomepageState()

    companion object {

        /**
         * Builds a new [HomepageState] from the current [AppState] and [Settings].
         *
         * @param appState State to build the [HomepageState] from.
         * @param settings [Settings] corresponding to how the homepage should be displayed.
         */
        @Composable
        internal fun build(
            appState: AppState,
            settings: Settings,
        ): HomepageState {
            return with(appState) {
                if (mode.isPrivate) {
                    Private(
                        feltPrivateBrowsingEnabled = settings.feltPrivateBrowsingEnabled,
                    )
                } else {
                    Normal(
                        topSites = topSites,
                        recentTabs = recentTabs,
                        syncedTab = when (recentSyncedTabState) {
                            RecentSyncedTabState.None,
                            RecentSyncedTabState.Loading,
                            -> null

                            is RecentSyncedTabState.Success -> recentSyncedTabState.tabs.firstOrNull()
                        },
                        bookmarks = bookmarks,
                        recentlyVisited = recentHistory,
                        collectionsState = CollectionsState.build(
                            appState = appState,
                            browserState = components.core.store.state,
                        ),
                        pocketState = PocketState.build(appState, settings),
                        showTopSites = settings.showTopSitesFeature && topSites.isNotEmpty(),
                        showRecentTabs = shouldShowRecentTabs(settings),
                        showBookmarks = settings.showBookmarksHomeFeature && bookmarks.isNotEmpty(),
                        showRecentSyncedTab = shouldShowRecentSyncedTabs(),
                        showRecentlyVisited = settings.historyMetadataUIFeature && recentHistory.isNotEmpty(),
                        showPocketStories = settings.showPocketRecommendationsFeature &&
                            recommendationState.pocketStories.isNotEmpty(),
                        topSiteColors = TopSiteColors.colors(wallpaperState = wallpaperState),
                        cardBackgroundColor = wallpaperState.cardBackgroundColor,
                        buttonBackgroundColor = wallpaperState.buttonBackgroundColor,
                        buttonTextColor = wallpaperState.buttonTextColor,
                    )
                }
            }
        }
    }
}
