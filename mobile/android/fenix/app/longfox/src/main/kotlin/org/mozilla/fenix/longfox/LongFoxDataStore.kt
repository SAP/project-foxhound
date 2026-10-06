/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import android.content.Context
import android.content.Intent
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "longfox")

/**
 * A preferences style key-value data store for the game settings.
 */
class LongFoxDataStore(
    private val context: Context,
    private val initialHiscore: Int = 0,
) {
    private val hiscoreKey = intPreferencesKey("hiscore")
    private val soundOnKey = booleanPreferencesKey("soundOn")

    fun hiscoreFlow(): Flow<Int> = context.dataStore.data.map { preferences ->
        preferences[hiscoreKey] ?: initialHiscore
    }

    fun soundOnFlow(): Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[soundOnKey] ?: false
    }

    /**
     * If the new score is higher than the current high score, save it in the data store.
     * @param newScore the latest score
     */
    suspend fun saveIfHiscore(newScore: Int) {
        context.dataStore.updateData { preferences ->
            if (newScore <= (preferences[hiscoreKey] ?: 0))
                preferences
            else preferences.toMutablePreferences().also { preferences ->
                preferences[hiscoreKey] = newScore
            }
        }
    }

    /**
     * Flip and save the setting for the sound being on or off.
     */
    suspend fun toggleSoundOn() {
        context.dataStore.updateData { preferences ->
            preferences.toMutablePreferences().also { preferences ->
                preferences[soundOnKey] = !(preferences[soundOnKey] ?: false)
            }
        }
    }

    /**
     * Allow hiscore to be shared to other social apps.
     *
     * @param hiscore the highest score you have currently been able to manage
     */
    fun shareHiscore(hiscore: Int) {
        val sendIntent: Intent = Intent().apply {
            action = Intent.ACTION_SEND
            val longestFox = "🦊${"🟧".repeat(hiscore)}"
            val hiscoreString = context.getString(R.string.my_longest_fox_is, hiscore, longestFox)
            putExtra(Intent.EXTRA_TEXT, hiscoreString)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, null)
        context.startActivity(shareIntent, null)
    }
}
