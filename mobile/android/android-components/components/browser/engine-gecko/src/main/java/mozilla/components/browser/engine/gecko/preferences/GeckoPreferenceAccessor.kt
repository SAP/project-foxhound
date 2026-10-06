/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.preferences

import androidx.annotation.OptIn
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.GeckoPreferenceController
import org.mozilla.geckoview.GeckoPreferenceController.GeckoPreference
import org.mozilla.geckoview.GeckoPreferenceController.SetGeckoPreference
import org.mozilla.geckoview.GeckoResult

/**
 * An interface for accessing Gecko preferences.
 *
 * This interface provides methods for getting and setting Gecko preferences of various types.
 *
 * It is important to note that all methods in this interface can potentially block the calling thread,
 * so they should not be called on the main thread.
 *
 * All methods return a [GeckoResult] object, which can be used to check if the operation was successful.
 */
interface GeckoPreferenceAccessor {

    /**
     * Registers a Gecko preference for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     * Preferences registered here will be reported when they change value.
     *
     * @param pref The name of the preference to register for events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun registerGeckoPrefForObservation(pref: String): GeckoResult<Void>

    /**
     * Registers a list of Gecko preferences for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     * Preferences registered here will be reported when they change value.
     *
     * @param prefs A list of preference names to register for events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun registerGeckoPrefsForObservation(prefs: List<String>): GeckoResult<Void>

    /**
     * Unregisters a Gecko preference for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     *
     * @param pref The name of the preference to stop listening to events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun unregisterGeckoPrefForObservation(pref: String): GeckoResult<Void>

    /**
     * Unregisters a list of Gecko preferences for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     *
     * @param prefs A list of preference names to stop listening to events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun unregisterGeckoPrefsForObservation(prefs: List<String>): GeckoResult<Void>

    /**
     * Gets the value of a Gecko preference.
     *
     * @param pref The name of the preference to get.
     * @return A [GeckoResult] object containing the value of the preference, or null if the preference does not exist.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    fun getGeckoPref(pref: String): GeckoResult<GeckoPreference<*>?>

    /**
     * Gets the values of a list of Gecko preferences.
     *
     * @param prefs The list of the preference to get.
     * @return A [GeckoResult] object with a list of preference values.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    fun getGeckoPrefs(prefs: List<String>): GeckoResult<List<GeckoPreference<*>>>

    /**
     * Sets the value of a Gecko preference.
     *
     * @param pref The name of the preference to set.
     * @param value The new value for the preference.
     * @param branch The preference branch to operate on.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun setGeckoPref(pref: String, value: String, branch: Int): GeckoResult<Void>

    /**
     * Sets an integer Gecko preference.
     *
     * @param pref The name of the preference to set.
     * @param value The integer value to set the preference to.
     * @param branch The preference branch to operate on.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun setGeckoPref(pref: String, value: Int, branch: Int): GeckoResult<Void>

    /**
     * Sets the value of a boolean Gecko preference.
     *
     * @param pref The name of the preference to set.
     * @param value The value to set the preference to.
     * @param branch The preference branch to operate on.
     * @return A [GeckoResult] object that can be used to check if the operation was successful.
     */
    fun setGeckoPref(pref: String, value: Boolean, branch: Int): GeckoResult<Void>

    /**
     * Sets the value of a list of Gecko preferences.
     *
     * @param prefs The list of the preference to set.
     * @return A [GeckoResult] object with a map to indicate whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    fun setGeckoPrefs(prefs: List<SetGeckoPreference<*>>): GeckoResult<Map<String, Boolean>>

    /**
     * Clears a user branch Gecko preference.
     *
     * @param pref The name of the preference to clear.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    fun clearGeckoUserPref(pref: String): GeckoResult<Void>
}

internal class DefaultGeckoPreferenceAccessor : GeckoPreferenceAccessor {

    /**
     * Registers a Gecko preference for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     * Preferences registered here will be reported when they change value.
     *
     * @param pref The name of the preference to register for events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun registerGeckoPrefForObservation(pref: String): GeckoResult<Void> {
        return GeckoPreferenceController.Observer.registerPreference(pref)
    }

    /**
     * Registers a list of Gecko preferences for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     * Preferences registered here will be reported when they change value.
     *
     * @param prefs A list of preference names to register for events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun registerGeckoPrefsForObservation(prefs: List<String>): GeckoResult<Void> {
        return GeckoPreferenceController.Observer.registerPreferences(prefs)
    }

    /**
     * Unregisters a Gecko preference for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     *
     * @param pref The name of the preference to stop listening to events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun unregisterGeckoPrefForObservation(pref: String): GeckoResult<Void> {
        return GeckoPreferenceController.Observer.unregisterPreference(pref)
    }

    /**
     * Unregisters a list of Gecko preferences for observation on the
     * [org.mozilla.geckoview.GeckoPreferenceController.Observer.Delegate].
     *
     * @param prefs A list of preference names to stop listening to events.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun unregisterGeckoPrefsForObservation(prefs: List<String>): GeckoResult<Void> {
        return GeckoPreferenceController.Observer.unregisterPreferences(prefs)
    }

    /**
     * Gets the value of the Gecko preference with the given name.
     *
     * @param pref The name of the preference to get.
     * @return A [GeckoResult] containing the [GeckoPreference] for the given preference, or null if the
     * preference does not exist. The [GeckoResult] will contain an error if the operation fails.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun getGeckoPref(pref: String): GeckoResult<GeckoPreference<*>?> {
        return GeckoPreferenceController.getGeckoPref(pref)
    }

    /**
     * Gets the values of a list of Gecko preferences.
     *
     * @param prefs The list of the preference to get.
     * @return A [GeckoResult] object with a list of preference values.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun getGeckoPrefs(prefs: List<String>): GeckoResult<List<GeckoPreference<*>>> {
        return GeckoPreferenceController.getGeckoPrefs(prefs)
    }

    /**
     * Sets the value of a string Gecko preference.
     *
     * @param pref The name of the preference to set.
     * @param value The new value for the preference.
     * @param branch The preference branch to operate on.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun setGeckoPref(
        pref: String,
        value: String,
        branch: Int,
    ): GeckoResult<Void> {
        return GeckoPreferenceController.setGeckoPref(pref, value, branch)
    }

    /**
     * Sets the value of an integer Gecko preference.
     *
     * @param pref The name of the preference to set.
     * @param value The integer value to set the preference to.
     * @param branch The preference branch to operate on.
     * @return A [GeckoResult] object that can be used to check if the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun setGeckoPref(
        pref: String,
        value: Int,
        branch: Int,
    ): GeckoResult<Void> {
        return GeckoPreferenceController.setGeckoPref(pref, value, branch)
    }

    /**
     * Sets the value of a boolean Gecko preference.
     *
     * @param pref The name of the preference to set.
     * @param value The boolean value to set the preference to.
     * @param branch The preference branch to operate on.
     * @return A [GeckoResult] object indicating whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun setGeckoPref(
        pref: String,
        value: Boolean,
        branch: Int,
    ): GeckoResult<Void> {
        return GeckoPreferenceController.setGeckoPref(pref, value, branch)
    }

    /**
     * Sets the values of a list of Gecko preferences.
     *
     * @param prefs The list of the preference to set.
     * @return A [GeckoResult] object with a map to indicate whether the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun setGeckoPrefs(prefs: List<SetGeckoPreference<*>>): GeckoResult<Map<String, Boolean>> {
        return GeckoPreferenceController.setGeckoPrefs(prefs)
    }

    /**
     * Clears a Gecko user branch preference.
     *
     * @param pref The name of the preference to clear.
     * @return A [GeckoResult] object, which can be used to check if the operation was successful.
     */
    @OptIn(ExperimentalGeckoViewApi::class)
    override fun clearGeckoUserPref(pref: String): GeckoResult<Void> {
        return GeckoPreferenceController.clearGeckoUserPref(pref)
    }
}
