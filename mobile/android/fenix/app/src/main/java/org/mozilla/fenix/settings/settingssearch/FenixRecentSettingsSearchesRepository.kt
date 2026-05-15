/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.dataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import org.mozilla.fenix.settings.datastore.RecentSettingsSearchItem
import org.mozilla.fenix.settings.datastore.RecentSettingsSearches
import org.mozilla.fenix.settings.settingssearch.DefaultFenixSettingsIndexer.Companion.preferenceFileInformationList

private val Context.recentSearchesDataStore: DataStore<RecentSettingsSearches> by dataStore(
    fileName = "recent_searches.pb",
    serializer = RecentSettingsSearchesSerializer,
)

/**
 * Repository for recent searches.
 *
 * @param context The application context.
 */
class FenixRecentSettingsSearchesRepository(
    private val context: Context,
) : RecentSettingsSearchesRepository {

    override val recentSearches: Flow<List<SettingsSearchItem>> =
        context.recentSearchesDataStore.data.map { protoResult ->
            protoResult.itemsList.mapNotNull { protoItem ->
                val prefInfo = preferenceFileInformationList.find {
                    it.xmlResourceId == protoItem.xmlResourceId
                } ?: return@mapNotNull null

                SettingsSearchItem(
                    preferenceKey = protoItem.preferenceKey,
                    title = protoItem.title,
                    summary = protoItem.summary,
                    categoryHeader = "",
                    preferenceFileInformation = prefInfo,
                )
            }
        }

    /**
     * Adds a new recent search item to the repository.
     *
     * @param item The [SettingsSearchItem] to add.
     */
    override suspend fun addRecentSearchItem(item: SettingsSearchItem) {
        context.recentSearchesDataStore.updateData { currentRecents ->
            val currentItems = currentRecents.itemsList.toMutableList()

            currentItems.removeIf { it.preferenceKey == item.preferenceKey }

            val newProtoItem = RecentSettingsSearchItem.newBuilder()
                .setPreferenceKey(item.preferenceKey)
                .setTitle(item.title)
                .setSummary(item.summary)
                .setXmlResourceId(item.preferenceFileInformation.xmlResourceId)
                .build()
            currentItems.add(0, newProtoItem)

            val updatedItems = currentItems.take(MAX_RECENTS)
            currentRecents.toBuilder().clearItems().addAllItems(updatedItems).build()
        }
    }

    /**
     * Clears all recent search items from the repository.
     */
    override suspend fun clearRecentSearches() {
        context.recentSearchesDataStore.updateData {
            it.toBuilder().clearItems().build()
        }
    }

    companion object {
        private const val MAX_RECENTS = 5
    }
}
