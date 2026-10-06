/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.advanced // Or a more common util/locale package

import android.content.Context
import mozilla.components.support.locale.LocaleManager

/**
 * An interface for checking if the default locale is selected in the application.
 */
interface LocaleSelectionChecker {
    /**
     * Checks if the "System default" locale is selected in the app's language settings.
     *
     * @param context The application context, used to access shared preferences.
     * @return `true` if "System default" is selected, `false` otherwise.
     */
    fun isDefaultLocaleSelected(context: Context): Boolean
}

/**
 * A [LocaleSelectionChecker] that checks if the default locale is selected using
 * [LocaleManager.isDefaultLocaleSelected].
 */
class DefaultLocaleSelectionChecker : LocaleSelectionChecker {
    /**
     * Checks if the default locale is currently selected.
     *
     * @param context The application context.
     * @return True if the default locale is selected, false otherwise.
     */
    override fun isDefaultLocaleSelected(context: Context): Boolean {
        return LocaleManager.isDefaultLocaleSelected(context)
    }
}
