/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.content.Context
import android.util.AttributeSet
import org.mozilla.fenix.R

/**
 * Custom [DropDownListPreference] that automatically builds the list of available options for the
 * custom Enhanced Tracking Protection option depending on the current Nimbus experiments.
 */
class CustomEtpCookiesOptionsDropDownListPreference @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : DropDownListPreference(context, attrs) {
    init {
        entries = arrayOf(
            context.getString(R.string.preference_enhanced_tracking_protection_custom_cookies_5),
            context.getString(R.string.preference_enhanced_tracking_protection_custom_cookies_1),
            context.getString(R.string.preference_enhanced_tracking_protection_custom_cookies_2),
            context.getString(R.string.preference_enhanced_tracking_protection_custom_cookies_3),
            context.getString(R.string.preference_enhanced_tracking_protection_custom_cookies_4),
        )

        entryValues = arrayOf(
            context.getString(R.string.total_protection),
            context.getString(R.string.social),
            context.getString(R.string.unvisited),
            context.getString(R.string.third_party),
            context.getString(R.string.all),
        )

        // Default to first (Total Cookie Protection)
        setDefaultValue(entryValues.first())
    }
}
