/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.storage.sync

import android.content.Context
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.appservices.places.PlacesReaderConnection
import mozilla.appservices.places.PlacesWriterConnection
import mozilla.appservices.places.uniffi.PlacesApiException
import mozilla.components.support.base.log.logger.Logger
import mozilla.components.support.test.mock
import org.junit.Test
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

class PlacesStorageTest {
    private val testDispatcher = StandardTestDispatcher()
    private val storage = FakePlacesStorage(dispatcher = testDispatcher)

    @Test
    fun `WHEN all reads are interrupted THEN no exception is thrown`() = runTest(testDispatcher) {
        doAnswer {
            throw PlacesApiException.OperationInterrupted("This should be caught")
        }.`when`(storage.reader).interrupt()

        storage.interruptCurrentReads()

        verify(storage.reader).interrupt()
    }

    @Test
    fun `WHEN all writes are interrupted THEN no exception is thrown`() = runTest(testDispatcher) {
        doAnswer {
            throw PlacesApiException.OperationInterrupted("This should be caught")
        }.`when`(storage.writer).interrupt()

        storage.interruptCurrentWrites()

        verify(storage.writer).interrupt()
    }

    @Test
    fun `WHEN an unexpected places exception is thrown it is consumed`() = runTest(testDispatcher) {
        doAnswer {
            throw PlacesApiException.UnexpectedPlacesException("This should be caught")
        }.`when`(storage.writer).interrupt()

        storage.interruptCurrentWrites()

        verify(storage.writer).interrupt()
    }

    @Test
    fun `WHEN a call is made to clean all reads THEN they are cancelled`() = runTest(testDispatcher) {
        val childJob = storage.readScope.launch {
            delay(1000)
        }
        storage.cancelReads()

        verify(storage.reader).interrupt()
        assert(childJob.isCancelled)
    }

    @Test
    fun `GIVEN a specific query WHEN a call is made to clean all reads THEN they are cancelled only if the query is different from the previous call`() = runTest(testDispatcher) {
        // First call: should cancel
        val job1 = storage.readScope.launch { delay(1000) }
        storage.cancelReads("test")

        verify(storage.reader, times(1)).interrupt()
        assert(job1.isCancelled)

        // Second call with same query: should NOT cancel/interrupt again
        val job2 = storage.readScope.launch { delay(1000) }
        storage.cancelReads("test")

        verify(storage.reader, times(1)).interrupt()
        assert(job2.isActive) // Still active because cancelChildren wasn't called

        // Third call with different query: should cancel/interrupt again
        storage.cancelReads("tset")

        verify(storage.reader, times(2)).interrupt()
        assert(job2.isCancelled) // Now it's cancelled
    }

    @Test
    fun `WHEN a call is made to clean all writes THEN they are cancelled`() = runTest(testDispatcher) {
        val childJob = storage.writeScope.launch {
            delay(1000)
        }
        storage.cancelWrites()

        verify(storage.writer).interrupt()
        assert(childJob.isCancelled)
    }

    class FakePlacesStorage(
        context: Context = mock(),
        dispatcher: CoroutineDispatcher,
    ) : PlacesStorage(context, readDispatcher = dispatcher, writeDispatcher = dispatcher) {
        override val logger = Logger("FakePlacesStorage")
        override fun registerWithSyncManager() {}

        override val writer: PlacesWriterConnection = mock()
        override val reader: PlacesReaderConnection = mock()
    }
}
