/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.labs

import android.content.Context
import org.mozilla.fenix.R
import org.mozilla.fenix.settings.settingssearch.PreferenceFileInformation
import org.mozilla.fenix.settings.settingssearch.SettingsSearchItem
import org.mozilla.fenix.settings.settingssearch.SettingsSearchProvider

/**
 * [SettingsSearchProvider] for making "Firefox Labs" discoverable in settings search.
 *
 * Returns an empty list when Firefox Labs is not enabled, so the screen is not indexed.
 *
 * @param isLabsEnabled Returns whether Firefox Labs is currently enabled.
 */
class FirefoxLabsSettingsSearchProvider(
    private val isLabsEnabled: () -> Boolean,
) : SettingsSearchProvider {

    private val preferenceFileInformation = PreferenceFileInformation.FirefoxLabsPreferences

    override fun getSearchItems(context: Context): List<SettingsSearchItem> {
        if (!isLabsEnabled()) return emptyList()

        return listOf(
            SettingsSearchItem(
                title = context.getString(R.string.firefox_labs_title),
                summary = "",
                preferenceKey = FIREFOX_LABS_KEY,
                categoryHeader = context.getString(preferenceFileInformation.categoryHeaderResourceId),
                preferenceFileInformation = preferenceFileInformation,
            ),
        )
    }

    companion object {
        const val FIREFOX_LABS_KEY = "FIREFOX_LABS"
    }
}
