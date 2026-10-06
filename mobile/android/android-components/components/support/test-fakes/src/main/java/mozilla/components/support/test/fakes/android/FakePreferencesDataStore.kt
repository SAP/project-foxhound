/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.test.fakes.android

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.mutablePreferencesOf
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update

class FakePreferencesDataStore(initialPreferences: Preferences = mutablePreferencesOf()) : DataStore<Preferences> {
    val preferences = MutableStateFlow(initialPreferences)

    override val data = preferences

    override suspend fun updateData(transform: suspend (t: Preferences) -> Preferences): Preferences {
        return preferences.update {
            transform(preferences.value).toMutablePreferences()
        }.let { data.value }
    }
}
