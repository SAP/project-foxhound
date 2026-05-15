/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.downloads

import android.app.DownloadManager.EXTRA_DOWNLOAD_ID
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.os.Environment
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.BrowserAction
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.action.DownloadAction
import mozilla.components.browser.state.action.TabListAction
import mozilla.components.browser.state.engine.EngineMiddleware
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.browser.state.state.content.DownloadState.Status.CANCELLED
import mozilla.components.browser.state.state.content.DownloadState.Status.COMPLETED
import mozilla.components.browser.state.state.content.DownloadState.Status.DOWNLOADING
import mozilla.components.browser.state.state.content.DownloadState.Status.FAILED
import mozilla.components.browser.state.state.content.DownloadState.Status.INITIATED
import mozilla.components.browser.state.state.content.DownloadState.Status.PAUSED
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.fetch.Response
import mozilla.components.support.test.any
import mozilla.components.support.test.argumentCaptor
import mozilla.components.support.test.eq
import mozilla.components.support.test.middleware.CaptureActionsMiddleware
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.never
import org.mockito.Mockito.reset
import org.mockito.Mockito.spy
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import java.io.File

@RunWith(AndroidJUnit4::class)
class DownloadMiddlewareTest {
    private val dispatcher = StandardTestDispatcher()

    @Test
    fun `service is started when download is queued`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadMiddleware = spy(
            DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = mock(),
                deleteFileFromStorage = { false },
            ),
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        val download = DownloadState("https://mozilla.org/download", destinationDirectory = "")
        store.dispatch(DownloadAction.AddDownloadAction(download))
        dispatcher.scheduler.advanceUntilIdle()

        val intentCaptor = argumentCaptor<Intent>()
        verify(downloadMiddleware).startForegroundService(intentCaptor.capture())
        assertEquals(download.id, intentCaptor.value.getStringExtra(EXTRA_DOWNLOAD_ID))

        reset(downloadMiddleware)

        // We don't store private downloads in the storage.
        val privateDownload = download.copy(id = "newId", private = true)

        store.dispatch(DownloadAction.AddDownloadAction(privateDownload))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadMiddleware, never()).saveDownload(any(), any())
        verify(downloadMiddleware.downloadStorage, never()).add(privateDownload)
        verify(downloadMiddleware).startForegroundService(intentCaptor.capture())
        assertEquals(privateDownload.id, intentCaptor.value.getStringExtra(EXTRA_DOWNLOAD_ID))
    }

    @Test
    fun `saveDownload do not store private downloads`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadMiddleware = spy(
            DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = mock(),
                deleteFileFromStorage = { false },
            ),
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        val privateDownload = DownloadState("https://mozilla.org/download", private = true)

        store.dispatch(DownloadAction.AddDownloadAction(privateDownload))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadMiddleware.downloadStorage, never()).add(privateDownload)
    }

    @Test
    fun `restarted downloads MUST not be passed to the downloadStorage`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadStorage: DownloadStorage = mock()
        val downloadMiddleware = DownloadMiddleware(
            applicationContext,
            AbstractFetchDownloadService::class.java,
            downloadStorage = downloadStorage,
            coroutineContext = dispatcher,
            deleteFileFromStorage = { false },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        var download = DownloadState("https://mozilla.org/download", destinationDirectory = "")
        store.dispatch(DownloadAction.RestoreDownloadStateAction(download))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage, never()).add(download)

        download = DownloadState("https://mozilla.org/download", destinationDirectory = "")
        store.dispatch(DownloadAction.AddDownloadAction(download))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage).add(download)
    }

    @Test
    fun `previously added downloads MUST be ignored`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadStorage: DownloadStorage = mock()
        val download = DownloadState("https://mozilla.org/download")
        val downloadMiddleware = DownloadMiddleware(
            applicationContext,
            AbstractFetchDownloadService::class.java,
            downloadStorage = downloadStorage,
            coroutineContext = dispatcher,
            deleteFileFromStorage = { false },
        )
        val store = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(download.id to download),
            ),
            middleware = listOf(downloadMiddleware),
        )

        store.dispatch(DownloadAction.AddDownloadAction(download))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage, never()).add(download)
    }

    @Test
    fun `Given a download in the storage and deleteFileFromStorage is true, When RemoveDownloadAction is dispatched, Then it MUST be removed from the storage and the file deleted`() =
        runTest(dispatcher) {
            val applicationContext: Context = mock()
            val contentResolver: ContentResolver = mock()
            doReturn(contentResolver).`when`(applicationContext).contentResolver
            val downloadStorage: DownloadStorage = mock()

            val downloadMiddleware = spy(
                DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                downloadStorage = downloadStorage,
                coroutineContext = dispatcher,
                deleteFileFromStorage = { true },
            ),
            )
            val store = BrowserStore(
                initialState = BrowserState(),
                middleware = listOf(downloadMiddleware),
            )
            val tempFile = File.createTempFile(
                "test",
                "tmp",
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path),
            )

            val download = DownloadState(
                id = "1",
                url = tempFile.toURI().toString(),
                fileName = tempFile.name,
            )

            store.dispatch(DownloadAction.AddDownloadAction(download))
            dispatcher.scheduler.advanceUntilIdle()

            store.dispatch(DownloadAction.RemoveDownloadAction(download.id))
            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadStorage).remove(download)

            verify(downloadMiddleware).deleteMediaFile(eq(contentResolver), eq(tempFile))
        }

    @Test
    fun `Given a download in the storage and deleteFileFromStorage is false, When RemoveDownloadAction is dispatched, Then it MUST be removed from the storage and the file deleted`() =
        runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadStorage: DownloadStorage = mock()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                downloadStorage = downloadStorage,
                coroutineContext = dispatcher,
                deleteFileFromStorage = { false },
            )
            val store = BrowserStore(
                initialState = BrowserState(),
                middleware = listOf(downloadMiddleware),
            )
            val tempFile = File.createTempFile(
                "test",
                "tmp",
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path),
            )

            val download = DownloadState(
                id = "1",
                url = tempFile.toURI().toString(),
                fileName = tempFile.name,
            )

            store.dispatch(DownloadAction.AddDownloadAction(download))
            dispatcher.scheduler.advanceUntilIdle()

            store.dispatch(DownloadAction.RemoveDownloadAction(download.id))
            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadStorage).remove(download)

            assertTrue(File(download.filePath).exists())
        }

    @Test
    fun `RemoveAllDownloadsAction MUST remove all downloads from the storage`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadStorage: DownloadStorage = mock()
        val downloadMiddleware = DownloadMiddleware(
            applicationContext,
            AbstractFetchDownloadService::class.java,
            downloadStorage = downloadStorage,
            coroutineContext = dispatcher,
            deleteFileFromStorage = { false },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        val download = DownloadState("https://mozilla.org/download", destinationDirectory = "")
        store.dispatch(DownloadAction.AddDownloadAction(download))
        dispatcher.scheduler.advanceUntilIdle()

        store.dispatch(DownloadAction.RemoveAllDownloadsAction)
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage).removeAllDownloads()
    }

    @Test
    fun `UpdateDownloadAction MUST update the storage when changes are needed`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadStorage: DownloadStorage = mock()
        val downloadMiddleware = DownloadMiddleware(
            applicationContext,
            AbstractFetchDownloadService::class.java,
            downloadStorage = downloadStorage,
            coroutineContext = dispatcher,
            deleteFileFromStorage = { false },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        val download = DownloadState("https://mozilla.org/download", status = INITIATED)
        store.dispatch(DownloadAction.AddDownloadAction(download))
        dispatcher.scheduler.advanceUntilIdle()

        val downloadInTheStore = store.state.downloads.getValue(download.id)

        assertEquals(download, downloadInTheStore)

        var updatedDownload = download.copy(status = COMPLETED, skipConfirmation = true)
        store.dispatch(DownloadAction.UpdateDownloadAction(updatedDownload))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage).update(updatedDownload)

        // skipConfirmation is value that we are not storing in the storage,
        // changes on it shouldn't trigger an update on the storage.
        updatedDownload = updatedDownload.copy(skipConfirmation = false)
        store.dispatch(DownloadAction.UpdateDownloadAction(updatedDownload))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage, times(1)).update(any())

        // Private downloads are not updated in the storage.
        updatedDownload = updatedDownload.copy(private = true)

        store.dispatch(DownloadAction.UpdateDownloadAction(updatedDownload))
        dispatcher.scheduler.advanceUntilIdle()

        verify(downloadStorage, times(1)).update(any())
    }

    @Test
    fun `RestoreDownloadsState MUST populate the store with items in the storage`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadStorage: DownloadStorage = mock()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                downloadStorage = downloadStorage,
                coroutineContext = dispatcher,
                deleteFileFromStorage = { false },
            )
            val store = BrowserStore(
                initialState = BrowserState(),
                middleware = listOf(downloadMiddleware),
            )

            val tempFile = File.createTempFile(
                "test",
                "tmp",
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path),
            )

            val download = DownloadState(
                id = "1",
                url = tempFile.toURI().toURL().toString(),
                fileName = tempFile.name,
            )

            assertEquals(download.fileName, tempFile.name)
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            assertTrue(store.state.downloads.isEmpty())

            store.dispatch(DownloadAction.RestoreDownloadsStateAction)

            dispatcher.scheduler.advanceUntilIdle()

            assertEquals(download, store.state.downloads.values.first())
            verify(downloadStorage, never()).remove(download)
            tempFile.delete()
        }

    @Test
    fun `private downloads MUST NOT be restored`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadStorage: DownloadStorage = mock()
        val downloadMiddleware = DownloadMiddleware(
            applicationContext,
            AbstractFetchDownloadService::class.java,
            downloadStorage = downloadStorage,
            coroutineContext = dispatcher,
            deleteFileFromStorage = { false },
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        val download = DownloadState("https://mozilla.org/download", private = true)
        whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

        assertTrue(store.state.downloads.isEmpty())

        store.dispatch(DownloadAction.RestoreDownloadsStateAction)

        dispatcher.scheduler.advanceUntilIdle()

        assertTrue(store.state.downloads.isEmpty())
    }

    @Test
    fun `sendDownloadIntent MUST call startForegroundService WHEN downloads are NOT COMPLETED, CANCELLED and FAILED`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    deleteFileFromStorage = { false },
                ),
            )

            val ignoredStatus = listOf(COMPLETED, CANCELLED, FAILED)
            ignoredStatus.forEach { status ->
                val download = DownloadState("https://mozilla.org/download", status = status)
                downloadMiddleware.sendDownloadIntent(download)
                verify(downloadMiddleware, times(0)).startForegroundService(any())
            }

            reset(downloadMiddleware)

            val allowedStatus = DownloadState.Status.entries.filter { it !in ignoredStatus }

            allowedStatus.forEachIndexed { index, status ->
                val download = DownloadState("https://mozilla.org/download", status = status)
                downloadMiddleware.sendDownloadIntent(download)
                verify(downloadMiddleware, times(index + 1)).startForegroundService(any())
            }
        }

    @Test
    fun `WHEN RemoveAllTabsAction and RemoveAllPrivateTabsAction are received THEN removePrivateNotifications must be called`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val store = BrowserStore(
                initialState = BrowserState(),
                middleware = listOf(downloadMiddleware),
            )

            val actions = listOf(TabListAction.RemoveAllTabsAction(), TabListAction.RemoveAllPrivateTabsAction)

            actions.forEach {
                store.dispatch(it)

                dispatcher.scheduler.advanceUntilIdle()

                verify(downloadMiddleware, times(1)).removePrivateNotifications(any())
                reset(downloadMiddleware)
            }
        }

    @Test
    fun `WHEN RemoveTabsAction is received AND there is no private tabs THEN removePrivateNotifications MUST be called`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val store = BrowserStore(
                initialState = BrowserState(
                    tabs = listOf(
                        createTab("https://www.mozilla.org", id = "test-tab1"),
                        createTab("https://www.firefox.com", id = "test-tab2"),
                        createTab("https://www.wikipedia.com", private = true, id = "test-tab3"),
                    ),
                ),
                middleware = listOf(downloadMiddleware),
            )

            store.dispatch(TabListAction.RemoveTabsAction(listOf("test-tab1", "test-tab3")))

            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadMiddleware, times(1)).removePrivateNotifications(any())
            reset(downloadMiddleware)
        }

    @Test
    fun `WHEN RemoveTabsAction is received AND there is a private tab THEN removePrivateNotifications MUST NOT be called`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val store = BrowserStore(
                initialState = BrowserState(
                    tabs = listOf(
                        createTab("https://www.mozilla.org", id = "test-tab1"),
                        createTab("https://www.firefox.com", id = "test-tab2"),
                        createTab("https://www.wikipedia.com", private = true, id = "test-tab3"),
                    ),
                ),
                middleware = listOf(downloadMiddleware),
            )

            store.dispatch(TabListAction.RemoveTabsAction(listOf("test-tab1", "test-tab2")))

            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadMiddleware, times(0)).removePrivateNotifications(any())
            reset(downloadMiddleware)
        }

    @Test
    fun `WHEN RemoveTabAction is received AND there is no private tabs THEN removePrivateNotifications MUST be called`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val store = BrowserStore(
                initialState = BrowserState(
                    tabs = listOf(
                        createTab("https://www.mozilla.org", id = "test-tab1"),
                        createTab("https://www.firefox.com", id = "test-tab2"),
                        createTab("https://www.wikipedia.com", private = true, id = "test-tab3"),
                    ),
                ),
                middleware = listOf(downloadMiddleware),
            )

            store.dispatch(TabListAction.RemoveTabAction("test-tab3"))

            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadMiddleware, times(1)).removePrivateNotifications(any())
        }

    @Test
    fun `WHEN RemoveTabAction is received AND there is a private tab THEN removePrivateNotifications MUST NOT be called`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val store = BrowserStore(
                initialState = BrowserState(
                    tabs = listOf(
                        createTab("https://www.mozilla.org", id = "test-tab1"),
                        createTab("https://www.firefox.com", private = true, id = "test-tab2"),
                        createTab("https://www.wikipedia.com", private = true, id = "test-tab3"),
                    ),
                ),
                middleware = listOf(downloadMiddleware),
            )

            store.dispatch(TabListAction.RemoveTabAction("test-tab3"))

            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadMiddleware, times(0)).removePrivateNotifications(any())
        }

    @Test
    fun `WHEN removeStatusBarNotification is called THEN an ACTION_REMOVE_PRIVATE_DOWNLOAD intent must be created`() = runTest(dispatcher) {
        val applicationContext: Context = mock()
        val downloadMiddleware = spy(
            DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = mock(),
                deleteFileFromStorage = { false },
            ),
        )
        val download = DownloadState("https://mozilla.org/download", notificationId = 100)
        val captureActionsMiddleware = CaptureActionsMiddleware<BrowserState, BrowserAction>()
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(captureActionsMiddleware) + EngineMiddleware.create(
                engine = mock(),
                this,
            ),
        )

        downloadMiddleware.removeStatusBarNotification(store, download)

        captureActionsMiddleware.assertFirstAction(DownloadAction.DismissDownloadNotificationAction::class) { action ->
            assertEquals(download.id, action.downloadId)
        }

        verify(applicationContext, times(1)).startService(any())
    }

    @Test
    fun `WHEN removePrivateNotifications is called THEN removeStatusBarNotification will be called only for private download`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val download = DownloadState("https://mozilla.org/download", notificationId = 100)
            val privateDownload = DownloadState("https://mozilla.org/download", notificationId = 100, private = true)
            val store = BrowserStore(
                initialState = BrowserState(downloads = mapOf(download.id to download, privateDownload.id to privateDownload)),
                middleware = listOf(downloadMiddleware),
            )

            downloadMiddleware.removePrivateNotifications(store)

            verify(downloadMiddleware, times(1)).removeStatusBarNotification(store, privateDownload)
        }

    @Test
    fun `WHEN removePrivateNotifications is called THEN removeStatusBarNotification will be called for all private downloads`() = runTest(dispatcher) {
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val download = DownloadState("https://mozilla.org/download", notificationId = 100, sessionId = "tab1")
            val privateDownload = DownloadState("https://mozilla.org/download", notificationId = 100, private = true, sessionId = "tab2")
            val anotherPrivateDownload = DownloadState("https://mozilla.org/download", notificationId = 100, private = true, sessionId = "tab3")
            val store = BrowserStore(
                initialState = BrowserState(
                    downloads = mapOf(download.id to download, privateDownload.id to privateDownload, anotherPrivateDownload.id to anotherPrivateDownload),
                ),
                middleware = listOf(downloadMiddleware),
            )

            downloadMiddleware.removePrivateNotifications(store)

            verify(downloadMiddleware, times(2)).removeStatusBarNotification(any(), any())
        }

    @Test
    fun `WHEN an action for canceling a download response is received THEN a download response must be canceled`() = runTest(dispatcher) {
            val response = mock<Response>()
            val download = DownloadState(id = "downloadID", url = "example.com/5MB.zip", response = response)
            val applicationContext: Context = mock()
            val downloadMiddleware = spy(
                DownloadMiddleware(
                    applicationContext,
                    AbstractFetchDownloadService::class.java,
                    coroutineContext = dispatcher,
                    downloadStorage = mock(),
                    deleteFileFromStorage = { false },
                ),
            )
            val store = BrowserStore(
                initialState = BrowserState(),
                middleware = listOf(downloadMiddleware),
            )

            val tab = createTab("https://www.mozilla.org")

            store.dispatch(TabListAction.AddTabAction(tab, select = true))
            store.dispatch(ContentAction.UpdateDownloadAction(tab.id, download = download))
            store.dispatch(ContentAction.CancelDownloadAction(tab.id, download.id))

            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadMiddleware, times(1)).closeDownloadResponse(any(), any())
            verify(response).close()
        }

    @Test
    fun `WHEN closing a download response THEN the response object must be closed`() {
        val applicationContext: Context = mock()
        val downloadMiddleware = spy(
            DownloadMiddleware(
                applicationContext,
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = mock(),
                deleteFileFromStorage = { false },
            ),
        )
        val store = BrowserStore(
            initialState = BrowserState(),
            middleware = listOf(downloadMiddleware),
        )

        val tab = createTab("https://www.mozilla.org")
        val response = mock<Response>()
        val download = DownloadState(url = "https://www.mozilla.org/file.txt", sessionId = tab.id, response = response)

        store.dispatch(TabListAction.AddTabAction(tab, select = true))
        store.dispatch(ContentAction.UpdateDownloadAction(tab.id, download = download))

        downloadMiddleware.closeDownloadResponse(store, tab.id)
        verify(response).close()
    }

    @Test
    fun `when restoring downloads, if the file is deleted, the download is deleted`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
                )
            val store = BrowserStore(
                initialState = BrowserState(),
                middleware = listOf(downloadMiddleware),
            )

            val tempFile = File.createTempFile(
                "test",
                "tmp",
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path),
            )
            val download = DownloadState(
                id = "1",
                url = tempFile.toURI().toURL().toString(),
                fileName = tempFile.name,
            )
            assertEquals(download.filePath, tempFile.path)
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            assertTrue(store.state.downloads.isEmpty())
            tempFile.delete()

            store.dispatch(DownloadAction.RestoreDownloadsStateAction)

            dispatcher.scheduler.advanceUntilIdle()

            verify(downloadStorage).remove(download)
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on a completed file that doesn't exist THEN the download is deleted and browser state is updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val download = DownloadState(
                id = "1",
                url = "test.tmp",
                fileName = "test.tmp",
                status = COMPLETED,
            )
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf())
            assertEquals(expected, store.state)
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on a file that exists THEN the download is not deleted and browser state is not updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val tempFile = File.createTempFile(
                "test",
                "tmp",
                File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).path),
            )
            val download = DownloadState(
                id = "1",
                url = tempFile.toURI().toURL().toString(),
                fileName = tempFile.name,
                status = COMPLETED,
            )
            assertEquals(download.filePath, tempFile.path)
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf(download.id to download))
            assertEquals(expected, store.state)

            tempFile.delete()
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on an in progress download and the file doesn't exist THEN the download is not deleted and browser state is not updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val download = DownloadState(
                id = "1",
                url = "test.tmp",
                fileName = "test.tmp",
                status = DOWNLOADING,
            )
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf(download.id to download))
            assertEquals(expected, store.state)
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on an initiated download, where the file doesn't exist, THEN the download is not deleted and browser state is not updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val download = DownloadState(
                id = "1",
                url = "test.tmp",
                fileName = "test.tmp",
                status = INITIATED,
            )
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf(download.id to download))
            assertEquals(expected, store.state)
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on a failed download, where the file doesn't exist, THEN the download is not deleted and browser state is not updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val download = DownloadState(
                id = "1",
                url = "test.tmp",
                fileName = "test.tmp",
                status = FAILED,
            )
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf(download.id to download))
            assertEquals(expected, store.state)
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on a paused download and the file doesn't exist THEN the download is not deleted and browser state is not updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val download = DownloadState(
                id = "1",
                url = "test.tmp",
                fileName = "test.tmp",
                status = PAUSED,
            )
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf(download.id to download))
            assertEquals(expected, store.state)
        }

    @Test
    fun `WHEN RemoveDeletedDownloads is called on a cancelled download, where the file doesn't exist, THEN the download is deleted and browser state is updated`() =
        runTest(dispatcher) {
            val downloadStorage = mock<DownloadStorage>()
            val downloadMiddleware = DownloadMiddleware(
                applicationContext = mock(),
                AbstractFetchDownloadService::class.java,
                coroutineContext = dispatcher,
                downloadStorage = downloadStorage,
                deleteFileFromStorage = { false },
            )

            val download = DownloadState(
                id = "1",
                url = "test.tmp",
                fileName = "test.tmp",
                status = CANCELLED,
            )
            whenever(downloadStorage.getDownloadsList()).thenReturn(listOf(download))

            val initialState = BrowserState(downloads = mapOf(download.id to download))
            val store = BrowserStore(
                initialState = initialState,
                middleware = listOf(downloadMiddleware),
            )

            assertTrue(store.state.downloads.isNotEmpty())

            store.dispatch(DownloadAction.RemoveDeletedDownloads)

            dispatcher.scheduler.advanceUntilIdle()

            val expected = BrowserState(downloads = mapOf())
            assertEquals(expected, store.state)
        }
}
