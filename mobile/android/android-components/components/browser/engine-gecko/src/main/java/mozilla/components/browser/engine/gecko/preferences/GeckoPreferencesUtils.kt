/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package mozilla.components.browser.engine.gecko.preferences

import androidx.annotation.OptIn
import mozilla.components.concept.engine.preferences.Branch
import mozilla.components.concept.engine.preferences.BrowserPreference
import mozilla.components.concept.engine.preferences.SetBrowserPreference
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.GeckoPreferenceController.GeckoPreference
import org.mozilla.geckoview.GeckoPreferenceController.PREF_BRANCH_DEFAULT
import org.mozilla.geckoview.GeckoPreferenceController.PREF_BRANCH_USER
import org.mozilla.geckoview.GeckoPreferenceController.SetGeckoPreference

/**
 * Utility file for preferences functions related to the Gecko implementation.
 */
object GeckoPreferencesUtils {

    /**
     * Convenience method for mapping an Android Components [Branch]
     * into the corresponding GeckoView branch
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    fun Branch.intoGeckoBranch(): Int {
        return when (this) {
            Branch.DEFAULT -> PREF_BRANCH_DEFAULT
            Branch.USER -> PREF_BRANCH_USER
        }
    }

    /**
     * Convenience method for mapping a GeckoView [GeckoPreference]
     * into an Android Components [BrowserPreference].
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    fun GeckoPreference<*>.intoBrowserPreference(): BrowserPreference<*> {
        return BrowserPreference(
            pref = this.pref,
            value = this.value,
            defaultValue = this.defaultValue,
            userValue = this.userValue,
            hasUserChangedValue = this.hasUserChangedValue,
        )
    }

    /**
     * Convenience method for mapping an Android Component [SetBrowserPreference] into
     * a GeckoView [SetGeckoPreference]. May throw under unexpected conditions.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    fun SetBrowserPreference<*>.intoSetGeckoPreference(): SetGeckoPreference<*> =
        when (this.value) {
            is String -> {
                 SetGeckoPreference.setStringPref(
                    this.pref,
                    this.value as String,
                    this.branch.intoGeckoBranch(),
                )
            }

            is Int -> {
                 SetGeckoPreference.setIntPref(
                    this.pref,
                    this.value as Int,
                    this.branch.intoGeckoBranch(),
                )
            }

            is Boolean -> {
                SetGeckoPreference.setBoolPref(
                    this.pref,
                    this.value as Boolean,
                    this.branch.intoGeckoBranch(),
                )
            }
            else -> {
                // [SetBrowserPreference] should restrict this from ever actually occurring.
                throw UnsupportedOperationException(
                    "Should only ever set browser preferences of type String, Int, and Boolean! " +
                    "Trying to set a Float preference? Convert it to a String first.",
                )
            }
        }
}
