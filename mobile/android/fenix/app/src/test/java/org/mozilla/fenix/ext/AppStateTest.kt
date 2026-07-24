/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ext

import io.mockk.every
import io.mockk.mockk
import mozilla.components.service.pocket.PocketStory
import mozilla.components.service.pocket.PocketStory.PocketRecommendedStory
import mozilla.components.service.pocket.PocketStory.SponsoredContent
import mozilla.components.service.pocket.PocketStory.SponsoredContentCallbacks
import mozilla.components.service.pocket.PocketStory.SponsoredContentFrequencyCaps
import org.junit.Assert
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.TestUtils.getFakeContentRecommendations
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.components.appstate.recommendations.ContentRecommendationsState
import org.mozilla.fenix.home.pocket.POCKET_STORIES_DEFAULT_CATEGORY_NAME
import org.mozilla.fenix.home.pocket.PocketRecommendedStoriesCategory
import org.mozilla.fenix.home.pocket.PocketRecommendedStoriesSelectedCategory
import org.mozilla.fenix.home.recentsyncedtabs.RecentSyncedTabState
import org.mozilla.fenix.utils.Settings
import java.util.concurrent.TimeUnit
import kotlin.random.Random

class AppStateTest {
    private val otherStoriesCategory =
        PocketRecommendedStoriesCategory("other", getFakePocketStories(3, "other"))
    private val anotherStoriesCategory =
        PocketRecommendedStoriesCategory("another", getFakePocketStories(3, "another"))
    private val defaultStoriesCategory = PocketRecommendedStoriesCategory(
        POCKET_STORIES_DEFAULT_CATEGORY_NAME,
        getFakePocketStories(3),
    )

    @Test
    fun `GIVEN no category is selected and no sponsored stories are available WHEN getFilteredStories is called THEN only Pocket stories from the default category are returned`() {
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories = listOf(
                    otherStoriesCategory,
                    anotherStoriesCategory,
                    defaultStoriesCategory,
                ),
            ),
        )

        val result = state.getFilteredStories()

        assertNull(
            result.firstOrNull {
                it is PocketRecommendedStory && it.category != POCKET_STORIES_DEFAULT_CATEGORY_NAME
            },
        )
    }

    @Test
    fun `GIVEN no category is selected and no sponsored stories are available WHEN getFilteredStories is called THEN no more than the default stories number are returned from the default category`() {
        val defaultStoriesCategoryWithManyStories = PocketRecommendedStoriesCategory(
            POCKET_STORIES_DEFAULT_CATEGORY_NAME,
            getFakePocketStories(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT + 2),
        )
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories = listOf(
                    otherStoriesCategory,
                    anotherStoriesCategory,
                    defaultStoriesCategoryWithManyStories,
                ),
            ),
        )

        val result = state.getFilteredStories()

        assertEquals(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT, result.size)
    }

    @Test
    fun `GIVEN no category is selected and sponsored contents are available WHEN getFilteredStories is called THEN return stories from the default category combined with the sponsored contents`() {
        val defaultStoriesCategoryWithManyStories = PocketRecommendedStoriesCategory(
            POCKET_STORIES_DEFAULT_CATEGORY_NAME,
            getFakePocketStories(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT),
        )
        val sponsoredContents = getFakeSponsoredContents(4)
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories = listOf(
                    otherStoriesCategory,
                    anotherStoriesCategory,
                    defaultStoriesCategoryWithManyStories,
                ),
                sponsoredContents = sponsoredContents,
            ),
        )

        var result = state.getFilteredStories().toMutableList()

        assertEquals(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT, result.size)
        assertEquals(sponsoredContents[1], result[1])
        assertEquals(sponsoredContents[3], result[8])

        result = result.filterIsInstance<PocketRecommendedStory>().toMutableList()

        assertNull(
            result.firstOrNull {
                it is PocketRecommendedStory && it.category != POCKET_STORIES_DEFAULT_CATEGORY_NAME
            },
        )
    }

    @Test
    fun `WHEN filtering the sponsored contents THEN return the list of sponsored contents sorted by descending priority`() {
        val sponsoredContents = getFakeSponsoredContents(4).mapIndexed { index, sponsoredContent ->
            sponsoredContent.copy(priority = index)
        }
        val result = getFilteredSponsoredContents(sponsoredContents, 10)

        assertEquals(4, result.size)
        assertEquals(sponsoredContents.reversed(), result)
    }

    @Test
    fun `WHEN filtering the sponsored contents THEN return the list of sponsored content excluding entries that have reached flight impressions limit`() {
        val sponsoredContents = getFakeSponsoredContents(4).mapIndexed { index, sponsoredContent ->
            when (index % 2 == 0) {
                true -> sponsoredContent
                false -> sponsoredContent.copy(
                    caps = sponsoredContent.caps.copy(
                        currentImpressions = listOf(
                            TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis()),
                            TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis()),
                            TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis()),
                        ),
                        flightCount = 3,
                    ),
                )
            }
        }
        val result = getFilteredSponsoredContents(sponsoredContents, 10)

        assertEquals(2, result.size)
        assertEquals(sponsoredContents[0], result[0])
        assertEquals(sponsoredContents[2], result[1])
    }

    @Test
    fun `GIVEN a limit is specified WHEN filtering the sponsored contents THEN return a list of sponsored contents that does not exceed the limit size`() {
        val sponsoredContents = getFakeSponsoredContents(4)
        val result = getFilteredSponsoredContents(sponsoredContents, 2)

        assertEquals(2, result.size)
    }

    @Test
    fun `GIVEN a category is selected WHEN getFilteredStories is called THEN no more than the default stories number are returned from the selected category`() {
        val otherStoriesCategoryWithManyStories =
            PocketRecommendedStoriesCategory(
                "other",
                getFakePocketStories(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT + 2, "other"),
            )
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories =
                listOf(
                    otherStoriesCategoryWithManyStories,
                    anotherStoriesCategory,
                    defaultStoriesCategory,
                ),
                pocketStoriesCategoriesSelections =
                listOf(PocketRecommendedStoriesSelectedCategory(otherStoriesCategoryWithManyStories.name)),
            ),
        )

        val result = state.getFilteredStories()

        assertEquals(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT, result.size)
    }

    @Test
    fun `GIVEN two categories are selected WHEN getFilteredStories is called THEN only stories from those categories are returned`() {
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories = listOf(
                    otherStoriesCategory,
                    anotherStoriesCategory,
                    defaultStoriesCategory,
                ),
                pocketStoriesCategoriesSelections = listOf(
                    PocketRecommendedStoriesSelectedCategory(otherStoriesCategory.name),
                    PocketRecommendedStoriesSelectedCategory(anotherStoriesCategory.name),
                ),
            ),
        )

        val result = state.getFilteredStories()
        assertEquals(6, result.size)
        assertNull(
            result.firstOrNull {
                it is PocketRecommendedStory &&
                    it.category != otherStoriesCategory.name &&
                    it.category != anotherStoriesCategory.name
            },
        )
    }

    @Test
    fun `GIVEN no category is selected WHEN getFilteredStoriesCount is called THEN return an empty result`() {
        val result = getFilteredStoriesCount(emptyList(), 1)

        assertTrue(result.isEmpty())
    }

    @Test
    fun `GIVEN a category is selected WHEN getFilteredStoriesCount is called for at most the stories from this category THEN only stories count only from that category are returned`() {
        var result = getFilteredStoriesCount(listOf(otherStoriesCategory), 2)
        assertEquals(1, result.keys.size)
        assertEquals(otherStoriesCategory.name, result.entries.first().key)
        assertEquals(2, result[otherStoriesCategory.name])

        result = getFilteredStoriesCount(listOf(otherStoriesCategory), 3)
        assertEquals(1, result.keys.size)
        assertEquals(otherStoriesCategory.name, result.entries.first().key)
        assertEquals(3, result[otherStoriesCategory.name])
    }

    @Test
    fun `GIVEN a category is selected WHEN getFilteredStoriesCount is called for more stories than in this category THEN return only that`() {
        val result = getFilteredStoriesCount(listOf(otherStoriesCategory), 4)
        assertEquals(1, result.keys.size)
        assertEquals(otherStoriesCategory.name, result.entries.first().key)
        assertEquals(3, result[otherStoriesCategory.name])
    }

    @Test
    fun `GIVEN two categories are selected WHEN getFilteredStoriesCount is called for at most the stories count in both THEN only stories counts from those categories are returned`() {
        var result = getFilteredStoriesCount(listOf(otherStoriesCategory, anotherStoriesCategory), 2)
        assertEquals(2, result.keys.size)
        assertTrue(
            result.keys.containsAll(
                listOf(
                    otherStoriesCategory.name,
                    anotherStoriesCategory.name,
                ),
            ),
        )
        assertEquals(1, result[otherStoriesCategory.name])
        assertEquals(1, result[anotherStoriesCategory.name])

        result = getFilteredStoriesCount(listOf(otherStoriesCategory, anotherStoriesCategory), 6)
        assertEquals(2, result.keys.size)
        assertTrue(
            result.keys.containsAll(
                listOf(
                    otherStoriesCategory.name,
                    anotherStoriesCategory.name,
                ),
            ),
        )
        assertEquals(3, result[otherStoriesCategory.name])
        assertEquals(3, result[anotherStoriesCategory.name])
    }

    @Test
    fun `GIVEN two categories are selected WHEN getFilteredStoriesCount is called for more results than stories in both THEN only stories counts from those categories are returned`() {
        val result = getFilteredStoriesCount(listOf(otherStoriesCategory, anotherStoriesCategory), 8)
        assertEquals(2, result.keys.size)
        assertTrue(
            result.keys.containsAll(
                listOf(
                    otherStoriesCategory.name,
                    anotherStoriesCategory.name,
                ),
            ),
        )
        assertEquals(3, result[otherStoriesCategory.name])
        assertEquals(3, result[anotherStoriesCategory.name])
    }

    @Test
    fun `GIVEN two categories are selected WHEN getFilteredStoriesCount is called for an odd number of results THEN there are more by one results from first selected category`() {
        val result = getFilteredStoriesCount(listOf(otherStoriesCategory, anotherStoriesCategory), 5)

        assertTrue(
            result.keys.containsAll(
                listOf(
                    otherStoriesCategory.name,
                    anotherStoriesCategory.name,
                ),
            ),
        )
        assertEquals(3, result[otherStoriesCategory.name])
        assertEquals(2, result[anotherStoriesCategory.name])
    }

    @Test
    fun `GIVEN two categories selected with more than needed stories WHEN getFilteredStories is called THEN the results are sorted in the order of least shown`() {
        val firstCategory = PocketRecommendedStoriesCategory(
            "first",
            getFakePocketStories(3, "first"),
        ).run {
            // Avoid the first item also being the oldest to eliminate a potential bug in code
            // that would still get the expected result.
            copy(
                stories = stories.mapIndexed { index, story ->
                    when (index) {
                        0 -> story.copy(timesShown = 333)
                        1 -> story.copy(timesShown = 0)
                        else -> story.copy(timesShown = 345)
                    }
                },
            )
        }
        val secondCategory = PocketRecommendedStoriesCategory(
            "second",
            getFakePocketStories(3, "second"),
        ).run {
            // Avoid the first item also being the oldest to eliminate a potential bug in code
            // that would still get the expected result.
            copy(
                stories = stories.mapIndexed { index, story ->
                    when (index) {
                        0 -> story.copy(timesShown = 222)
                        1 -> story.copy(timesShown = 111)
                        else -> story.copy(timesShown = 11)
                    }
                },
            )
        }

        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories = listOf(firstCategory, secondCategory),
                pocketStoriesCategoriesSelections = listOf(
                    PocketRecommendedStoriesSelectedCategory(
                        firstCategory.name,
                        selectionTimestamp = 0,
                    ),
                    PocketRecommendedStoriesSelectedCategory(
                        secondCategory.name,
                        selectionTimestamp = 222,
                    ),
                ),
            ),
        )

        val result = state.getFilteredStories()

        assertEquals(6, result.size)
        assertSame(secondCategory.stories[2], result.first())
        assertSame(secondCategory.stories[1], result[1])
        assertSame(secondCategory.stories[0], result[2])
        assertSame(firstCategory.stories[1], result[3])
        assertSame(firstCategory.stories[0], result[4])
        assertSame(firstCategory.stories[2], result[5])
    }

    @Test
    fun `GIVEN old selections of categories which do not exist anymore WHEN getFilteredStories is called THEN ignore not found selections`() {
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                pocketStoriesCategories = listOf(
                    otherStoriesCategory,
                    anotherStoriesCategory,
                    defaultStoriesCategory,
                ),
                pocketStoriesCategoriesSelections = listOf(
                    PocketRecommendedStoriesSelectedCategory("unexistent"),
                    PocketRecommendedStoriesSelectedCategory(anotherStoriesCategory.name),
                ),
            ),
        )

        val result = state.getFilteredStories()

        assertEquals(3, result.size)
        assertNull(
            result.firstOrNull {
                it is PocketRecommendedStory && it.category != anotherStoriesCategory.name
            },
        )
    }

    @Test
    fun `GIVEN content recommendations with no sponsored stories WHEN getStories is called THEN return a list of content recommendations to displayed sorted by the number of impressions`() {
        val recommendations = getFakeContentRecommendations(40)
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                contentRecommendations = recommendations.sortedByDescending { it.impressions },
            ),
        )

        val result = state.getStories()

        assertCombinedStories(
            recommendedStories = recommendations,
            sponsoredStories = listOf(),
            result = result,
            sponsoredStoriesIndexes = listOf(),
        )
    }

    @Test
    fun `GIVEN content recommendations and sponsored contents WHEN getStories is called THEN return a list of 40 stories with sponsored contents at position 2 and 9`() {
        val recommendations = getFakeContentRecommendations(40)
        val sponsoredContents = getFakeSponsoredContents(4)
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                contentRecommendations = recommendations,
                sponsoredContents = sponsoredContents,
            ),
        )

        val result = state.getStories()

        assertCombinedStories(
            recommendedStories = recommendations,
            sponsoredStories = sponsoredContents,
            sponsoredStoriesIndexes = listOf(1, 3),
            result = result,
        )
    }

    @Test
    fun `GIVEN content recommendations and 1 sponsored content WHEN getStories is called THEN return a list of stories with sponsored content at position 2`() {
        val recommendations = getFakeContentRecommendations(4)
        val sponsoredContents = getFakeSponsoredContents(1)
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                contentRecommendations = recommendations,
                sponsoredContents = sponsoredContents,
            ),
        )

        val result = state.getStories()

        assertEquals(5, result.size)
        assertEquals(recommendations[0], result[0])
        assertEquals(sponsoredContents[0], result[1])
        assertEquals(recommendations[1], result[2])
        assertEquals(recommendations[2], result[3])
        assertEquals(recommendations[3], result[4])
    }

    @Test
    fun `GIVEN content recommendations and 2 sponsored contents WHEN getStories is called THEN return a list of stories with sponsored contents at position 2 and 6`() {
        val recommendations = getFakeContentRecommendations(4)
        val sponsoredContents = getFakeSponsoredContents(2)
        val state = AppState(
            recommendationState = ContentRecommendationsState(
                contentRecommendations = recommendations,
                sponsoredContents = sponsoredContents,
            ),
        )

        val result = state.getStories()

        assertEquals(6, result.size)
        assertEquals(recommendations[0], result[0])
        assertEquals(sponsoredContents[1], result[1])
        assertEquals(recommendations[1], result[2])
        assertEquals(recommendations[2], result[3])
        assertEquals(recommendations[3], result[4])
        assertEquals(sponsoredContents[0], result[5])
    }

    @Test
    fun `GIVEN recent tabs disabled in settings WHEN checking to show tabs THEN section should not be shown`() {
        val settings = mockk<Settings> {
            every { showRecentTabsFeature } returns false
        }

        val state = AppState()

        Assert.assertFalse(state.shouldShowRecentTabs(settings))
    }

    @Test
    fun `GIVEN only local tabs WHEN checking to show tabs THEN section should be shown`() {
        val settings = mockk<Settings> {
            every { showRecentTabsFeature } returns true
        }

        val state = AppState(recentTabs = listOf(mockk()))

        assertTrue(state.shouldShowRecentTabs(settings))
    }

    @Test
    fun `GIVEN only remote tabs WHEN checking to show tabs THEN section should be shown`() {
        val settings = mockk<Settings> {
            every { showRecentTabsFeature } returns true
        }

        val state = AppState(recentSyncedTabState = RecentSyncedTabState.Success(emptyList()))

        assertTrue(state.shouldShowRecentTabs(settings))
    }

    @Test
    fun `GIVEN local and remote tabs WHEN checking to show tabs THEN section should be shown`() {
        val settings = mockk<Settings> {
            every { showRecentTabsFeature } returns true
        }

        val state = AppState(
            recentTabs = listOf(mockk()),
            recentSyncedTabState = RecentSyncedTabState.Success(emptyList()),
        )

        assertTrue(state.shouldShowRecentTabs(settings))
    }

    private fun assertCombinedStories(
        recommendedStories: List<PocketStory>,
        sponsoredStories: List<PocketStory>,
        result: List<PocketStory>,
        sponsoredStoriesIndexes: List<Int> = listOf(0, 1),
    ) {
        assertEquals(TOTAL_CONTENT_RECOMMENDATIONS_TO_SHOW_COUNT, result.size)
        var recommendedStoriesIndex = 0
        assertEquals(recommendedStories[recommendedStoriesIndex++], result[0])

        if (sponsoredStories.isEmpty()) {
            assertEquals(recommendedStories[recommendedStoriesIndex++], result[1])
        } else {
            assertEquals(sponsoredStories[sponsoredStoriesIndexes[0]], result[1])
        }

        for (i in 2..7) { assertEquals(recommendedStories[recommendedStoriesIndex++], result[i]) }

        if (sponsoredStories.size > 1) {
            assertEquals(sponsoredStories[sponsoredStoriesIndexes[1]], result[8])
        } else {
            assertEquals(recommendedStories[recommendedStoriesIndex++], result[8])
        }

        for (i in 9..29) { assertEquals(recommendedStories[recommendedStoriesIndex++], result[i]) }
    }
}

private fun getFakePocketStories(
    limit: Int = 1,
    category: String = POCKET_STORIES_DEFAULT_CATEGORY_NAME,
): List<PocketRecommendedStory> {
    return mutableListOf<PocketRecommendedStory>().apply {
        for (index in 0 until limit) {
            val randomNumber = Random.nextInt(0, 10)

            add(
                PocketRecommendedStory(
                    title = "This is a ${"very ".repeat(randomNumber)} long title",
                    publisher = "Publisher",
                    url = "https://story$randomNumber.com",
                    imageUrl = "",
                    timeToRead = randomNumber,
                    category = category,
                    timesShown = index.toLong(),
                ),
            )
        }
    }
}

private fun getFakeSponsoredContents(limit: Int) = mutableListOf<SponsoredContent>().apply {
    for (index in 0 until limit) {
        add(
            SponsoredContent(
                url = "https://sponsored.story",
                title = "Story title $index",
                callbacks = SponsoredContentCallbacks(
                    clickUrl = "https://mozilla.com/click$index",
                    impressionUrl = "https://mozilla.com/impression$index",
                ),
                imageUrl = "https://sponsored.image",
                domain = "Domain $index",
                excerpt = "Excerpt $index",
                sponsor = "Sponsor $index",
                blockKey = "Block key $index",
                caps = SponsoredContentFrequencyCaps(
                    flightCount = 1 + index * 2,
                    flightPeriod = 1 + index * 3,
                ),
                priority = 2 + index % 2,
            ),
        )
    }
}
