/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.downloads.listscreen.store

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.content.DownloadState
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.feature.downloads.DownloadsUseCases
import mozilla.components.lib.publicsuffixlist.PublicSuffixList
import mozilla.components.lib.state.Store
import mozilla.components.support.utils.FakeDateTimeProvider
import mozilla.components.support.utils.FakeDownloadFileUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.mozilla.fenix.downloads.listscreen.middleware.DownloadDeleteMiddleware
import org.mozilla.fenix.downloads.listscreen.middleware.DownloadUIMapperMiddleware
import org.mozilla.fenix.downloads.listscreen.middleware.DownloadUIRenameMiddleware
import org.mozilla.fenix.downloads.listscreen.middleware.FakeFileItemDescriptionProvider
import org.mozilla.fenix.utils.Settings.DeleteDownloadBehavior
import java.io.File
import java.nio.file.Files
import java.time.LocalDate
import java.time.ZoneId
import kotlin.test.assertTrue
import kotlin.time.Duration.Companion.milliseconds

class DownloadUIStoreTest {

    @Rule @JvmField
    val folder = TemporaryFolder()

    private val testDispatcher = StandardTestDispatcher()
    private val testScope = TestScope(testDispatcher)

    private val fakeFileItemDescriptionProvider = FakeFileItemDescriptionProvider()
    private val today = LocalDate.of(2025, 5, 31)
    private val older = LocalDate.of(2025, 4, 20)
    private val fakeDateTimeProvider = FakeDateTimeProvider(today)
    private val zoneId = fakeDateTimeProvider.currentZoneId()
    private var publicSuffixList: PublicSuffixList = mockk()

    private val testDelay = 100L

    private val fileItem1 = FileItem(
        id = "1",
        url = "https://www.mozilla.com",
        fileName = "1.pdf",
        filePath = "downloads/1.pdf",
        description = "Completed",
        contentType = "application/pdf",
        directoryPath = "downloads",
        displayedShortUrl = "mozilla.com",
        status = FileItem.Status.Completed,
        timeCategory = TimeCategory.TODAY,
    )
    private val downloadState1 = DownloadState(
        id = "1",
        url = "https://www.mozilla.com",
        createdTime = today.toEpochMilli(zoneId),
        fileName = "1.pdf",
        status = DownloadState.Status.COMPLETED,
        contentLength = 77,
        directoryPath = "downloads",
        contentType = "application/pdf",
    )

    private val fileItem2 = FileItem(
        id = "2",
        url = "https://www.mozilla.com",
        fileName = "title",
        filePath = "downloads/title",
        description = "Completed",
        displayedShortUrl = "mozilla.com",
        directoryPath = "downloads",
        contentType = "jpg",
        status = FileItem.Status.Completed,
        timeCategory = TimeCategory.OLDER,
    )

    private val downloadState2 = DownloadState(
        id = "2",
        url = "https://www.mozilla.com",
        createdTime = older.toEpochMilli(zoneId),
        fileName = "title",
        status = DownloadState.Status.COMPLETED,
        contentLength = 77,
        directoryPath = "downloads",
        contentType = "jpg",
    )

    @Test
    fun exitEditMode() = runTest(testDispatcher) {
        val initialState = oneItemEditState()
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.ExitEditMode)
        assertNotSame(initialState, store.state)
        assertEquals(store.state.mode, DownloadUIState.Mode.Normal)
    }

    @Test
    fun itemAddedForRemoval() = runTest(testDispatcher) {
        val initialState = emptyDefaultState()
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.AddItemForRemoval(fileItem2))
        assertNotSame(initialState, store.state)
        assertEquals(
            store.state.mode,
            DownloadUIState.Mode.Editing(setOf(fileItem2)),
        )
    }

    @Test
    fun `WHEN all items are visible and all items are selected for removal THEN all completed download items are selected`() = runTest(testDispatcher) {
        val inProgressFileItem = fileItem(status = FileItem.Status.Downloading(progress = 0.5f))
        val pausedFileItem = fileItem(status = FileItem.Status.Paused(progress = 0.5f))
        val failedFileItem = fileItem(status = FileItem.Status.Failed)
        val initiatedFileItem = fileItem(status = FileItem.Status.Initiated)

        val initialState = DownloadUIState(
            items = listOf(
                fileItem1,
                fileItem2,
                inProgressFileItem,
                pausedFileItem,
                failedFileItem,
                initiatedFileItem,
            ),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.AddAllItemsForRemoval)

        val expected = DownloadUIState(
            items = listOf(
                fileItem1,
                fileItem2,
                inProgressFileItem,
                pausedFileItem,
                failedFileItem,
                initiatedFileItem,
            ),
            mode = DownloadUIState.Mode.Editing(selectedItems = setOf(fileItem1, fileItem2)),
            pendingDeletionIds = emptySet(),
        )

        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN only filtered items are visible and all items selected for removal THEN only those filtered items are selected`() = runTest(testDispatcher) {
        val image = FileItem(
            id = "1",
            url = "url",
            fileName = "title",
            filePath = "url",
            description = "77 kB",
            displayedShortUrl = "url",
            contentType = "image/jpeg",
            directoryPath = "downloads",
            status = FileItem.Status.Completed,
            timeCategory = TimeCategory.TODAY,
        )

        val document = FileItem(
            id = "2",
            url = "docurl",
            fileName = "doc",
            filePath = "docPath",
            description = "77 kB",
            displayedShortUrl = "url",
            directoryPath = "downloads",
            contentType = "application/pdf",
            status = FileItem.Status.Completed,
            timeCategory = TimeCategory.TODAY,
        )

        val inProgressImage = fileItem(status = FileItem.Status.Downloading(progress = 0.5f))
        val pausedImage = fileItem(status = FileItem.Status.Paused(progress = 0.5f))
        val failedImage = fileItem(status = FileItem.Status.Failed)
        val initiatedImage = fileItem(status = FileItem.Status.Initiated)

        val initialState = DownloadUIState(
            items = listOf(image, document, inProgressImage, pausedImage, failedImage, initiatedImage),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.ContentTypeSelected(FileItem.ContentTypeFilter.Image))
        store.dispatch(DownloadUIAction.AddAllItemsForRemoval)

        val expected = DownloadUIState(
            items = listOf(image, document, inProgressImage, pausedImage, failedImage, initiatedImage),
            mode = DownloadUIState.Mode.Editing(setOf(image)),
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.Image,
            searchQuery = "",
        )

        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN items are filtered by content type and search and all items selected for removal THEN only those filtered items are selected`() = runTest(testDispatcher) {
        val image1 = FileItem(
            id = "1",
            url = "url",
            fileName = "title",
            filePath = "filePath",
            description = "77",
            displayedShortUrl = "url",
            contentType = "image/jpeg",
            directoryPath = "downloads",
            status = FileItem.Status.Completed,
            timeCategory = TimeCategory.TODAY,
        )

        val image2 = FileItem(
            id = "2",
            url = "image2",
            fileName = "image2",
            filePath = "filePath2",
            description = "1234",
            displayedShortUrl = "image2",
            contentType = "image/jpg",
            directoryPath = "downloads",
            status = FileItem.Status.Completed,
            timeCategory = TimeCategory.TODAY,
        )

        val document = FileItem(
            id = "3",
            url = "docurl",
            fileName = "doc",
            filePath = "docPath",
            description = "77",
            displayedShortUrl = "url",
            directoryPath = "downloads",
            contentType = "application/pdf",
            status = FileItem.Status.Completed,
            timeCategory = TimeCategory.TODAY,
        )

        val inProgressImage = fileItem(status = FileItem.Status.Downloading(progress = 0.5f))
        val pausedImage = fileItem(status = FileItem.Status.Paused(progress = 0.5f))
        val failedImage = fileItem(status = FileItem.Status.Failed)
        val initiatedImage = fileItem(status = FileItem.Status.Initiated)

        val initialState = DownloadUIState(
            items = listOf(image1, image2, document, inProgressImage, pausedImage, failedImage, initiatedImage),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.ContentTypeSelected(FileItem.ContentTypeFilter.Image))
        store.dispatch(DownloadUIAction.SearchQueryEntered("url"))
        store.dispatch(DownloadUIAction.AddAllItemsForRemoval)

        val expected = DownloadUIState(
            items = listOf(image1, image2, document, inProgressImage, pausedImage, failedImage, initiatedImage),
            mode = DownloadUIState.Mode.Editing(setOf(image1)),
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.Image,
            searchQuery = "url",
        )

        assertEquals(expected, store.state)
    }

    @Test
    fun removeItemForRemoval() = runTest(testDispatcher) {
        val initialState = twoItemEditState()
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.RemoveItemForRemoval(fileItem2))
        assertNotSame(initialState, store.state)
        assertEquals(store.state.mode, DownloadUIState.Mode.Editing(setOf(fileItem1)))
    }

    @Test
    fun shareUrlClicked() = runTest(testDispatcher) {
        val initialState = oneItemDefaultState()
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.ShareUrlClicked(fileItem1.url))
        assertSame(initialState, store.state)
    }

    @Test
    fun shareFileClicked() = runTest(testDispatcher) {
        val initialState = oneItemDefaultState()
        val store = DownloadUIStore(initialState)

        store.dispatch(
            DownloadUIAction.ShareFileClicked(
            directoryPath = fileItem1.directoryPath,
            fileName = fileItem1.filePath,
            contentType = fileItem1.contentType,
        ),
        )
        assertSame(initialState, store.state)
    }

    @Test
    fun deleteOneElement() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("mozilla.com")

        val store = provideDownloadUIStore(
            initialState = BrowserState(downloads = mapOf("1" to downloadState1)),
            getDeleteBehavior = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
        )

        val deleteItemSet = setOf(fileItem1.id)
        val expectedUIStateBeforeDeleteAction = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = setOf(),
        )

        val expectedUIStateAfterDeleteAction = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = deleteItemSet,
            deletionSnackbarState = DownloadUIState.SnackbarState.UndoDeletion(setOf(fileItem1)),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedUIStateBeforeDeleteAction, store.state)

        store.dispatch(DownloadUIAction.RequestDelete(fileItem1))
        assertEquals(store.state.pendingDeletionIds, deleteItemSet)
        assertEquals(expectedUIStateAfterDeleteAction, store.state)

        testDispatcher.scheduler.advanceTimeBy(testDelay.milliseconds)
        assertEquals(store.state.pendingDeletionIds, deleteItemSet)
        assertEquals(expectedUIStateAfterDeleteAction, store.state)
    }

    @Test
    fun deleteOneElementWithConfirmationDialog() = runTest(testDispatcher) {
        val store = provideDownloadUIStore(
            initialState = BrowserState(downloads = mapOf("1" to downloadState1)),
            getDeleteBehavior = { DeleteDownloadBehavior.ASK_WHEN_DELETING },
        )

        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(DownloadUIAction.RequestDeleteMultiple(setOf(fileItem1)))

        assertEquals(emptySet<String>(), store.state.pendingDeletionIds)
        assertEquals(DownloadUIState.DialogState.DeleteConfirmation(setOf(fileItem1)), store.state.dialogState)

        store.dispatch(DownloadUIAction.AddPendingDeletionSet(setOf(fileItem1), removeFromDisk = true))

        assertEquals(setOf(fileItem1.id), store.state.pendingDeletionIds)
        assertEquals(DownloadUIState.DialogState.None, store.state.dialogState)
        assertEquals(DownloadUIState.Mode.Normal, store.state.mode)
    }

    @Test
    fun deleteMultipleElementsWithConfirmationDialog() = runTest(testDispatcher) {
        val store = provideDownloadUIStore(
            initialState = BrowserState(downloads = mapOf("1" to downloadState1, "2" to downloadState2)),
            getDeleteBehavior = { DeleteDownloadBehavior.ASK_WHEN_DELETING },
        )

        store.dispatch(DownloadUIAction.AddItemForRemoval(fileItem1))
        store.dispatch(DownloadUIAction.AddItemForRemoval(fileItem2))

        val itemsToDelete = setOf(fileItem1, fileItem2)
        store.dispatch(DownloadUIAction.RequestDeleteMultiple(itemsToDelete))
        assertEquals(emptySet<String>(), store.state.pendingDeletionIds)
        assertEquals(DownloadUIState.DialogState.DeleteConfirmation(itemsToDelete), store.state.dialogState)

        store.dispatch(DownloadUIAction.AddPendingDeletionSet(itemsToDelete, removeFromDisk = true))

        assertEquals(setOf(fileItem1.id, fileItem2.id), store.state.pendingDeletionIds)
        assertEquals(DownloadUIState.DialogState.None, store.state.dialogState)
        assertEquals(DownloadUIState.Mode.Normal, store.state.mode)
    }

    @Test
    fun deleteOneElementAndCancelBeforeDelayExpires() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("mozilla.com")

        val store = provideDownloadUIStore(
            initialState = BrowserState(downloads = mapOf("1" to downloadState1)),
            getDeleteBehavior = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
        )

        val deleteItemSet = setOf("1")
        val expectedUIStateBeforeDeleteAction = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
        )

        val expectedUIStateAfterDeleteAction = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = deleteItemSet,
            deletionSnackbarState = DownloadUIState.SnackbarState.UndoDeletion(setOf(fileItem1)),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedUIStateBeforeDeleteAction, store.state)

        store.dispatch(DownloadUIAction.RequestDeleteMultiple(setOf(fileItem1)))
        testDispatcher.scheduler.runCurrent()

        assertEquals(expectedUIStateAfterDeleteAction, store.state)

        store.dispatch(DownloadUIAction.UndoPendingDeletion)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedUIStateBeforeDeleteAction, store.state)

        testDispatcher.scheduler.advanceTimeBy(UNDO_DELAY_PASSED.milliseconds)
        assertEquals(expectedUIStateBeforeDeleteAction, store.state)
    }

    @Test
    fun deleteOneElementAndCancelAfterDelayExpired() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("mozilla.com")

        val store = provideDownloadUIStore(
            initialState = BrowserState(downloads = mapOf("1" to downloadState1)),
            getDeleteBehavior = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
        )

        val expectedUIStateBeforeDeleteAction = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
        )
        val expectedUIStateAfterDeleteActionWithPendingDelete = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = setOf("1"),
            deletionSnackbarState = DownloadUIState.SnackbarState.UndoDeletion(setOf(fileItem1)),
        )

        val expectedUIStateAfterDeleteActionAfterPendingDeleteTimeout = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            deletionSnackbarState = DownloadUIState.SnackbarState.None,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedUIStateBeforeDeleteAction, store.state)

        store.dispatch(DownloadUIAction.RequestDeleteMultiple(setOf(fileItem1)))
        assertEquals(expectedUIStateAfterDeleteActionWithPendingDelete, store.state)

        testDispatcher.scheduler.advanceTimeBy(testDelay.milliseconds)
        store.dispatch(DownloadUIAction.UndoPendingDeletion)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedUIStateAfterDeleteActionAfterPendingDeleteTimeout, store.state)
    }

    @Test
    fun deleteTwoElementsAndCancelTwice() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("mozilla.com")

        val store = provideDownloadUIStore(
            initialState = BrowserState(downloads = mapOf("1" to downloadState1, "2" to downloadState2)),
            getDeleteBehavior = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
        )

        val expectedUIStateBeforeDeleteAction = DownloadUIState(
            items = listOf(fileItem1, fileItem2),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
        )
        val expectedUIStateAfterFirstDeleteAction = DownloadUIState(
            items = listOf(fileItem1, fileItem2),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = setOf("2"),
            deletionSnackbarState = DownloadUIState.SnackbarState.UndoDeletion(setOf(fileItem2)),
        )
        val expectedUIStateAfterSecondDeleteAction = DownloadUIState(
            items = listOf(fileItem1, fileItem2),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = setOf("1", "2"),
            deletionSnackbarState = DownloadUIState.SnackbarState.UndoDeletion(setOf(fileItem1)),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedUIStateBeforeDeleteAction, store.state)

        store.dispatch(DownloadUIAction.RequestDeleteMultiple(setOf(fileItem2)))
        testDispatcher.scheduler.runCurrent()

        assertEquals(expectedUIStateAfterFirstDeleteAction, store.state)

        store.dispatch(DownloadUIAction.RequestDeleteMultiple(setOf(fileItem1)))
        testDispatcher.scheduler.runCurrent()

        assertEquals(expectedUIStateAfterSecondDeleteAction, store.state)

        store.dispatch(DownloadUIAction.UndoPendingDeletion)
        testDispatcher.scheduler.runCurrent()

        assertEquals(expectedUIStateAfterFirstDeleteAction.copy(deletionSnackbarState = DownloadUIState.SnackbarState.None), store.state)

        store.dispatch(DownloadUIAction.UndoPendingDeletion)
        testDispatcher.scheduler.runCurrent()

        assertEquals(expectedUIStateAfterFirstDeleteAction.copy(deletionSnackbarState = DownloadUIState.SnackbarState.None), store.state)
    }

    @Test
    fun `WHEN downloads store is initialised THEN downloads state is updated to be sorted by created time`() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("google.com")

        val fakeDateTimeProvider = FakeDateTimeProvider(LocalDate.of(2025, 5, 31))
        val zoneId = fakeDateTimeProvider.currentZoneId()

        val downloads = mapOf(
            "1" to DownloadState(
                id = "1",
                url = "https://www.google.com",
                createdTime = LocalDate.of(2025, 3, 1).toEpochMilli(zoneId),
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "2" to DownloadState(
                id = "2",
                url = "https://www.google.com",
                createdTime = LocalDate.of(2025, 4, 12).toEpochMilli(zoneId),
                fileName = "2.pdf",
                status = DownloadState.Status.FAILED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "3" to DownloadState(
                id = "3",
                createdTime = LocalDate.of(2025, 5, 31).toEpochMilli(zoneId),
                url = "https://www.google.com",
                fileName = "3.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "text/plain",
            ),
            "4" to DownloadState(
                id = "4",
                createdTime = LocalDate.of(2025, 5, 13).toEpochMilli(zoneId),
                url = "https://www.google.com",
                fileName = "4.pdf",
                status = DownloadState.Status.PAUSED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "5" to DownloadState(
                id = "5",
                createdTime = LocalDate.of(2025, 5, 14).toEpochMilli(zoneId),
                url = "https://www.google.com",
                fileName = "5.pdf",
                status = DownloadState.Status.DOWNLOADING,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "6" to DownloadState(
                id = "6",
                createdTime = LocalDate.of(2025, 5, 15).toEpochMilli(zoneId),
                url = "https://www.google.com",
                fileName = "6.pdf",
                status = DownloadState.Status.INITIATED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
        )

        val browserStore = BrowserStore(
            initialState = BrowserState(downloads = downloads),
        )

        val downloadsStore = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
                    scope = testScope,
                    dateTimeProvider = fakeDateTimeProvider,
                ),
            ),
        )

        val expectedList = DownloadUIState.ItemsState.Items(
            listOf(
                HeaderItem(TimeCategory.IN_PROGRESS),
                FileItem(
                    id = "6",
                    url = "https://www.google.com",
                    fileName = "6.pdf",
                    filePath = "downloads/6.pdf",
                    displayedShortUrl = "google.com",
                    directoryPath = "downloads",
                    contentType = "application/pdf",
                    status = FileItem.Status.Initiated,
                    timeCategory = TimeCategory.IN_PROGRESS,
                    description = "Initiated",
                ),
                FileItem(
                    id = "5",
                    url = "https://www.google.com",
                    fileName = "5.pdf",
                    filePath = "downloads/5.pdf",
                    displayedShortUrl = "google.com",
                    directoryPath = "downloads",
                    contentType = "application/pdf",
                    status = FileItem.Status.Downloading(progress = 0f),
                    timeCategory = TimeCategory.IN_PROGRESS,
                    description = "Downloading",
                ),
                FileItem(
                    id = "4",
                    url = "https://www.google.com",
                    fileName = "4.pdf",
                    filePath = "downloads/4.pdf",
                    displayedShortUrl = "google.com",
                    directoryPath = "downloads",
                    contentType = "application/pdf",
                    status = FileItem.Status.Paused(progress = 0f),
                    timeCategory = TimeCategory.IN_PROGRESS,
                    description = "Paused",
                ),
                FileItem(
                    id = "2",
                    url = "https://www.google.com",
                    fileName = "2.pdf",
                    filePath = "downloads/2.pdf",
                    displayedShortUrl = "google.com",
                    directoryPath = "downloads",
                    contentType = "application/pdf",
                    status = FileItem.Status.Failed,
                    timeCategory = TimeCategory.IN_PROGRESS,
                    description = "Failed",
                ),
                HeaderItem(TimeCategory.TODAY),
                FileItem(
                    id = "3",
                    url = "https://www.google.com",
                    fileName = "3.pdf",
                    filePath = "downloads/3.pdf",
                    description = "Completed",
                    displayedShortUrl = "google.com",
                    contentType = "text/plain",
                    directoryPath = "downloads",
                    status = FileItem.Status.Completed,
                    timeCategory = TimeCategory.TODAY,
                ),
                HeaderItem(TimeCategory.OLDER),
                FileItem(
                    id = "1",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Completed",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    directoryPath = "downloads",
                    status = FileItem.Status.Completed,
                    timeCategory = TimeCategory.OLDER,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedList, downloadsStore.state.itemsState)
    }

    @Test
    fun `GIVEN a download was cancelled WHEN downloading the same file THEN only the downloading download item is displayed`() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("google.com")

        val downloads = mapOf(
            "1" to DownloadState(
                id = "1",
                createdTime = 1,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.CANCELLED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "2" to DownloadState(
                id = "2",
                createdTime = 2,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.DOWNLOADING,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
        )
        val browserStore = BrowserStore(initialState = BrowserState(downloads = downloads))

        val downloadsStore = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
                    scope = testScope,
                ),
            ),
        )
        val expectedList = DownloadUIState.ItemsState.Items(
            listOf(
                HeaderItem(TimeCategory.IN_PROGRESS),
                FileItem(
                    id = "2",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Downloading",
                    directoryPath = "downloads",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Downloading(0f),
                    timeCategory = TimeCategory.IN_PROGRESS,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedList, downloadsStore.state.itemsState)
    }

    @Test
    fun `GIVEN two downloads with identical file name and identical download status WHEN getting itemsState THEN only one download item is displayed`() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("google.com")

        val downloads = mapOf(
            "1" to DownloadState(
                id = "1",
                createdTime = 1,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "2" to DownloadState(
                id = "2",
                createdTime = 2,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
        )
        val browserStore = BrowserStore(initialState = BrowserState(downloads = downloads))

        val downloadsStore = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
                    scope = testScope,
                ),
            ),
        )
        val expectedList = DownloadUIState.ItemsState.Items(
            listOf(
                HeaderItem(TimeCategory.OLDER),
                FileItem(
                    id = "2",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Completed",
                    directoryPath = "downloads",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Completed,
                    timeCategory = TimeCategory.OLDER,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedList, downloadsStore.state.itemsState)
    }

    @Test
    fun `GIVEN two downloads with identical file name and different directory path WHEN getting itemsState THEN both download items should be displayed`() {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("google.com")

        val downloads = mapOf(
            "1" to DownloadState(
                id = "1",
                createdTime = 1,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "2" to DownloadState(
                id = "2",
                createdTime = 2,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads2",
                contentType = "application/pdf",
            ),
        )
        val browserStore = BrowserStore(initialState = BrowserState(downloads = downloads))

        val downloadsStore = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
                    scope = testScope,
                ),
            ),
        )
        val expectedList = DownloadUIState.ItemsState.Items(
            listOf(
                HeaderItem(TimeCategory.OLDER),
                FileItem(
                    id = "2",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads2/1.pdf",
                    description = "Completed",
                    directoryPath = "downloads2",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Completed,
                    timeCategory = TimeCategory.OLDER,
                ),
                FileItem(
                    id = "1",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Completed",
                    directoryPath = "downloads",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Completed,
                    timeCategory = TimeCategory.OLDER,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedList, downloadsStore.state.itemsState)
    }

    @Test
    fun `GIVEN two downloads with the same file name ,directory path and status WHEN getting itemsState THEN the newest download item is displayed`() {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("google.com")

        val downloads = mapOf(
            "1" to DownloadState(
                id = "1",
                createdTime = 1,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "2" to DownloadState(
                id = "2",
                createdTime = 2,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.COMPLETED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
        )
        val browserStore = BrowserStore(initialState = BrowserState(downloads = downloads))

        val downloadsStore = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
                    scope = testScope,
                ),
            ),
        )
        val expectedList = DownloadUIState.ItemsState.Items(
            listOf(
                HeaderItem(TimeCategory.OLDER),
                FileItem(
                    id = "2",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Completed",
                    directoryPath = "downloads",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Completed,
                    timeCategory = TimeCategory.OLDER,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedList, downloadsStore.state.itemsState)
    }

    @Test
    fun `GIVEN two downloads with identical file name and different download status WHEN getting itemsState THEN both download items are displayed`() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("google.com")

        val downloads = mapOf(
            "1" to DownloadState(
                id = "1",
                createdTime = 1,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.FAILED,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
            "2" to DownloadState(
                id = "2",
                createdTime = 2,
                url = "https://www.google.com",
                fileName = "1.pdf",
                status = DownloadState.Status.DOWNLOADING,
                contentLength = 10000,
                directoryPath = "downloads",
                contentType = "application/pdf",
            ),
        )
        val browserStore = BrowserStore(initialState = BrowserState(downloads = downloads))

        val downloadsStore = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
                    scope = testScope,
                ),
            ),
        )
        val expectedList = DownloadUIState.ItemsState.Items(
            listOf(
                HeaderItem(TimeCategory.IN_PROGRESS),
                FileItem(
                    id = "2",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Downloading",
                    directoryPath = "downloads",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Downloading(0f),
                    timeCategory = TimeCategory.IN_PROGRESS,
                ),
                FileItem(
                    id = "1",
                    url = "https://www.google.com",
                    fileName = "1.pdf",
                    filePath = "downloads/1.pdf",
                    description = "Failed",
                    directoryPath = "downloads",
                    displayedShortUrl = "google.com",
                    contentType = "application/pdf",
                    status = FileItem.Status.Failed,
                    timeCategory = TimeCategory.IN_PROGRESS,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedList, downloadsStore.state.itemsState)
    }

    @Test
    fun `WHEN UpdateFileItems action is triggered THEN state is updated and keep the items even if they are listed in pendingDeletionIds`() = runTest(testDispatcher) {
        val downloadUIStore = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = setOf(fileItem1.id),
            ),
        )

        val expectedState = DownloadUIState(
            items = listOf(fileItem1, fileItem2),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = setOf(fileItem1.id),
        )

        downloadUIStore.dispatch(DownloadUIAction.UpdateFileItems(listOf(fileItem1, fileItem2)))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedState, downloadUIStore.state)
    }

    @Test
    fun `WHEN the PauseDownload action is dispatched on a downloading download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.PauseDownload(downloadId = "1"))
        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the ResumeDownload action is dispatched on a paused download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Paused(progress = 0.5f),
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.ResumeDownload(downloadId = "1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the CancelDownload action is dispatched on an initiated download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Initiated,
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.CancelDownload("1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the CancelDownload action is dispatched on a downloading download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.CancelDownload("1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the CancelDownload action is dispatched on a paused download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Paused(progress = 0.5f),
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.CancelDownload("1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the CancelDownload action is dispatched on a failed download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Failed,
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.CancelDownload("1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the RequestDelete action is dispatched on an complete download THEN download is deleted`() =
        runTest(testDispatcher) {
            every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("mozilla.com")
            val removeDownloadUseCases: DownloadsUseCases.RemoveDownloadUseCase = mockk()
            coEvery { removeDownloadUseCases(any(), any()) } returns Unit

            val store = provideDownloadUIStore(
                initialState = BrowserState(downloads = mapOf("1" to downloadState1)),
                removeDownloadUseCases = removeDownloadUseCases,
                getDeleteBehavior = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
            )

            store.dispatch(DownloadUIAction.RequestDelete(fileItem1))

            testDispatcher.scheduler.advanceTimeBy(testDelay.milliseconds)

            testDispatcher.scheduler.advanceUntilIdle()

            coVerify { removeDownloadUseCases("1", true) }
        }

    @Test
    fun `WHEN the RequestDelete action is dispatched on an failed download THEN removeDownloadUseCases is invoked`() =
        runTest(testDispatcher) {
            val removeDownloadUseCases: DownloadsUseCases.RemoveDownloadUseCase = mockk()
            coEvery { removeDownloadUseCases(any(), any()) } returns Unit

            val store = provideDownloadUIStore(
                initialState = BrowserState(downloads = mapOf("1" to downloadState1)),
                removeDownloadUseCases = removeDownloadUseCases,
                getDeleteBehavior = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
            )

            store.dispatch(DownloadUIAction.RequestDelete(fileItem1.copy(status = FileItem.Status.Failed)))

            testDispatcher.scheduler.advanceTimeBy(testDelay.milliseconds)

            verify { removeDownloadUseCases("1", true) }
        }

    @Test
    fun `WHEN the RetryDownload action is dispatched on a failed download THEN the state remains the same`() = runTest(testDispatcher) {
        val fileItems = listOf(
            fileItem(
                id = "1",
                status = FileItem.Status.Failed,
            ),
            fileItem(
                id = "2",
                status = FileItem.Status.Downloading(progress = 0.5f),
            ),
        )

        val initialState = DownloadUIState(
            items = fileItems,
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            userSelectedContentTypeFilter = FileItem.ContentTypeFilter.All,
            searchQuery = "",
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.RetryDownload("1"))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(initialState, store.state)
    }

    @Test
    fun `WHEN the RenameFileClicked action is dispatched THEN fileToRename is set`() = runTest(testDispatcher) {
        val initialState = oneItemDefaultState()
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.RenameFileClicked(fileItem1))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(fileItem1, store.state.fileToRename)
    }

    @Test
    fun `GIVEN InvalidFileName WHEN the RenameFileClicked action is dispatched THEN fileToRename and renameFileError are cleared`() = runTest(testDispatcher) {
        val initialState = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            fileToRename = fileItem1,
            renameFileError = RenameFileError.InvalidFileName,
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.RenameFileDismissed)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(null, store.state.fileToRename)
        assertEquals(null, store.state.renameFileError)
    }

    @Test
    fun `GIVEN the state has a file to rename WHEN RenameFileFailed THEN renameFileError is set and fileToRename remains the same`() = runTest(testDispatcher) {
        val initialState = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            fileToRename = fileItem1,
        )
        val store = DownloadUIStore(initialState)

        val error = RenameFileError.InvalidFileName
        store.dispatch(DownloadUIAction.RenameFileFailed(error))
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(fileItem1, store.state.fileToRename)
        assertEquals(error, store.state.renameFileError)
    }

    @Test
    fun `GIVEN the state has a rename file error WHEN RenameFileFailureDismissed THEN renameFileError is cleared and fileToRename remains the same`() = runTest(testDispatcher) {
        val initialState = DownloadUIState(
            items = listOf(fileItem1),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            fileToRename = fileItem1,
            renameFileError = RenameFileError.CannotRename,
        )
        val store = DownloadUIStore(initialState)

        store.dispatch(DownloadUIAction.RenameFileFailureDismissed)
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(null, store.state.renameFileError)
        assertEquals(fileItem1, store.state.fileToRename)
    }

    @Test
    fun `GIVEN any state WHEN RenameFileConfirmed THEN DownloadUIState is updated with the new file state`() = runTest(testDispatcher) {
        every { publicSuffixList.getPublicSuffixPlusOne(any()) } returns CompletableDeferred("mozilla.com")

        val fileName = "1.pdf"
        val filePath = folder.newFile(fileName).path

        val fileItem = FileItem(
            id = "1",
            url = "https://www.mozilla.com",
            fileName = fileName,
            filePath = filePath,
            description = "Completed",
            contentType = "application/pdf",
            displayedShortUrl = "mozilla.com",
            directoryPath = folder.root.path,
            status = FileItem.Status.Completed,
            timeCategory = TimeCategory.TODAY,
        )
        val downloadState = DownloadState(
            id = "1",
            url = "https://www.mozilla.com",
            createdTime = today.toEpochMilli(zoneId),
            fileName = fileName,
            status = DownloadState.Status.COMPLETED,
            contentLength = 77,
            directoryPath = folder.root.path,
            contentType = "application/pdf",
        )

        val browserStore = BrowserStore(
            initialState = BrowserState(downloads = mapOf(downloadState.id to downloadState)),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                    ),
                DownloadUIMapperMiddleware(
                    browserStore = browserStore,
                    publicSuffixList = publicSuffixList,
                    scope = testScope,
                    fileItemDescriptionProvider = FakeFileItemDescriptionProvider(),
                    dateTimeProvider = fakeDateTimeProvider,
                ),
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        store.dispatch(
            DownloadUIAction.RenameFileConfirmed(
                item = fileItem1,
                newName = "renamed.pdf",
            ),
        )

        val fileItemRenamed = fileItem.copy(
            fileName = "renamed.pdf",
            filePath = "${folder.root.path}/renamed.pdf",
        )
        val expectedState = DownloadUIState(
            items = listOf(fileItemRenamed),
            mode = DownloadUIState.Mode.Normal,
            pendingDeletionIds = emptySet(),
            fileToRename = null,
            renameFileError = null,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(expectedState, store.state)
    }

    @Test
    fun `GIVEN download not found in BrowserStore WHEN RenameFileConfirmed THEN renameFileError is CannotRename`() = runTest(testDispatcher) {
        val browserStore = BrowserStore(
            initialState = BrowserState(downloads = emptyMap()),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.RenameFileConfirmed(
                item = fileItem1,
                newName = "renamed.pdf",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(RenameFileError.CannotRename, store.state.renameFileError)
        assertEquals(fileItem1, store.state.fileToRename)
    }

    @Test
    fun `GIVEN another download with same file name exists WHEN RenameFileConfirmed THEN renameFileError is NameAlreadyExists`() = runTest(testDispatcher) {
        val dirFile = Files.createTempDirectory("downloads-rename").toFile()
        val dirPath = dirFile.absolutePath

        val newName = "title"
        File(dirFile, newName).writeText("conflicting file")

        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        directoryPath = dirPath,
                        fileName = fileItem1.fileName,
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.RenameFileConfirmed(
                item = fileItem1,
                newName = newName,
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(
            RenameFileError.NameAlreadyExists(proposedFileName = newName),
            store.state.renameFileError,
        )
    }

    @Test
    fun `GIVEN file rename succeeds WHEN RenameFileConfirmed THEN BrowserStore updates and rename dialog is dismissed`() = runTest(testDispatcher) {
        val dirFile = Files.createTempDirectory("downloads-rename").toFile()
        val dirPath = dirFile.absolutePath

        val currentName = "1.pdf"
        val newName = "renamed.pdf"

        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        directoryPath = dirPath,
                        fileName = currentName,
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.RenameFileConfirmed(
                item = fileItem1,
                newName = newName,
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(newName, browserStore.state.downloads["1"]?.fileName)

        assertEquals(null, store.state.fileToRename)
        assertEquals(null, store.state.renameFileError)
    }

    @Test
    fun `GIVEN rename dialog shown WHEN proposed extension differs from original THEN change file extension dialog is shown`() = runTest(testDispatcher) {
        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        fileName = "original.pdf",
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1.copy(fileName = "original.pdf"),
                isChangeFileExtensionDialogVisible = false,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.FileExtensionChangedByUser(
                item = store.state.fileToRename!!,
                newName = "original.doc",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertTrue(store.state.isChangeFileExtensionDialogVisible)
    }

    @Test
    fun `GIVEN itemToChangeExtension is already set WHEN FileExtensionChangedByUser THEN change file extension dialog is not shown`() = runTest(testDispatcher) {
        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        fileName = "original.pdf",
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1.copy(fileName = "original.pdf"),
                isChangeFileExtensionDialogVisible = false,
                itemToChangeExtension = fileItem1,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.FileExtensionChangedByUser(
                item = store.state.fileToRename!!,
                newName = "original.doc",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(store.state.isChangeFileExtensionDialogVisible)
    }

    @Test
    fun `GIVEN rename dialog shown WHEN proposed extension changes letter case THEN change file extension dialog is not shown`() = runTest(testDispatcher) {
        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        fileName = "original.pdf",
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1.copy(fileName = "original.pdf"),
                isChangeFileExtensionDialogVisible = false,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.FileExtensionChangedByUser(
                item = store.state.fileToRename!!,
                newName = "new-name.PDF",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(store.state.isChangeFileExtensionDialogVisible)
    }

    @Test
    fun `GIVEN rename dialog shown WHEN proposed extension does not change THEN change file extension dialog is not shown`() = runTest(testDispatcher) {
        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        fileName = "original.pdf",
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1.copy(fileName = "original.pdf"),
                isChangeFileExtensionDialogVisible = false,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.FileExtensionChangedByUser(
                item = store.state.fileToRename!!,
                newName = "original.pdf",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(store.state.isChangeFileExtensionDialogVisible)
    }

    @Test
    fun `GIVEN rename dialog shown WHEN the extension of proposed file name is removed THEN change file extension dialog is not shown`() = runTest(testDispatcher) {
        val browserStore = BrowserStore(
            initialState = BrowserState(
                downloads = mapOf(
                    "1" to downloadState1.copy(
                        fileName = "original.pdf",
                    ),
                ),
            ),
        )

        val store = DownloadUIStore(
            initialState = DownloadUIState(
                items = listOf(fileItem1),
                mode = DownloadUIState.Mode.Normal,
                pendingDeletionIds = emptySet(),
                fileToRename = fileItem1.copy(fileName = "original.pdf"),
                isChangeFileExtensionDialogVisible = false,
            ),
            middleware = listOf(
                DownloadUIRenameMiddleware(
                    browserStore = browserStore,
                    scope = testScope,
                    downloadFileUtils = FakeDownloadFileUtils(),
                    mainDispatcher = testDispatcher,
                ),
            ),
        )

        store.dispatch(
            DownloadUIAction.FileExtensionChangedByUser(
                item = store.state.fileToRename!!,
                newName = "original",
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertFalse(store.state.isChangeFileExtensionDialogVisible)
    }

    @Test
    fun `WHEN RequestDelete is called for a non-completed item THEN CancelDownload is dispatched`() = runTest {
        val removeDownloadUseCase: DownloadsUseCases.RemoveDownloadUseCase = mockk(relaxed = true)
        val itemId = "test_id"

        val middleware = DownloadDeleteMiddleware(
            removeDownloadUseCase = removeDownloadUseCase,
            dispatcher = StandardTestDispatcher(testScheduler),
            deleteBehaviorProvider = { DeleteDownloadBehavior.DELETE_FROM_DEVICE },
        )

        val dispatchedActions = mutableListOf<DownloadUIAction>()
        val store = mockk<Store<DownloadUIState, DownloadUIAction>>(relaxed = true)
        every { store.dispatch(any()) } answers { dispatchedActions.add(firstArg()) }

        middleware.invoke(
            store = store,
            next = { },
            action = DownloadUIAction.RequestDelete(
                item = fileItem1.copy(id = itemId, status = FileItem.Status.Failed),
            ),
        )

        verify { removeDownloadUseCase(itemId, true) }

        val hasCancelAction = dispatchedActions.any {
            it is DownloadUIAction.CancelDownload && it.downloadId == itemId
        }

        assertTrue(hasCancelAction, "Expected CancelDownload action to be dispatched")
    }

    private fun provideDownloadUIStore(
        initialState: BrowserState = BrowserState(),
        browserStore: BrowserStore = BrowserStore(initialState = initialState),
        removeDownloadUseCases: DownloadsUseCases.RemoveDownloadUseCase = DownloadsUseCases.RemoveDownloadUseCase(
            browserStore,
        ),
        getDeleteBehavior: () -> DeleteDownloadBehavior = { DeleteDownloadBehavior.ASK_WHEN_DELETING },
    ): DownloadUIStore {
        val deleteMiddleware = DownloadDeleteMiddleware(
            testDelay,
            removeDownloadUseCases,
            testDispatcher,
            getDeleteBehavior,
        )

        testDispatcher.scheduler.advanceUntilIdle()

        val downloadUIMapperMiddleware = DownloadUIMapperMiddleware(
            browserStore = browserStore,
            publicSuffixList = publicSuffixList,
            fileItemDescriptionProvider = fakeFileItemDescriptionProvider,
            scope = testScope,
            dateTimeProvider = fakeDateTimeProvider,
        )

        return DownloadUIStore(
            initialState = DownloadUIState.INITIAL,
            middleware = listOf(deleteMiddleware, downloadUIMapperMiddleware),
        )
    }

    private fun LocalDate.toEpochMilli(zoneId: ZoneId): Long {
        return atStartOfDay(zoneId).toInstant().toEpochMilli()
    }

    private fun emptyDefaultState(): DownloadUIState = DownloadUIState(
        items = listOf(),
        mode = DownloadUIState.Mode.Normal,
        pendingDeletionIds = emptySet(),
    )

    private fun oneItemEditState(): DownloadUIState = DownloadUIState(
        items = listOf(),
        mode = DownloadUIState.Mode.Editing(setOf(fileItem1)),
        pendingDeletionIds = emptySet(),
    )

    private fun oneItemDefaultState(): DownloadUIState = DownloadUIState(
        items = listOf(fileItem1),
        mode = DownloadUIState.Mode.Normal,
        pendingDeletionIds = emptySet(),
    )

    private fun twoItemEditState(): DownloadUIState = DownloadUIState(
        items = listOf(),
        mode = DownloadUIState.Mode.Editing(setOf(fileItem1, fileItem2)),
        pendingDeletionIds = emptySet(),
    )

    companion object {
        private const val UNDO_DELAY_PASSED = 6000L
    }
}
