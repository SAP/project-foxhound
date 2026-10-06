/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.pocket.update

import androidx.concurrent.futures.await
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.ListenableWorker
import androidx.work.testing.TestListenableWorkerBuilder
import kotlinx.coroutines.test.runTest
import mozilla.components.service.pocket.GlobalDependencyProvider
import mozilla.components.service.pocket.recommendations.ContentRecommendationsUseCases
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn

@RunWith(AndroidJUnit4::class)
class ContentRecommendationsRefreshWorkerTest {

    @Test
    fun `WHEN content recommendations are refreshed successfully THEN return success`() = runTest {
        val useCases: ContentRecommendationsUseCases = mock()
        val fetchContentRecommendations: ContentRecommendationsUseCases.FetchContentRecommendations = mock()
        doReturn(true).`when`(fetchContentRecommendations).invoke()
        doReturn(fetchContentRecommendations).`when`(useCases).fetchContentRecommendations
        GlobalDependencyProvider.ContentRecommendations.initialize(useCases)
        val worker = TestListenableWorkerBuilder<ContentRecommendationsRefreshWorker>(testContext).build()

        val result = worker.startWork().await()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `WHEN content recommendations are refreshed unsuccessfully THEN worker should retry`() = runTest {
        val useCases: ContentRecommendationsUseCases = mock()
        val fetchContentRecommendations: ContentRecommendationsUseCases.FetchContentRecommendations = mock()
        doReturn(false).`when`(fetchContentRecommendations).invoke()
        doReturn(fetchContentRecommendations).`when`(useCases).fetchContentRecommendations
        GlobalDependencyProvider.ContentRecommendations.initialize(useCases)
        val worker = TestListenableWorkerBuilder<ContentRecommendationsRefreshWorker>(testContext).build()

        val result = worker.startWork().await()

        assertEquals(ListenableWorker.Result.retry(), result)
    }
}
