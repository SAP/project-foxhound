/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.preferences

/**
 * The private container for representing a browser preference that should be set.
 *
 * @property pref The name of the browser preference.
 * @property value The value to set the preference to. Restricted to [String], [Int], and [Boolean].
 * @param branch The branch to request the change on.
 * Setting on [Branch.USER] will change the user's active preference value. Selecting
 * [Branch.DEFAULT] will change the default for the preference. If no user preference is
 * stated, then in may become the active preference value.
 */
class SetBrowserPreference<T> private constructor(
    val pref: String,
    val value: T,
    val branch: Branch,
) {
    /**
     * Public constructors to prevent creating invalid preference T types.
     */
    companion object {

        /**
         * Set a [String] browser preference.
         *
         * @param pref The name of the browser preference.
         * @param value The value to set the preference to.
         * @param branch The branch that the value should be set on.
         */
        fun setStringPref(
            pref: String,
            value: String,
            branch: Branch,
        ): SetBrowserPreference<String> {
            return SetBrowserPreference(pref, value, branch)
        }

        /**
         * Set an [Int] browser preference.
         *
         * @param pref The name of the browser preference.
         * @param value The value to set the preference to.
         * @param branch The branch that the value should be set on.
         */
        fun setIntPref(
            pref: String,
            value: Int,
            branch: Branch,
        ): SetBrowserPreference<Int> {
            return SetBrowserPreference(pref, value, branch)
        }

        /**
         * Set a [Boolean] browser preference.
         *
         * @param pref The name of the browser preference.
         * @param value The value to set the preference to.
         * @param branch The branch that the value should be set on.
         */
        fun setBoolPref(
            pref: String,
            value: Boolean,
            branch: Branch,
        ): SetBrowserPreference<Boolean> {
            return SetBrowserPreference(pref, value, branch)
        }
    }
}
