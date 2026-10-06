/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import android.content.Context

/**
 * Provider of [SettingsSearchItem]s from sources that are not backed by an XML preference file.
 */
interface SettingsSearchProvider {
    /**
     * Get the list of [SettingsSearchItem]s to be included in the settings search index.
     *
     * @param context [Context] used to resolve string resources and other platform interactions.
     */
    fun getSearchItems(context: Context): List<SettingsSearchItem>
}
