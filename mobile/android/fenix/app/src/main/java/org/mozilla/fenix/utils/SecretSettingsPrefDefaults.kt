/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import androidx.core.content.edit
import androidx.preference.PreferenceGroup
import androidx.preference.PreferenceScreen

/**
 * Resets secret settings preferences to their default values defined in [Settings].
 */
class SecretSettingsPrefDefaults(private val settings: Settings) {

    /**
     * Removes all preferences in the given [preferenceScreen] from shared preferences.
     */
    fun resetAll(preferenceScreen: PreferenceScreen) {
        settings.preferences.edit {
            keysFromScreen(preferenceScreen).forEach { remove(it) }
        }
    }

    private fun keysFromScreen(group: PreferenceGroup): List<String> = buildList {
        for (i in 0 until group.preferenceCount) {
            when (val pref = group.getPreference(i)) {
                is PreferenceGroup -> addAll(keysFromScreen(pref))
                else -> pref.key?.let { add(it) }
            }
        }
    }
}
