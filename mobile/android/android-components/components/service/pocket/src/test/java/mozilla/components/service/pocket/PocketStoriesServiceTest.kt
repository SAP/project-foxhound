/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.pocket

import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.runTest
import mozilla.components.service.pocket.PocketStory.ContentRecommendation
import mozilla.components.service.pocket.PocketStory.PocketRecommendedStory
import mozilla.components.service.pocket.PocketStory.SponsoredContent
import mozilla.components.service.pocket.helpers.assertConstructorsVisibility
import mozilla.components.service.pocket.mars.SponsoredContentsUseCases
import mozilla.components.service.pocket.mars.SponsoredContentsUseCases.GetSponsoredContents
import mozilla.components.service.pocket.mars.SponsoredContentsUseCases.RecordImpressions
import mozilla.components.service.pocket.recommendations.ContentRecommendationsUseCases
import mozilla.components.service.pocket.recommendations.ContentRecommendationsUseCases.GetContentRecommendations
import mozilla.components.service.pocket.recommendations.ContentRecommendationsUseCases.UpdateRecommendationsImpressions
import mozilla.components.service.pocket.stories.PocketStoriesUseCases
import mozilla.components.service.pocket.stories.PocketStoriesUseCases.GetPocketStories
import mozilla.components.service.pocket.stories.PocketStoriesUseCases.UpdateStoriesTimesShown
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.verify
import kotlin.reflect.KVisibility

@RunWith(AndroidJUnit4::class)
class PocketStoriesServiceTest {
    private val storiesUseCases: PocketStoriesUseCases = mock()
    private val contentRecommendationsUseCases: ContentRecommendationsUseCases = mock()
    private val sponsoredContentsUseCases: SponsoredContentsUseCases = mock()
    private val service = PocketStoriesService(testContext, PocketStoriesConfig(mock())).also {
        it.storiesRefreshScheduler = mock()
        it.contentRecommendationsRefreshScheduler = mock()
        it.sponsoredContentsRefreshScheduler = mock()
        it.storiesUseCases = storiesUseCases
        it.contentRecommendationsUseCases = contentRecommendationsUseCases
        it.sponsoredContentsUseCases = sponsoredContentsUseCases
    }

    @After
    fun teardown() {
        GlobalDependencyProvider.ContentRecommendations.reset()
        GlobalDependencyProvider.RecommendedStories.reset()
        GlobalDependencyProvider.SponsoredContents.reset()
    }

    @Test
    fun `GIVEN PocketStoriesService THEN it should be publicly available`() {
        assertConstructorsVisibility(PocketStoriesConfig::class, KVisibility.PUBLIC)
    }

    @Test
    fun `GIVEN PocketStoriesService WHEN startPeriodicStoriesRefresh THEN persist dependencies and schedule stories refresh`() {
        service.startPeriodicStoriesRefresh()

        assertNotNull(GlobalDependencyProvider.RecommendedStories.useCases)
        verify(service.storiesRefreshScheduler).schedulePeriodicRefreshes(any())
    }

    @Test
    fun `GIVEN PocketStoriesService WHEN stopPeriodicStoriesRefresh THEN stop refreshing stories and clear dependencies`() {
        service.stopPeriodicStoriesRefresh()

        verify(service.storiesRefreshScheduler).stopPeriodicRefreshes(any())
        assertNull(GlobalDependencyProvider.RecommendedStories.useCases)
    }

    @Test
    fun `GIVEN PocketStoriesService WHEN getStories THEN stories useCases should return`() = runTest {
        val stories = listOf(mock<PocketRecommendedStory>())
        val getStoriesUseCase: GetPocketStories = mock()
        doReturn(stories).`when`(getStoriesUseCase).invoke()
        doReturn(getStoriesUseCase).`when`(storiesUseCases).getStories

        val result = service.getStories()

        assertEquals(stories, result)
    }

    @Test
    fun `GIVEN PocketStoriesService WHEN updateStoriesTimesShown THEN delegate to spocs useCases`() = runTest {
        val updateTimesShownUseCase: UpdateStoriesTimesShown = mock()
        doReturn(updateTimesShownUseCase).`when`(storiesUseCases).updateTimesShown
        val stories = listOf(mock<PocketRecommendedStory>())

        service.updateStoriesTimesShown(stories)

        verify(updateTimesShownUseCase).invoke(stories)
    }

    @Test
    fun `WHEN start periodic content recommendations refresh is invoked THEN schedule content recommendations refreshes`() {
        service.startPeriodicContentRecommendationsRefresh()

        assertNotNull(GlobalDependencyProvider.ContentRecommendations.useCases)
        verify(service.contentRecommendationsRefreshScheduler).startPeriodicWork(any())
    }

    @Test
    fun `WHEN stop periodic content recommendations refresh is invoked THEN unschedule content recommendations refreshes`() {
        service.stopPeriodicContentRecommendationsRefresh()

        assertNull(GlobalDependencyProvider.ContentRecommendations.useCases)
        verify(service.contentRecommendationsRefreshScheduler).stopPeriodicWork(any())
    }

    @Test
    fun `WHEN get content recommendations is invoked THEN content recommendations use cases should return a list of content recommendations`() = runTest {
        val recommendations = listOf(mock<ContentRecommendation>())
        val getContentRecommendations: GetContentRecommendations = mock()
        doReturn(recommendations).`when`(getContentRecommendations).invoke()
        doReturn(getContentRecommendations).`when`(contentRecommendationsUseCases).getContentRecommendations

        val result = service.getContentRecommendations()

        assertEquals(recommendations, result)
    }

    @Test
    fun `WHEN update content recommendations impressions is invoked THEN delegate to the content recommendations use cases`() = runTest {
        val recommendationsShown = listOf(mock<ContentRecommendation>())
        val updateRecommendationsImpressions: UpdateRecommendationsImpressions = mock()
        doReturn(updateRecommendationsImpressions).`when`(contentRecommendationsUseCases).updateRecommendationsImpressions

        service.updateRecommendationsImpressions(recommendationsShown)

        verify(updateRecommendationsImpressions).invoke(recommendationsShown)
    }

    @Test
    fun `WHEN start periodic sponsored contents refresh is invoked THEN schedule sponsored contents refreshes`() {
        service.startPeriodicSponsoredContentsRefresh()

        assertNotNull(GlobalDependencyProvider.SponsoredContents.useCases)
        verify(service.sponsoredContentsRefreshScheduler).startPeriodicRefreshes(any())
    }

    @Test
    fun `WHEN stop periodic sponsored contents refresh is invoked THEN unschedule sponsored contents refreshes`() {
        service.stopPeriodicSponsoredContentsRefresh()

        assertNull(GlobalDependencyProvider.SponsoredContents.useCases)
        verify(service.sponsoredContentsRefreshScheduler).stopPeriodicRefreshes(any())
    }

    @Test
    fun `WHEN get sponsored contents is invoked THEN sponsored contents use cases should return a list of sponsored contents`() = runTest {
        val sponsoredContents = listOf(mock<SponsoredContent>())
        val getSponsoredContents: GetSponsoredContents = mock()
        doReturn(sponsoredContents).`when`(getSponsoredContents).invoke()
        doReturn(getSponsoredContents).`when`(sponsoredContentsUseCases).getSponsoredContents

        val result = service.getSponsoredContents()

        assertEquals(sponsoredContents, result)
    }

    @Test
    fun `WHEN record sponsored content impressions is invoked THEN delegate to the sponsored contents use cases`() = runTest {
        val impressions = listOf("http://www.mozilla.org")
        val recordImpressions: RecordImpressions = mock()
        doReturn(recordImpressions).`when`(sponsoredContentsUseCases).recordImpressions

        service.recordSponsoredContentImpressions(impressions)

        verify(recordImpressions).invoke(impressions)
    }

    @Test
    fun `WHEN delete user is invoked THEN stop sponsored content refreshes and schedule user deletion`() {
        service.deleteUser()

        assertNotNull(GlobalDependencyProvider.SponsoredContents.useCases)
        verify(service.sponsoredContentsRefreshScheduler).stopPeriodicRefreshes(any())
        verify(service.sponsoredContentsRefreshScheduler).scheduleUserDeletion(any())
    }
}
