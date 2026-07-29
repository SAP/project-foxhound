/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.translations

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

/**
 * Interface defining cached properties that controlled the enabled state of translations.
 */
interface TranslationsEnabledSettings {
    val isEnabled: Flow<Boolean>

    /**
     * Set whether translations is enabled.
     */
    suspend fun setEnabled(isEnabled: Boolean)

    companion object {
        /**
         * An in-memory version for tests, previews, etc.
         */
        fun inMemory(isEnabledInitial: Boolean = false) = object : TranslationsEnabledSettings {
            private val _isEnabled = MutableStateFlow(isEnabledInitial)
            override val isEnabled: Flow<Boolean> = _isEnabled
            override suspend fun setEnabled(isEnabled: Boolean) {
                _isEnabled.value = isEnabled
            }
        }

        /**
         * A [DataStore] backed version.
         */
        fun dataStore(context: Context): TranslationsEnabledSettings =
            DataStoreBackedTranslationsEnabledSettings(context.translationsDataStore)
    }
}

internal class DataStoreBackedTranslationsEnabledSettings(
    private val dataStore: DataStore<Preferences>,
) : TranslationsEnabledSettings {
    private val isEnabledKey = booleanPreferencesKey("is_enabled_key")

    override val isEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[isEnabledKey] ?: true
    }

    override suspend fun setEnabled(isEnabled: Boolean) {
        dataStore.updateData {
            it.toMutablePreferences().also { preferences ->
                preferences[isEnabledKey] = isEnabled
            }
        }
    }
}

private val Context.translationsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "translations_enabled_settings",
)
