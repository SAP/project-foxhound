/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.session.storage

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.TabGroupAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabGroup
import mozilla.components.browser.state.state.TabPartition
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.support.test.any
import mozilla.components.support.test.eq
import mozilla.components.support.test.mock
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoMoreInteractions
import org.mockito.Mockito.`when`
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class AutoSaveTest {

    private val testDispatcher = StandardTestDispatcher()
    private val scope = CoroutineScope(testDispatcher)

    @Test
    fun `AutoSave - when going to background`() {
        runTest(testDispatcher) {
            // Keep the "owner" in scope to avoid it getting garbage collected and therefore lifecycle events
            // not getting propagated (See #1428).
            val owner = mock(LifecycleOwner::class.java)
            val lifecycle = LifecycleRegistry(owner)

            val sessionStorage: SessionStorage = mock()

            val state = BrowserState()
            val store = BrowserStore(state)
            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenGoingToBackground(lifecycle)

            verifyNoMoreInteractions(sessionStorage)

            lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
            lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_START)
            lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
            lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)

            verifyNoMoreInteractions(sessionStorage)

            lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_STOP)

            autoSave.saveJob!!.join()

            verify(sessionStorage).save(state)
        }
    }

    @Test
    fun `AutoSave - when tab gets added`() {
        runTest(testDispatcher) {
            val state = BrowserState()
            val store = BrowserStore(state)

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(
                TabListAction.AddTabAction(
                    createTab("https://www.mozilla.org"),
                ),
            )

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when tab gets removed`() {
        runTest(testDispatcher) {
            val sessionStorage: SessionStorage = mock()

            val store = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab("https://www.mozilla.org", id = "mozilla"),
                        createTab("https://www.firefox.com", id = "firefox"),
                    ),
                    selectedTabId = "mozilla",
                ),
            )

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(TabListAction.RemoveTabAction("mozilla"))

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when all tabs get removed`() {
        runTest(testDispatcher) {
            val store = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab("https://www.firefox.com", id = "firefox"),
                        createTab("https://www.mozilla.org", id = "mozilla"),
                    ),
                    selectedTabId = "mozilla",
                ),
            )

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(TabListAction.RemoveAllNormalTabsAction)

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when no tabs are left`() {
        runTest(testDispatcher) {
            val store = BrowserStore(
                BrowserState(
                    tabs = listOf(createTab("https://www.firefox.com", id = "firefox")),
                    selectedTabId = "firefox",
                ),
            )

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(TabListAction.RemoveTabAction("firefox"))
            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when tab gets selected`() {
        runTest(testDispatcher) {
            val store = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab("https://www.firefox.com", id = "firefox"),
                        createTab("https://www.mozilla.org", id = "mozilla"),
                    ),
                    selectedTabId = "firefox",
                ),
            )

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(TabListAction.SelectTabAction("mozilla"))

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when tab loading state changes`() {
        runTest(testDispatcher) {
            val sessionStorage: SessionStorage = mock()

            val store = BrowserStore(
                BrowserState(
                    tabs = listOf(
                        createTab("https://www.mozilla.org", id = "mozilla"),
                    ),
                    selectedTabId = "mozilla",
                ),
            )

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            store.dispatch(
                ContentAction.UpdateLoadingStateAction(
                    sessionId = "mozilla",
                    loading = true,
                ),
            )

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(
                ContentAction.UpdateLoadingStateAction(
                    sessionId = "mozilla",
                    loading = false,
                ),
            )

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when tab partition gets added`() {
        runTest(testDispatcher) {
            val state = BrowserState()
            val store = BrowserStore(state)

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(
                TabGroupAction.AddTabGroupAction(
                    partition = "partition",
                    group = TabGroup(id = "group", name = "Group", tabIds = emptySet()),
                ),
            )

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when tab partition gets removed`() {
        runTest(testDispatcher) {
            val state = BrowserState(
                tabPartitions = mapOf(
                    "partition" to TabPartition(
                        id = "partition",
                        tabGroups = listOf(TabGroup(id = "group", name = "Group")),
                    ),
                ),
            )
            val store = BrowserStore(state)

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(
                TabGroupAction.RemoveTabGroupAction(
                    partition = "partition",
                    group = "group",
                ),
            )

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - when tab group in partition gets updated`() {
        runTest(testDispatcher) {
            val state = BrowserState(
                tabs = listOf(
                    createTab("https://www.mozilla.org", id = "mozilla"),
                ),
                tabPartitions = mapOf(
                    "partition" to TabPartition(
                        id = "partition",
                        tabGroups = listOf(TabGroup("group", "Group")),
                    ),
                ),
            )
            val store = BrowserStore(state)

            val sessionStorage: SessionStorage = mock()

            val autoSave = AutoSave(
                store = store,
                sessionStorage = sessionStorage,
                minimumIntervalMs = 0,
            ).whenSessionsChange(scope)

            testDispatcher.scheduler.advanceUntilIdle()

            assertNull(autoSave.saveJob)
            verify(sessionStorage, never()).save(any())

            store.dispatch(
                TabGroupAction.AddTabAction(
                    partition = "partition",
                    group = "group",
                    tabId = "mozilla",
                ),
            )

            testDispatcher.scheduler.advanceUntilIdle()

            autoSave.saveJob?.join()

            verify(sessionStorage).save(any())
        }
    }

    @Test
    fun `AutoSave - periodically in foreground`() {
        val engine: Engine = mock()
        val scheduler: ScheduledExecutorService = mock()
        val scheduledFuture = mock(ScheduledFuture::class.java)
        `when`(
            scheduler.scheduleAtFixedRate(
                any(),
                eq(300L),
                eq(300L),
                eq(TimeUnit.SECONDS),
            ),
        ).thenReturn(scheduledFuture)

        // LifecycleRegistry only keeps a weak reference to the owner, so it is important to keep
        // a reference here too during the test run.
        // See https://github.com/mozilla-mobile/android-components/issues/5166
        val owner = mock(LifecycleOwner::class.java)
        val lifecycle = LifecycleRegistry(owner)

        val state = BrowserState()
        val store = BrowserStore(state)
        val storage = SessionStorage(testContext, engine)
        storage.autoSave(store)
            .periodicallyInForeground(300, TimeUnit.SECONDS, scheduler, lifecycle)

        verifyNoMoreInteractions(scheduler)

        lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_START)

        verify(scheduler).scheduleAtFixedRate(
            any(),
            eq(300L),
            eq(300L),
            eq(TimeUnit.SECONDS),
        )

        verifyNoMoreInteractions(scheduler)

        lifecycle.handleLifecycleEvent(Lifecycle.Event.ON_STOP)

        verify(scheduledFuture).cancel(false)
    }

    @Test
    fun `AutoSave - No new job triggered while save in flight`() {
        val sessionStorage: SessionStorage = mock()

        val state = BrowserState()
        val store = BrowserStore(state)
        val autoSave = AutoSave(
            store = store,
            sessionStorage = sessionStorage,
            minimumIntervalMs = 0,
        )

        val runningJob: Job = mock()
        doReturn(true).`when`(runningJob).isActive

        val saveJob = autoSave.triggerSave()
        assertSame(saveJob, saveJob)
    }

    @Test
    fun `AutoSave - New job triggered if current job is done`() {
        val sessionStorage: SessionStorage = mock()

        val state = BrowserState()
        val store = BrowserStore(state)
        val autoSave = AutoSave(
            store = store,
            sessionStorage = sessionStorage,
            minimumIntervalMs = 0,
        )

        val completed: Job = mock()
        doReturn(false).`when`(completed).isActive

        val saveJob = autoSave.triggerSave()
        assertNotSame(completed, saveJob)
    }
}
