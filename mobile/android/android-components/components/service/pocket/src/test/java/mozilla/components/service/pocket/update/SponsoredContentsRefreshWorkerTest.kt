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
import mozilla.components.service.pocket.mars.SponsoredContentsUseCases
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn

@RunWith(AndroidJUnit4::class)
class SponsoredContentsRefreshWorkerTest {

    @Test
    fun `WHEN sponsored contents are refreshed successfully THEN return success`() = runTest {
        val useCases: SponsoredContentsUseCases = mock()
        val refreshSponsoredContents: SponsoredContentsUseCases.RefreshSponsoredContents = mock()

        doReturn(true).`when`(refreshSponsoredContents).invoke()
        doReturn(refreshSponsoredContents).`when`(useCases).refreshSponsoredContents

        GlobalDependencyProvider.SponsoredContents.initialize(useCases)
        val worker = TestListenableWorkerBuilder<SponsoredContentsRefreshWorker>(testContext).build()

        val result = worker.startWork().await()

        assertEquals(ListenableWorker.Result.success(), result)
    }

    @Test
    fun `WHEN sponsored contents are refreshed unsuccessfully THEN worker should retry`() = runTest {
        val useCases: SponsoredContentsUseCases = mock()
        val refreshSponsoredContents: SponsoredContentsUseCases.RefreshSponsoredContents = mock()

        doReturn(false).`when`(refreshSponsoredContents).invoke()
        doReturn(refreshSponsoredContents).`when`(useCases).refreshSponsoredContents

        GlobalDependencyProvider.SponsoredContents.initialize(useCases)
        val worker = TestListenableWorkerBuilder<SponsoredContentsRefreshWorker>(testContext).build()

        val result = worker.startWork().await()

        assertEquals(ListenableWorker.Result.retry(), result)
    }
}
