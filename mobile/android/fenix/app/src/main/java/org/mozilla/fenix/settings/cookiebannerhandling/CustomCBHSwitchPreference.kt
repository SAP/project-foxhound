/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.cookiebannerhandling

import android.content.Context
import android.util.AttributeSet
import androidx.preference.SwitchPreferenceCompat
import org.mozilla.fenix.ext.components

/**
 * Custom [SwitchPreferenceCompat] that automatically creates the switch for the
 * cookie banner handling feature depending on the current Nimbus configurations.
 */
class CustomCBHSwitchPreference @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : SwitchPreferenceCompat(context, attrs) {
    init {
        with(context) {
            setDefaultValue(components.settings.shouldUseCookieBannerPrivateModeDefaultValue)
        }
    }
}
