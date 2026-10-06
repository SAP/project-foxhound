/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ext

import androidx.annotation.VisibleForTesting
import mozilla.components.service.pocket.PocketStory
import mozilla.components.service.pocket.PocketStory.PocketRecommendedStory
import mozilla.components.service.pocket.PocketStory.SponsoredContent
import mozilla.components.service.pocket.ext.hasFlightImpressionsLimitReached
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.home.blocklist.BlocklistHandler
import org.mozilla.fenix.home.pocket.POCKET_STORIES_DEFAULT_CATEGORY_NAME
import org.mozilla.fenix.home.pocket.PocketRecommendedStoriesCategory
import org.mozilla.fenix.home.recentsyncedtabs.RecentSyncedTabState
import org.mozilla.fenix.utils.Settings

/**
 * Total count of content recommendations to show.
 * This is an optimistic value taking into account that fewer than this stories may actually be available.
 */
@VisibleForTesting
internal const val TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT = 30

/**
 * The indexes to add sponsored stories.
 */
internal val SPONSORED_STORIES_INDEXES = listOf(1, 8)

/**
 * Total count of all sponsored Pocket stories to show.
 * This is an optimistic value taking into account that fewer than this stories may actually be available.
 */
@VisibleForTesting
internal val SPONSORED_STORIES_TO_SHOW_COUNT = SPONSORED_STORIES_INDEXES.size

/**
 * Get the list of stories to be displayed based on the user selected categories.
 *
 * @return a list of [PocketStory]es from the currently selected categories.
 */
fun AppState.getFilteredStories(): List<PocketStory> {
    val recommendedStories = getFilteredRecommendedStories()
    val sponsoredStories = getFilteredSponsoredContents(
        sponsoredContents = recommendationState.sponsoredContents,
        limit = SPONSORED_STORIES_TO_SHOW_COUNT,
    )

    return combineRecommendationsAndSponsoredContents(
        recommendations = recommendedStories,
        sponsoredStories = sponsoredStories,
    )
}

/**
 * Returns a filtered list of [PocketRecommendedStory]s based on the pocket stories categories
 * selections, impressions and numbers of stories to show.
 */
private fun AppState.getFilteredRecommendedStories(): List<PocketRecommendedStory> {
    return when (recommendationState.pocketStoriesCategoriesSelections.isEmpty()) {
        true -> {
            recommendationState.pocketStoriesCategories
                .find { it.name == POCKET_STORIES_DEFAULT_CATEGORY_NAME }
                ?.stories
                ?.sortedBy { it.timesShown }
                ?.take(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT) ?: emptyList()
        }
        false -> {
            val oldestSortedCategories = recommendationState.pocketStoriesCategoriesSelections
                .sortedByDescending { it.selectionTimestamp }
                .mapNotNull { selectedCategory ->
                    recommendationState.pocketStoriesCategories.find {
                        it.name == selectedCategory.name
                    }
                }

            val filteredStoriesCount = getFilteredStoriesCount(
                oldestSortedCategories,
                TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT,
            )

            oldestSortedCategories
                .flatMap { category ->
                    category.stories
                        .sortedBy { it.timesShown }
                        .take(filteredStoriesCount[category.name]!!)
                }.take(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT)
        }
    }
}

/**
 * Get the list of stories to be displayed based on the content recommendations and sponsored
 * stories state.
 *
 * @return A list of [PocketStory]s containing the content recommendations and sponsored stories
 * to display.
 */
fun AppState.getStories(): List<PocketStory> {
    val recommendations = recommendationState.contentRecommendations
        .sortedBy { it.impressions }
        .take(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT)
    val sponsoredStories = getFilteredSponsoredContents(
        sponsoredContents = recommendationState.sponsoredContents,
        limit = SPONSORED_STORIES_TO_SHOW_COUNT,
    )

    return combineRecommendationsAndSponsoredContents(
        recommendations = recommendations,
        sponsoredStories = sponsoredStories,
    )
}

/**
 * Combine the available content recommendations and sponsored content to display a number
 * of [PocketStory]s specified by [TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT] with a number of
 * sponsored content specified by [SPONSORED_STORIES_TO_SHOW_COUNT].
 *
 * @param recommendations A list of content recommendations to display.
 * @param sponsoredStories A list of sponsored content to display.
 * @return A list of [PocketStory] to display combining both [recommendations] and
 * [sponsoredStories].
 */
@VisibleForTesting
internal fun combineRecommendationsAndSponsoredContents(
    recommendations: List<PocketStory>,
    sponsoredStories: List<PocketStory>,
): List<PocketStory> {
    val sponsoredStoriesToShow = sponsoredStories
        .take(SPONSORED_STORIES_TO_SHOW_COUNT).toMutableList()
    val allStoriesToShow = recommendations
        .take(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT - sponsoredStoriesToShow.size)
        .toMutableList()

    for (index in SPONSORED_STORIES_INDEXES.sorted()) {
        if (sponsoredStoriesToShow.isEmpty()) {
            break
        }

        allStoriesToShow.add(
            index.coerceAtMost(allStoriesToShow.size),
            sponsoredStoriesToShow.removeAt(0),
        )
    }

    return allStoriesToShow
}

/**
 * Get how many stories needs to be shown from each currently selected category.
 *
 * @param selectedCategories ordered list of categories from which to return results.
 * @param neededStoriesCount how many stories are intended to be displayed.
 * This impacts the results by guaranteeing an even spread of stories from each category in that stories count.
 *
 * @return a mapping of how many stories are to be shown from each category from [selectedCategories].
 */
@VisibleForTesting
@Suppress("ReturnCount", "NestedBlockDepth")
internal fun getFilteredStoriesCount(
    selectedCategories: List<PocketRecommendedStoriesCategory>,
    neededStoriesCount: Int,
): Map<String, Int> {
    val totalStoriesInFilteredCategories = selectedCategories.fold(0) { availableStories, category ->
        availableStories + category.stories.size
    }

    when (totalStoriesInFilteredCategories > neededStoriesCount) {
        true -> {
            val storiesCountFromEachCategory = mutableMapOf<String, Int>()
            var currentFilteredStoriesCount = 0

            for (i in 0 until selectedCategories.maxOf { it.stories.size }) {
                selectedCategories.forEach { category ->
                    if (category.stories.getOrNull(i) != null) {
                        storiesCountFromEachCategory[category.name] =
                            storiesCountFromEachCategory[category.name]?.inc() ?: 1

                        if (++currentFilteredStoriesCount == neededStoriesCount) {
                            return storiesCountFromEachCategory
                        }
                    }
                }
            }
        }
        false -> {
            return selectedCategories.associate { it.name to it.stories.size }
        }
    }

    return emptyMap()
}

/**
 * Handle pacing and rotation of sponsored contents.
 *
 * @param sponsoredContents The list of [SponsoredContent]s to filter and sort.
 * @param limit Maximum number of [SponsoredContent]s to return.
 * @return A sorted and filtered list of [SponsoredContent]s to display.
 */
@VisibleForTesting
internal fun getFilteredSponsoredContents(
    sponsoredContents: List<SponsoredContent>,
    limit: Int,
): List<SponsoredContent> {
    return sponsoredContents.asSequence()
        .sortedByDescending { it.priority }
        .filterNot { it.hasFlightImpressionsLimitReached() }
        .take(limit)
        .toList()
}

/**
 * Filter a [AppState] by the blocklist.
 *
 * @param blocklistHandler The handler that will filter the state.
 */
fun AppState.filterState(blocklistHandler: BlocklistHandler): AppState =
    with(blocklistHandler) {
        copy(
            bookmarks = bookmarks.filteredByBlocklist(),
            recentTabs = recentTabs.filteredByBlocklist().filterContile(),
            recentHistory = recentHistory.filteredByBlocklist().filterContile(),
            recentSyncedTabState = recentSyncedTabState.filteredByBlocklist().filterContile(),
        )
    }

/**
 * Determines whether a recent tab section should be shown, based on user preference
 * and the availability of local or Synced tabs.
 */
fun AppState.shouldShowRecentTabs(settings: Settings): Boolean {
    val hasTab = recentTabs.isNotEmpty() || recentSyncedTabState is RecentSyncedTabState.Success
    return settings.showRecentTabsFeature && hasTab
}

/**
 * Determines whether a recent synced tab section should be shown, based on the availability of Synced tabs.
 */
fun AppState.shouldShowRecentSyncedTabs(): Boolean {
    return recentSyncedTabState is RecentSyncedTabState.Success
}
