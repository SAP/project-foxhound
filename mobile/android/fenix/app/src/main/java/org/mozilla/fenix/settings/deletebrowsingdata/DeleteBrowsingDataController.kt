/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.deletebrowsingdata

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
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
import org.mozilla.fenix.components.AppStore
import org.mozilla.fenix.components.PermissionStorage
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.utils.Settings
import kotlin.coroutines.CoroutineContext

/**
 * A controller responsible for handling the deletion of different categories of browsing data.
 */
interface DeleteBrowsingDataController {
    /**
     * Deletes all open tabs.
     */
    suspend fun deleteTabs()

    /**
     * Deletes browsing history, search history, and recently closed tabs.
     */
    suspend fun deleteBrowsingHistory()

    /**
     * Deletes cookies, active logins, and site data (e.g., localStorage, sessionStorage).
     */
    suspend fun deleteCookiesAndSiteData()

    /**
     * Deletes cached files, including image caches, startup caches, and cached
     * translation models.
     */
    suspend fun deleteCachedFiles()

    /**
     * Deletes all site permissions.
     */
    suspend fun deleteSitePermissions()

    /**
     * Deletes all downloaded files from the downloads list.
     * Note: This only removes the entries from the app's download list,
     * it does not delete the actual files from the device's storage.
     */
    suspend fun deleteDownloads()

    /**
     * Deletes a specific category of browsing data.
     *
     * @param type The type of data to delete, as defined by [DeleteBrowsingDataOnQuitType].
     */
    suspend fun deleteType(type: DeleteBrowsingDataOnQuitType)

    /**
     * Deletes browsing data selected in the "Delete browsing data on quit" settings.
     *
     * This function is designed as a fire-and-forget operation from the caller's perspective.
     * If no data types are selected for deletion, the callback is invoked immediately.
     *
     * @param onDeletionComplete A callback function to be executed after all selected
     * data has been deleted. This is typically used to trigger the final application shutdown.
     */
    suspend fun clearBrowsingDataOnQuit(onDeletionComplete: () -> Unit)
}

/**
 * The default implementation of [DeleteBrowsingDataController].
 *
 * This class coordinates with various components like the browser engine, use cases,
 * and storage layers to perform the deletion of specific browsing data categories.
 *
 * @param deleteDataUseCases A collection of use cases for deleting data like tabs and downloads.
 * @param dataStorage A container for low-level data persistence layers like history and permissions.
 * @param stores A container for the app and browser-level state stores.
 * @param engine The browser engine instance responsible for handling low-level data.
 * @param settings The application settings provider, used to determine which data to clear on quit.
 * @param coroutineContext The coroutine context on which deletion operations are performed.
 */
class DefaultDeleteBrowsingDataController(
    private val deleteDataUseCases: DeleteDataUseCases,
    private val dataStorage: DataStorage,
    private val stores: Stores,
    private val engine: Engine,
    private val settings: Settings,
    private val coroutineContext: CoroutineContext = Dispatchers.Main,
) : DeleteBrowsingDataController {

    /**
     * A collection of use cases for deleting various types of browsing data.
     *
     * @property removeAllTabs The use case for removing all tabs.
     * @property removeAllDownloads The use case for removing all download entries.
     */
    data class DeleteDataUseCases(
        val removeAllTabs: TabsUseCases.RemoveAllTabsUseCase,
        val removeAllDownloads: DownloadsUseCases.RemoveAllDownloadsUseCase,
    )

    /**
     * A container for central state stores.
     *
     * This data class groups together app-level and browser-level state stores
     * required by the controller.
     *
     * @property appStore The central state store for the application.
     * @property browserStore The central state store for the browser.
     */
    data class Stores(
        val appStore: AppStore,
        val browserStore: BrowserStore,
    )

    /**
     * A container for low-level data persistence layers.
     *
     * This data class groups together storage-related dependencies required by the controller.
     *
     * @property history The storage handler for browsing history.
     * @property permissions The storage handler for site permissions.
     */
    data class DataStorage(
        val history: HistoryStorage,
        val permissions: PermissionStorage,
    )

    override suspend fun deleteTabs() {
        withContext(coroutineContext) {
            deleteDataUseCases.removeAllTabs.invoke(false)
        }
    }

    override suspend fun deleteBrowsingHistory() {
        withContext(coroutineContext) {
            dataStorage.history.deleteEverything()
            stores.browserStore.dispatch(EngineAction.PurgeHistoryAction)
            stores.browserStore.dispatch(RecentlyClosedAction.RemoveAllClosedTabAction)
        }
    }

    override suspend fun deleteCookiesAndSiteData() {
        withContext(coroutineContext) {
            engine.clearData(
                Engine.BrowsingData.select(
                    Engine.BrowsingData.COOKIES,
                    Engine.BrowsingData.AUTH_SESSIONS,
                ),
            )
            engine.clearData(Engine.BrowsingData.select(Engine.BrowsingData.DOM_STORAGES))
        }
    }

    override suspend fun deleteCachedFiles() {
        withContext(coroutineContext) {
            engine.manageTranslationsLanguageModel(
                options = ModelManagementOptions(
                    operation = ModelOperation.DELETE,
                    operationLevel = OperationLevel.CACHE,
                ),
                onSuccess = { },
                onError = { },
            )
            engine.clearData(
                Engine.BrowsingData.select(Engine.BrowsingData.ALL_CACHES),
            )
        }
    }

    override suspend fun deleteSitePermissions() {
        withContext(coroutineContext) {
            engine.clearData(
                Engine.BrowsingData.select(Engine.BrowsingData.ALL_SITE_SETTINGS),
            )
        }
        dataStorage.permissions.deleteAllSitePermissions()
    }

    override suspend fun deleteDownloads() {
        withContext(coroutineContext) {
            deleteDataUseCases.removeAllDownloads.invoke()
        }
    }

    override suspend fun deleteType(type: DeleteBrowsingDataOnQuitType) {
        when (type) {
            DeleteBrowsingDataOnQuitType.TABS -> deleteTabs()
            DeleteBrowsingDataOnQuitType.HISTORY -> deleteBrowsingHistory()
            DeleteBrowsingDataOnQuitType.COOKIES -> deleteCookiesAndSiteData()
            DeleteBrowsingDataOnQuitType.CACHE -> deleteCachedFiles()
            DeleteBrowsingDataOnQuitType.PERMISSIONS -> withContext(IO) {
                deleteSitePermissions()
            }

            DeleteBrowsingDataOnQuitType.DOWNLOADS -> deleteDownloads()
        }
    }

    override suspend fun clearBrowsingDataOnQuit(
        onDeletionComplete: () -> Unit,
    ) {
        val typesToDelete = determineDataTypesToDelete(settings)

        if (typesToDelete.isEmpty()) {
            onDeletionComplete()
            return
        }

        stores.appStore.dispatch(AppAction.DeleteAndQuitStarted)

        try {
            supervisorScope {
                typesToDelete.forEach { type ->
                    launch {
                        deleteType(type)
                    }
                }
            }
        } finally {
            onDeletionComplete()
        }
    }

    /**
     * Determines which data types to delete based on the user's settings.
     *
     * This function iterates through all possible `DeleteBrowsingDataOnQuitType` values
     * and checks the corresponding setting to see if it has been enabled for deletion on quit.
     *
     * @param settings The [Settings] instance to query for the "delete on quit" preferences.
     * @return A list of [DeleteBrowsingDataOnQuitType] enums that are configured to be deleted.
     */
    private fun determineDataTypesToDelete(settings: Settings): List<DeleteBrowsingDataOnQuitType> {
        return DeleteBrowsingDataOnQuitType.entries.filter { type ->
            settings.getDeleteDataOnQuit(type)
        }
    }
}
