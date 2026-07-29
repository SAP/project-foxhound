/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import androidx.datastore.core.DataStore
import androidx.datastore.core.DataStoreFactory
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.mozilla.fenix.settings.datastore.RecentSettingsSearches

class FenixRecentSettingsSearchesRepositoryTest {

    @get:Rule
    val tmpFolder = TemporaryFolder()

    private val allPreferenceFiles = listOf(
        PreferenceFileInformation.GeneralPreferences,
        PreferenceFileInformation.SearchSettingsPreferences,
        PreferenceFileInformation.SecretSettingsPreferences,
    )

    private fun createDataStore(): DataStore<RecentSettingsSearches> =
        DataStoreFactory.create(
            serializer = RecentSettingsSearchesSerializer,
            produceFile = { tmpFolder.newFile("test_${System.nanoTime()}.pb") },
        )

    private fun createItem(
        key: String,
        title: String = key,
        prefInfo: PreferenceFileInformation = PreferenceFileInformation.GeneralPreferences,
    ) = SettingsSearchItem(
        preferenceKey = key,
        title = title,
        summary = "",
        categoryHeader = "",
        preferenceFileInformation = prefInfo,
    )

    @Test
    fun `WHEN addRecentSearchItem is called THEN item appears in recentSearches flow`() = runTest {
        val repository = FenixRecentSettingsSearchesRepository(createDataStore(), allPreferenceFiles)
        val item = createItem("key1", "Title 1")

        repository.addRecentSearchItem(item)
        val results = repository.recentSearches.first()

        assertEquals(1, results.size)
        assertEquals("key1", results[0].preferenceKey)
        assertEquals("Title 1", results[0].title)
    }

    @Test
    fun `WHEN addRecentSearchItem is called with duplicate key THEN duplicate is moved to top`() = runTest {
        val repository = FenixRecentSettingsSearchesRepository(createDataStore(), allPreferenceFiles)
        val itemA = createItem("keyA", "A")
        val itemB = createItem("keyB", "B")

        repository.addRecentSearchItem(itemA)
        repository.addRecentSearchItem(itemB)
        repository.addRecentSearchItem(itemA)
        val results = repository.recentSearches.first()

        assertEquals(2, results.size)
        assertEquals("keyA", results[0].preferenceKey)
        assertEquals("keyB", results[1].preferenceKey)
    }

    @Test
    fun `WHEN more than MAX_RECENTS items are added THEN oldest items are dropped`() = runTest {
        val repository = FenixRecentSettingsSearchesRepository(createDataStore(), allPreferenceFiles)

        for (i in 1..6) {
            repository.addRecentSearchItem(createItem("key$i", "Title $i"))
        }
        val results = repository.recentSearches.first()

        assertEquals(5, results.size)
        assertEquals("key6", results[0].preferenceKey)
        assertEquals("key2", results[4].preferenceKey)
    }

    @Test
    fun `WHEN clearRecentSearches is called THEN recentSearches flow emits empty list`() = runTest {
        val repository = FenixRecentSettingsSearchesRepository(createDataStore(), allPreferenceFiles)
        repository.addRecentSearchItem(createItem("key1"))
        repository.addRecentSearchItem(createItem("key2"))

        repository.clearRecentSearches()
        val results = repository.recentSearches.first()

        assertTrue(results.isEmpty())
    }

    @Test
    fun `WHEN item xmlResourceId does not match any preferenceFileInformation THEN it is filtered out`() = runTest {
        val limitedPrefFiles = listOf(PreferenceFileInformation.SecretSettingsPreferences)
        val repository = FenixRecentSettingsSearchesRepository(createDataStore(), limitedPrefFiles)

        repository.addRecentSearchItem(
            createItem("key1", prefInfo = PreferenceFileInformation.GeneralPreferences),
        )
        val results = repository.recentSearches.first()

        assertTrue(results.isEmpty())
    }
}
