/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.store

import android.content.res.Configuration
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.colorResource
import mozilla.components.feature.top.sites.TopSite
import mozilla.components.ui.icons.R
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.browser.browsingmode.BrowsingModeManager
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.setup.checklist.SetupChecklistState
import org.mozilla.fenix.components.components
import org.mozilla.fenix.components.toolbar.ToolbarPosition
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
import org.mozilla.fenix.home.ui.getAttr
import org.mozilla.fenix.search.SearchDialogFragment
import org.mozilla.fenix.termsofuse.store.PrivacyNoticeBannerState
import org.mozilla.fenix.utils.Settings

/**
 * State object that describes the homepage.
 */
internal sealed class HomepageState {

    /**
     * Data related to the header of the homepage.
     */
    abstract val headerState: HeaderState

    /**
     * Flag indicating whether the first frame of the homescreen has been drawn.
     */
    abstract val firstFrameDrawn: Boolean

    /**
     * Whether search is currently active on the homepage.
     */
    abstract val isSearchInProgress: Boolean

    /**
     * State type corresponding with private browsing mode.
     *
     * @property headerState State related to the header of the homepage.
     * @property firstFrameDrawn Flag indicating whether the first frame of the homescreen has been drawn.
     * @property isSearchInProgress Whether search is currently active on the homepage.
     */
    internal data class Private(
        override val headerState: HeaderState,
        override val firstFrameDrawn: Boolean = false,
        override val isSearchInProgress: Boolean,
    ) : HomepageState()

    /**
     * State corresponding with the homepage in normal browsing mode.
     *
     * @property shouldShowPrivacyNoticeBanner If the privacy notice banner should show.
     * @property nimbusMessage Optional message to display.
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
     * @property showCollections Whether to show the collections section.
     * @property headerState State related to the header of the homepage.
     * @property searchBarVisible Whether the middle search bar should be visible or not.
     * @property searchBarEnabled Whether the middle search bar is enabled or not.
     * @property firstFrameDrawn Flag indicating whether the first frame of the homescreen has been drawn.
     * @property setupChecklistState Optional state of the setup checklist feature.
     * @property topSiteColors The color set defined by [TopSiteColors] used to style a top site.
     * @property cardBackgroundColor Background color for card items.
     * @property buttonBackgroundColor Background [Color] for buttons.
     * @property buttonTextColor Text [Color] for buttons.
     * @property isSearchInProgress Whether search is currently active on the homepage.
     * @property bottomPadding Amount of padding to display at the bottom of the homepage.
     */
    internal data class Normal(
        val shouldShowPrivacyNoticeBanner: Boolean,
        val nimbusMessage: NimbusMessageState?,
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
        val showCollections: Boolean,
        override val headerState: HeaderState,
        val searchBarVisible: Boolean,
        val searchBarEnabled: Boolean,
        override val firstFrameDrawn: Boolean = false,
        val setupChecklistState: SetupChecklistState?,
        val topSiteColors: TopSiteColors,
        val cardBackgroundColor: Color,
        val buttonBackgroundColor: Color,
        val buttonTextColor: Color,
        override val isSearchInProgress: Boolean,
        val bottomPadding: Int,
    ) : HomepageState()

    val browsingMode: BrowsingMode
        get() = when (this) {
            is Normal -> BrowsingMode.Normal
            is Private -> BrowsingMode.Private
        }

    /**
     * Returns whether the homepage is in the "Minimal Layout" state, where only the shortcuts and
     * stories are visible (but both or either can be hidden). This is for the purpose of adding a
     * weighted spacer in between so the stories are anchored to the bottom.
     */
    internal fun isMinimalLayout(): Boolean {
        return (this as? Normal)?.run {
            !showRecentTabs && !showRecentSyncedTab && !showBookmarks && !showRecentlyVisited
        } ?: false
    }

    companion object {
        private const val BOTTOM_PADDING_TOP_TOOLBAR = 68
        private const val BOTTOM_PADDING_BOTTOM_TOOLBAR = 32

        /**
         * Builds a new [HomepageState] from the current [AppState] and [Settings].
         *
         * @param appState State to build the [HomepageState] from.
         * @param privacyNoticeBannerState State of the privacy notice banner.
         * @param browsingModeManager Manager holding current state of whether the browser is in private mode or not.
         * @param settings [Settings] corresponding to how the homepage should be displayed.
         */
        @Composable
        internal fun build(
            appState: AppState,
            privacyNoticeBannerState: PrivacyNoticeBannerState,
            browsingModeManager: BrowsingModeManager,
            settings: Settings,
        ): HomepageState {
            return if (browsingModeManager.mode.isPrivate) {
                buildPrivateState(
                    appState = appState,
                    settings = settings,
                )
            } else {
                buildNormalState(
                    appState = appState,
                    privacyNoticeBannerState = privacyNoticeBannerState,
                    browsingModeManager = browsingModeManager,
                    settings = settings,
                )
            }
        }

        /**
         * Builds a new [HomepageState.Private] from the current [AppState] and [Settings].
         *
         * @param appState State to build the [HomepageState.Private] from.
         * @param settings [Settings] corresponding to how the homepage should be displayed.
         */
        @Composable
        private fun buildPrivateState(
            appState: AppState,
            settings: Settings,
        ) = with(appState) {
            Private(
                headerState = HeaderState(
                    showHeader = settings.showHomepageHeader,
                    wordmarkTextColor = null,
                    privateBrowsingButtonColor = colorResource(
                        getAttr(
                            R.attr.mozac_ic_private_mode_circle_fill_icon_color,
                        ),
                    ),
                ),
                firstFrameDrawn = firstFrameDrawn,
                isSearchInProgress = searchState.isSearchActive,
            )
        }

        /**
         * Builds a new [HomepageState.Normal] from the current [AppState] and [Settings].
         *
         * @param appState State to build the [HomepageState.Normal] from.
         * @param privacyNoticeBannerState State of the privacy notice banner.
         * @param browsingModeManager Manager holding current state of whether the browser is in private mode or not.
         * @param settings [Settings] corresponding to how the homepage should be displayed.
         */
        @Composable
        private fun buildNormalState(
            appState: AppState,
            privacyNoticeBannerState: PrivacyNoticeBannerState,
            browsingModeManager: BrowsingModeManager,
            settings: Settings,
        ) = with(appState) {
            Normal(
                shouldShowPrivacyNoticeBanner = privacyNoticeBannerState.visible,
                nimbusMessage = NimbusMessageState.build(appState, privacyNoticeBannerState),
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
                    browsingModeManager = browsingModeManager,
                ),
                pocketState = PocketState.build(appState = appState, settings = settings),
                showTopSites = settings.showTopSitesFeature && topSites.isNotEmpty(),
                showRecentTabs = shouldShowRecentTabs(settings),
                showBookmarks = settings.showBookmarksHomeFeature && bookmarks.isNotEmpty(),
                showRecentSyncedTab = shouldShowRecentSyncedTabs() && settings.showSyncedTabs,
                showRecentlyVisited = settings.historyMetadataUIFeature && recentHistory.isNotEmpty(),
                showPocketStories = settings.showPocketRecommendationsFeature &&
                    recommendationState.pocketStories.isNotEmpty(),
                showCollections = settings.collections,
                headerState = HeaderState(
                    showHeader = settings.showHomepageHeader,
                    wordmarkTextColor = wallpaperState.textColor,
                    privateBrowsingButtonColor = wallpaperState.iconColor,
                ),
                searchBarVisible = shouldShowSearchBar(appState = appState),
                searchBarEnabled = settings.enableHomepageSearchBar &&
                    settings.toolbarPosition == ToolbarPosition.TOP &&
                    LocalConfiguration.current.orientation == Configuration.ORIENTATION_PORTRAIT,
                firstFrameDrawn = firstFrameDrawn,
                setupChecklistState = setupChecklistState,
                topSiteColors = TopSiteColors.colors(wallpaperState = wallpaperState),
                cardBackgroundColor = wallpaperState.cardBackgroundColor,
                buttonBackgroundColor = wallpaperState.buttonBackgroundColor,
                buttonTextColor = wallpaperState.buttonTextColor,
                isSearchInProgress = searchState.isSearchActive,
                bottomPadding = if (settings.toolbarPosition == ToolbarPosition.TOP) {
                    BOTTOM_PADDING_TOP_TOOLBAR
                } else {
                    BOTTOM_PADDING_BOTTOM_TOOLBAR
                },
            )
        }
    }
}

/**
 * A simple wrapper around state required for the homepage header.
 *
 * @property showHeader whether the header should be shown
 * @property wordmarkTextColor an optional color for the wordmark text
 * @property privateBrowsingButtonColor the color to use for the private browsing button
 */
internal data class HeaderState(
    val showHeader: Boolean,
    val wordmarkTextColor: Color?,
    val privateBrowsingButtonColor: Color,
)

/**
 * Returns whether the search bar should be shown. Only show if the search dialog
 * [SearchDialogFragment] is not visible, and the user does not have their toolbar set to be on the
 * bottom, and the screen is not in landscape mode. This is in addition to logic in the view layer
 * which hides the middle search bar when the users scrolls down. This is separate from the middle
 * search bar being enabled in settings since the toolbar address bar needs to react to the middle
 * search bar's visibility.
 */
private fun shouldShowSearchBar(appState: AppState) =
    !appState.searchState.isSearchActive
