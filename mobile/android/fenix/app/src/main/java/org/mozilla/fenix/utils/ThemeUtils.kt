/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
import androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
import androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES

/**
 * Determines if dark mode should be enabled based on user settings.
 */
fun Settings.getAppNightMode(): Int = when (shouldFollowDeviceTheme) {
    true -> MODE_NIGHT_FOLLOW_SYSTEM
    false -> {
        when (shouldUseLightTheme) {
            true -> MODE_NIGHT_NO
            false -> MODE_NIGHT_YES
        }
    }
}
