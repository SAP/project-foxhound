/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import kotlinx.coroutines.flow.Flow

/**
 * A repository for recent search items.
 */
interface RecentSettingsSearchesRepository {

    /**
     * A flow that emits the list of recent search items whenever it changes.
     */
    val recentSearches: Flow<List<SettingsSearchItem>>

    /**
     * Adds a [SettingsSearchItem] to the list of recent search items.
     * If the item already exits, it is moved to the top.
     *
     * @param item The item to add.
     */
    suspend fun addRecentSearchItem(item: SettingsSearchItem)

    /**
     * Clears the list of recent search items.
     */
    suspend fun clearRecentSearches()
}
