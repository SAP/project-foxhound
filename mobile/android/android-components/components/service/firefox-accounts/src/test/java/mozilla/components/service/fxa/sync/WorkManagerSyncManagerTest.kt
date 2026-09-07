/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxa.sync

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.Configuration
import androidx.work.WorkInfo
import androidx.work.WorkerParameters
import androidx.work.impl.utils.taskexecutor.TaskExecutor
import androidx.work.testing.WorkManagerTestInitHelper
import mozilla.components.service.fxa.SyncConfig
import mozilla.components.service.fxa.SyncEngine
import mozilla.components.service.fxa.sync.FakeSyncStatusObserver.Event.OnIdle
import mozilla.components.service.fxa.sync.FakeSyncStatusObserver.Event.OnStarted
import mozilla.components.service.fxa.sync.WorkManagerSyncWorker.Companion.SYNC_STAGGER_BUFFER_MS
import mozilla.components.service.fxa.sync.WorkManagerSyncWorker.Companion.engineSyncTimestamp
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.`when`

@RunWith(AndroidJUnit4::class)
class WorkManagerSyncManagerTest {
    private lateinit var mockParam: WorkerParameters
    private lateinit var mockTags: Set<String>
    private lateinit var mockTaskExecutor: TaskExecutor

    @Before
    fun setUp() {
        mockParam = mock()
        mockTags = mock()
        mockTaskExecutor = mock()
        `when`(mockParam.taskExecutor).thenReturn(mockTaskExecutor)
        `when`(mockTaskExecutor.serialTaskExecutor).thenReturn(mock())
        `when`(mockParam.tags).thenReturn(mockTags)

        WorkManagerTestInitHelper.initializeTestWorkManager(
            testContext,
            Configuration.Builder().build(),
        )
    }

    @Test
    fun `sync state access`() {
        assertNull(getSyncState(testContext))
        assertEquals(0L, getLastSynced(testContext))

        // 'clear' doesn't blow up for empty state
        clearSyncState(testContext)
        // ... and doesn't affect anything, either
        assertNull(getSyncState(testContext))
        assertEquals(0L, getLastSynced(testContext))

        setSyncState(testContext, "some state")
        assertEquals("some state", getSyncState(testContext))

        setLastSynced(testContext, 123L)
        assertEquals(123L, getLastSynced(testContext))

        clearSyncState(testContext)
        assertNull(getSyncState(testContext))
        assertEquals(0L, getLastSynced(testContext))
    }

    @Test
    fun `GIVEN work is not set to be debounced THEN it is not considered to be synced within the buffer`() {
        `when`(mockTags.contains(SyncWorkerTag.Debounce.name)).thenReturn(false)

        engineSyncTimestamp["test"] = System.currentTimeMillis() - SYNC_STAGGER_BUFFER_MS - 100L
        engineSyncTimestamp["test2"] = System.currentTimeMillis()

        val workerManagerSyncWorker = WorkManagerSyncWorker(testContext, mockParam)

        assertFalse(workerManagerSyncWorker.isDebounced())
        assertFalse(workerManagerSyncWorker.lastSyncedWithinStaggerBuffer("test"))
        assertFalse(workerManagerSyncWorker.lastSyncedWithinStaggerBuffer("test2"))
    }

    @Test
    fun `GIVEN work is set to be debounced THEN last synced timestamp is compared to buffer`() {
        `when`(mockTags.contains(SyncWorkerTag.Debounce.name)).thenReturn(true)

        engineSyncTimestamp["test"] = System.currentTimeMillis() - SYNC_STAGGER_BUFFER_MS - 100L
        engineSyncTimestamp["test2"] = System.currentTimeMillis()

        val workerManagerSyncWorker = WorkManagerSyncWorker(testContext, mockParam)

        assert(workerManagerSyncWorker.isDebounced())
        assertFalse(workerManagerSyncWorker.lastSyncedWithinStaggerBuffer("test"))
        assert(workerManagerSyncWorker.lastSyncedWithinStaggerBuffer("test2"))
    }

    @Test
    fun `GIVEN work is set to be debounced WHEN there is not a saved time stamp THEN work will not be debounced`() {
        `when`(mockTags.contains(SyncWorkerTag.Debounce.name)).thenReturn(true)

        val workerManagerSyncWorker = WorkManagerSyncWorker(testContext, mockParam)

        assert(workerManagerSyncWorker.isDebounced())
        assertFalse(workerManagerSyncWorker.lastSyncedWithinStaggerBuffer("test"))
    }

    @Test
    fun `WHEN workerStateChanged receives RUNNING state THEN onStarted is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.RUNNING))

        assertEquals(listOf(OnStarted), observer.events)
        assertTrue(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives SUCCEEDED state THEN onIdle is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.ENQUEUED))
        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.SUCCEEDED))

        assertEquals(listOf(OnIdle), observer.events)
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives FAILED state THEN onIdle is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.ENQUEUED))
        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.FAILED))

        assertEquals(listOf(OnIdle), observer.events)
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives CANCELLED state THEN onIdle is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.CANCELLED))

        assertEquals(listOf(OnIdle), observer.events)
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives null state THEN nothing happens`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(null)

        assertTrue(observer.events.isEmpty())
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives empty list THEN nothing happens`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(emptyList())

        assertTrue(observer.events.isEmpty())
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives ENQUEUED state THEN nothing happens`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.ENQUEUED))

        assertTrue(observer.events.isEmpty())
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged receives RUNNING then SUCCEEDED THEN both onStarted and onIdle are notified in right order`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.ENQUEUED))
        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.RUNNING))
        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.SUCCEEDED))

        assertEquals(listOf(OnStarted, OnIdle), observer.events)
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged is called with multiple workers in different states including one RUNNING THEN onStarted is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.ENQUEUED, WorkInfo.State.RUNNING))

        // Verify onStarted was called (because at least one is RUNNING)
        assertEquals(listOf(OnStarted), observer.events)
        assertTrue(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged is called with multiple workers in different states including one SUCCEEDED THEN onIdle is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.SUCCEEDED, WorkInfo.State.FAILED))

        assertEquals(listOf(OnIdle), observer.events)
        assertFalse(syncManager.isSyncActive())
    }

    @Test
    fun `WHEN workerStateChanged is called with multiple workers in different states including one SUCCEEDED and one RUNNING THEN onStarted is notified`() {
        val observer = FakeSyncStatusObserver()
        val syncManager = createSyncManager(observer)

        syncManager.syncDispatcher?.workersStateChanged(listOf(WorkInfo.State.SUCCEEDED, WorkInfo.State.RUNNING))

        assertEquals(listOf(OnStarted), observer.events)
        assertTrue(syncManager.isSyncActive())
    }

    private fun createSyncManager(observer: FakeSyncStatusObserver): WorkManagerSyncManager =
        WorkManagerSyncManager(
            testContext,
            SyncConfig(supportedEngines = setOf(SyncEngine.Tabs), periodicSyncConfig = null),
        ).apply {
            registerSyncStatusObserver(observer)
            start()
        }
}
