/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

/**
 * This interface provides methods for indexing settings and querying the index.
 */
interface SettingsIndexer {
    /**
     * Indexes all settings in the app.
     */
    suspend fun indexAllSettings()

    /**
     * Get all settings that match the query.
     *
     * @param query The query to search for.
     * @return A list of [SettingsSearchItem]s that match the query.
     */
    suspend fun getSettingsWithQuery(query: String): List<SettingsSearchItem>
}
