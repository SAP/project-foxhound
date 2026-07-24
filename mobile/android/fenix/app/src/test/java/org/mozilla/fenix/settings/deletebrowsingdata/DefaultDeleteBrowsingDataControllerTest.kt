/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.deletebrowsingdata

import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withContext
import mozilla.components.browser.state.action.EngineAction
import mozilla.components.browser.state.action.RecentlyClosedAction
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.translate.ModelManagementOptions
import mozilla.components.concept.engine.translate.ModelOperation
import mozilla.components.concept.engine.translate.OperationLevel
import mozilla.components.concept.storage.HistoryStorage
import mozilla.components.feature.downloads.DownloadsUseCases
import mozilla.components.feature.tabs.TabsUseCases
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.PermissionStorage
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.utils.Settings

class DefaultDeleteBrowsingDataControllerTest {

    val testDispatcher = StandardTestDispatcher()

    private val removeAllTabs: TabsUseCases.RemoveAllTabsUseCase = mockk(relaxed = true)
    private val removeAllDownloads: DownloadsUseCases.RemoveAllDownloadsUseCase = mockk(relaxed = true)
    private val historyStorage: HistoryStorage = mockk(relaxed = true)
    private val permissionStorage: PermissionStorage = mockk(relaxed = true)
    private val store = BrowserStore()
    private val engine: Engine = mockk(relaxed = true)
    private val appStore: AppStore = mockk(relaxed = true)
    private val settings: Settings = mockk(relaxed = true)

    private lateinit var controller: DefaultDeleteBrowsingDataController

    @Before
    fun setup() {
        controller = spyk(
            DefaultDeleteBrowsingDataController(
                deleteDataUseCases = DefaultDeleteBrowsingDataController.DeleteDataUseCases(
                    removeAllTabs = removeAllTabs,
                    removeAllDownloads = removeAllDownloads,
                ),
                dataStorage = DefaultDeleteBrowsingDataController.DataStorage(
                    history = historyStorage,
                    permissions = permissionStorage,
                ),
                stores = DefaultDeleteBrowsingDataController.Stores(
                    appStore = appStore,
                    browserStore = store,
                ),
                engine = engine,
                settings = settings,
                coroutineContext = testDispatcher,
            ),
        )
    }

    @Test
    fun deleteTabs() = runTest(testDispatcher) {
        controller.deleteTabs()

        verify {
            removeAllTabs.invoke(false)
        }
    }

    @Test
    fun deleteBrowsingHistory() = runTest(testDispatcher) {
        controller.deleteBrowsingHistory()

        coVerify {
            historyStorage.deleteEverything()
            store.dispatch(EngineAction.PurgeHistoryAction)
            store.dispatch(RecentlyClosedAction.RemoveAllClosedTabAction)
        }
    }

    @Test
    fun deleteCookiesAndSiteData() = runTest(testDispatcher) {
        controller.deleteCookiesAndSiteData()

        verify {
            engine.clearData(
                Engine.BrowsingData.select(
                    Engine.BrowsingData.COOKIES,
                    Engine.BrowsingData.AUTH_SESSIONS,
                ),
            )
            engine.clearData(Engine.BrowsingData.select(Engine.BrowsingData.DOM_STORAGES))
        }
    }

    @Test
    fun deleteCachedFiles() = runTest(testDispatcher) {
        val onSuccessSlot = slot<() -> Unit>()
        val onErrorSlot = slot<(Throwable) -> Unit>()

        every {
            engine.manageTranslationsLanguageModel(
                options = any(),
                onSuccess = capture(onSuccessSlot),
                onError = capture(onErrorSlot),
            )
        } returns Unit

        controller.deleteCachedFiles()

        verify {
            engine.manageTranslationsLanguageModel(
                options = ModelManagementOptions(
                    operation = ModelOperation.DELETE,
                    operationLevel = OperationLevel.CACHE,
                ),
                onSuccess = any(),
                onError = any(),
            )
            engine.clearData(Engine.BrowsingData.select(Engine.BrowsingData.ALL_CACHES))
        }

        assertTrue(onSuccessSlot.isCaptured)
        assertTrue(onErrorSlot.isCaptured)
    }

    @Test
    fun deleteSitePermissions() = runTest(testDispatcher) {
        controller.deleteSitePermissions()

        coVerify {
            engine.clearData(Engine.BrowsingData.select(Engine.BrowsingData.ALL_SITE_SETTINGS))
            permissionStorage.deleteAllSitePermissions()
        }
    }

    @Test
    fun deleteDownloads() = runTest(testDispatcher) {
        controller.deleteDownloads()

        verify {
            removeAllDownloads.invoke()
        }
    }

    @Test
    fun `clearBrowsingDataOnQuit - when no data types are selected - completes immediately`() = runTest(testDispatcher) {
        val onDeletionComplete: () -> Unit = mockk(relaxed = true)

        every { settings.getDeleteDataOnQuit(any()) } returns false // No types are selected

        controller.clearBrowsingDataOnQuit(onDeletionComplete)

        coVerify(exactly = 0) { appStore.dispatch(any()) }
        coVerify(exactly = 0) { controller.deleteType(any()) }

        verify { onDeletionComplete.invoke() }
    }

    @Test
    fun `clearBrowsingDataOnQuit - when one data type is selected - deletes it and completes`() = runTest(testDispatcher) {
        val onDeletionComplete: () -> Unit = mockk(relaxed = true)

        val typeToDelete = DeleteBrowsingDataOnQuitType.TABS

        every { settings.getDeleteDataOnQuit(any()) } returns false // Reset all
        every { settings.getDeleteDataOnQuit(typeToDelete) } returns true // Select one type

        controller.clearBrowsingDataOnQuit(onDeletionComplete)

        coVerify {
            appStore.dispatch(AppAction.DeleteAndQuitStarted)
            controller.deleteType(typeToDelete)
        }

        coVerify(exactly = 1) { controller.deleteType(any()) }
        verify { onDeletionComplete.invoke() }
    }

    @Test
    fun `clearBrowsingDataOnQuit - when multiple data types are selected - deletes all of them`() = runTest(testDispatcher) {
        val onDeletionComplete: () -> Unit = mockk(relaxed = true)

        val typesToDelete = listOf(
            DeleteBrowsingDataOnQuitType.HISTORY,
            DeleteBrowsingDataOnQuitType.COOKIES,
        )

        every { settings.getDeleteDataOnQuit(any()) } returns false // Reset all
        typesToDelete.forEach { type ->
            every { settings.getDeleteDataOnQuit(type) } returns true
        }

        controller.clearBrowsingDataOnQuit(onDeletionComplete)

        coVerify { appStore.dispatch(AppAction.DeleteAndQuitStarted) }
        typesToDelete.forEach { type ->
            coVerify { controller.deleteType(type) }
        }

        coVerify(exactly = typesToDelete.size) { controller.deleteType(any()) }
        verify { onDeletionComplete.invoke() }
    }

    @Test
    fun `clearBrowsingDataOnQuit - onDeletionComplete is called even if one deletion throws an exception`() = runTest(testDispatcher) {
        val onDeletionComplete: () -> Unit = mockk(relaxed = true)

        val failingType = DeleteBrowsingDataOnQuitType.CACHE
        val succeedingType = DeleteBrowsingDataOnQuitType.TABS

        val exceptionHandler = CoroutineExceptionHandler { _, throwable ->
            assertTrue(throwable is RuntimeException)
            assertEquals("Deletion failed!", throwable.message)
        }

        every { settings.getDeleteDataOnQuit(failingType) } returns true
        every { settings.getDeleteDataOnQuit(succeedingType) } returns true

        coEvery { controller.deleteType(failingType) } throws RuntimeException("Deletion failed!")
        coEvery { controller.deleteType(succeedingType) } returns Unit

        withContext(coroutineContext + exceptionHandler) {
            controller.clearBrowsingDataOnQuit(onDeletionComplete)
        }

        coVerify { controller.deleteType(failingType) }
        coVerify { controller.deleteType(succeedingType) }

        verify { onDeletionComplete.invoke() }
    }
}
