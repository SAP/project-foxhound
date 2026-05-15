/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experiments

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.DelicateCoroutinesApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.plus
import mozilla.components.browser.engine.gecko.preferences.BrowserPrefObserverIntegration
import mozilla.components.concept.engine.preferences.BrowserPreference
import mozilla.components.service.nimbus.NimbusApi
import mozilla.components.support.base.log.logger.Logger
import org.mozilla.experiments.nimbus.internal.GeckoPrefHandler
import org.mozilla.experiments.nimbus.internal.GeckoPrefState
import org.mozilla.experiments.nimbus.internal.OriginalGeckoPref
import org.mozilla.experiments.nimbus.internal.PrefBranch
import org.mozilla.experiments.nimbus.internal.PrefUnenrollReason
import org.mozilla.fenix.nimbus.FxNimbus
import org.mozilla.geckoview.GeckoPreferenceController

private val logger = Logger("service/Nimbus/GeckoPrefHandler")

/**
 * Helper method to convert a PrefBranch to the appropriate preference branch integer.
 *
 * @return The Int corresponding with the PrefBranch's value
 */
@org.mozilla.geckoview.ExperimentalGeckoViewApi
fun PrefBranch.toGeckoBranch(): Int {
    return when (this) {
        PrefBranch.DEFAULT -> GeckoPreferenceController.PREF_BRANCH_DEFAULT
        PrefBranch.USER -> GeckoPreferenceController.PREF_BRANCH_USER
    }
}

/**
 * Helper method to obtain the underlying Gecko preference's string name
 */
fun GeckoPrefState.prefString(): String = this.geckoPref.pref

/**
 * Helper method to obtain the underlying Gecko preference's branch name
 */
fun GeckoPrefState.branch(): PrefBranch = this.geckoPref.branch

/**
 * Helper method to iterate through a list of GeckoPrefState instances and obtain the instance
 * with the provided preference string name, if it exists.
 *
 * @param prefString: The preference string name for which to search
 * @return The GeckoPrefState matching the `prefString`, if it exists
 */
fun List<GeckoPrefState>.findByPrefString(prefString: String): GeckoPrefState? {
    return this.find { state ->
        state.prefString() == prefString
    }
}

/**
 * The handler Nimbus uses for reading and writing Gecko preferences
 */
@org.mozilla.geckoview.ExperimentalGeckoViewApi
object NimbusGeckoPrefHandler : GeckoPrefHandler, BrowserPrefObserverIntegration.Observer {

    val nimbusGeckoPreferences: Map<String, Map<String, GeckoPrefState>> =
        FxNimbus.geckoPrefsMap().mapValues { featureEntry ->
            featureEntry.value.mapValues { variableEntry ->
                GeckoPrefState(variableEntry.value, null, null, false)
            }
        }
    val preferenceList = nimbusGeckoPreferences.flatMap { featureEntry ->
        featureEntry.value.map { variablesEntry ->
            variablesEntry.value.prefString()
        }
    }
    val errorsList = mutableListOf<Pair<GeckoPrefState, Throwable?>>()
    val preferenceTypes = mutableMapOf<String, Int>()
    var nimbusApi: NimbusApi? = null
    var browserPrefObserverIntegration: BrowserPrefObserverIntegration? = null

    val geckoScope = MainScope() + CoroutineName("NimbusGeckoPrefHandler")

    /**
     * Obtains the preference state for a specific preference string
     *
     * @param pref: The string name of the preference for which to obtain the value
     * @return The GeckoPrefState instance for the requested preference, if it exists
     */
    fun getPreferenceState(pref: String): GeckoPrefState? {
        for ((_, variables) in nimbusGeckoPreferences) {
            for ((_, geckoPrefState) in variables) {
                if (geckoPrefState.prefString() == pref) return geckoPrefState
            }
        }
        return null
    }

    /**
     * @return The state of the Gecko preferences for which Nimbus could set values
     */
    fun getPreferenceStateFromGecko(): Deferred<Boolean> {
        val completable = CompletableDeferred<Boolean>()
        try {
            @OptIn(DelicateCoroutinesApi::class)
            GlobalScope.launch(Dispatchers.Main) {
                val preferencesResult = GeckoPreferenceController.getGeckoPrefs(preferenceList)

                preferencesResult.accept { preferences ->
                    for (preference in preferences ?: listOf()) {
                        val state = getPreferenceState(preference.pref)!!
                        state.geckoValue = if (state.branch() == PrefBranch.DEFAULT) {
                            preference.defaultValue
                        } else {
                            preference.userValue
                        }.toString()
                        state.isUserSet = preference.hasUserChangedValue
                        preferenceTypes[preference.pref] = preference.type
                    }
                    completable.complete(true)
                }.exceptionally<Void> {
                    completable.complete(false)
                    null
                }
            }
        } catch (e: IllegalThreadStateException) {
            logger.error("Error getting preference state from Gecko", e)
            completable.complete(false)
        }
        return completable
    }

    /**
     * Handles the errors stored in `errorsList`, and unenrolls from Nimbus experiments for the
     * preferences that failed to set.
     */
    fun handleErrors() {
        for ((prefState, _) in errorsList) {
            nimbusApi?.unenrollForGeckoPref(prefState, PrefUnenrollReason.FAILED_TO_SET)
        }
    }

    /**
     * @return The map of GeckoPrefState instances
     */
    override fun getPrefsWithState(): Map<String, Map<String, GeckoPrefState>> {
        return nimbusGeckoPreferences
    }

    /**
     * Sets Gecko preferences to their original values when experiment unenrollment occurs.
     *
     * @param originalGeckoPrefs: The list of original Gecko preference values
     */
    override fun setGeckoPrefsOriginalValues(originalGeckoPrefs: List<OriginalGeckoPref>) {
        geckoScope.launch {
            val setters: List<Pair<String?, GeckoPreferenceController.SetGeckoPreference<*>?>> =
                getSetterPairsFromOriginalGeckoPrefs(originalGeckoPrefs)
            GeckoPreferenceController.setGeckoPrefs(
                setters.mapNotNull { if (it.second != null) it.second else null },
            )
                .accept { resultMap ->
                    resultMap?.forEach { (prefString, wasSet) ->
                        if (wasSet) {
                            logger.info("Set preference $prefString to its original value")
                        } else {
                            logger.warn("Unable to set $prefString to its original value")
                        }
                    }
                }.exceptionally<Void> {
                    logger.error("Error setting Gecko preferences to their original values", it)
                    null
                }

            setters.forEach { (prefString, _) ->
                if (prefString != null) {
                    GeckoPreferenceController.clearGeckoUserPref(prefString)
                        .accept {
                            logger.info("Unset preference $prefString")
                        }
                        .exceptionally<Void> {
                            logger.warn("Error unsetting Gecko preference $prefString")
                            null
                        }
                }
            }
        }
    }

    /**
     * Creates a Pair containing either a String for a Gecko preference that needs to be cleared,
     * or its setter instance.
     *
     * @param originalGeckoPrefs: The original Gecko pref values before Nimbus set them during
     * enrollment
     * @return A list of Pairs, where the first item is an optional String denoting a preference
     * that needs to be cleared, and the second item is an optional Gecko preference setter instance
     */
    private fun getSetterPairsFromOriginalGeckoPrefs(
        originalGeckoPrefs: List<OriginalGeckoPref>,
    ): List<Pair<String?, GeckoPreferenceController.SetGeckoPreference<*>?>> {
        return originalGeckoPrefs.mapNotNull { originalGeckoPref ->
            val prefType = preferenceTypes.getValue(originalGeckoPref.pref)

            if (originalGeckoPref.value == null) {
                return@mapNotNull Pair(originalGeckoPref.pref, null)
            }

            return@mapNotNull when (prefType) {
                GeckoPreferenceController.PREF_TYPE_INT -> {
                    try {
                        Pair(
                            null,
                            GeckoPreferenceController.SetGeckoPreference.setIntPref(
                                originalGeckoPref.pref,
                                originalGeckoPref.value!!.toInt(),
                                originalGeckoPref.branch.toGeckoBranch(),
                            ),
                        )
                    } catch (ex: NumberFormatException) {
                        logger.error(
                            "Original value ${originalGeckoPref.value} " +
                                    "cannot be cast to Int for pref ${originalGeckoPref.pref}",
                            ex,
                        )
                        null
                    }
                }

                GeckoPreferenceController.PREF_TYPE_BOOL -> {
                    try {
                        Pair(
                            null,
                            GeckoPreferenceController.SetGeckoPreference.setBoolPref(
                                originalGeckoPref.pref,
                                originalGeckoPref.value!!.toBooleanStrict(),
                                originalGeckoPref.branch.toGeckoBranch(),
                            ),
                        )
                    } catch (ex: IllegalArgumentException) {
                        logger.error(
                            "Enrollment value ${originalGeckoPref.value} " +
                                    "cannot be cast to Bool for pref ${originalGeckoPref.pref}",
                            ex,
                        )
                        null
                    }
                }

                GeckoPreferenceController.PREF_TYPE_STRING -> {
                    Pair(
                        null,
                        GeckoPreferenceController.SetGeckoPreference.setStringPref(
                            originalGeckoPref.pref,
                            originalGeckoPref.value!!,
                            originalGeckoPref.branch.toGeckoBranch(),
                        ),
                    )
                }

                GeckoPreferenceController.PREF_TYPE_INVALID -> {
                    logger.warn(
                        "Preference type \"INVALID\" for preference " +
                                "${originalGeckoPref.pref} does not meet criteria for being set by " +
                                "Nimbus",
                    )
                    null
                }

                else -> {
                    logger.error(
                        "Int value $prefType for preference " +
                                "${originalGeckoPref.pref} does not match any known Gecko preference " +
                                "type",
                    )
                    null
                }
            }
        }
    }

    /**
     * Creates `GeckoPreferenceController.SetGeckoPreference<*>` objects which are used to set the
     * Gecko preference values.
     *
     * @param newPrefsState: The list of new Gecko preference states
     * @return The list of `GeckoPreferenceController.SetGeckoPreference<*>` instances
     */
    fun getSettersFromNewPrefsState(
        newPrefsState: List<GeckoPrefState>,
    ): List<GeckoPreferenceController.SetGeckoPreference<*>> {
        return newPrefsState.mapNotNull { prefState ->
            val prefType = preferenceTypes.getValue(prefState.prefString())

            return@mapNotNull when (prefType) {
                GeckoPreferenceController.PREF_TYPE_INT -> {
                    try {
                        GeckoPreferenceController.SetGeckoPreference.setIntPref(
                            prefState.prefString(),
                            prefState.enrollmentValue!!.prefValue.toInt(),
                            prefState.branch().toGeckoBranch(),
                        )
                    } catch (ex: NumberFormatException) {
                        logger.error(
                            "Enrollment value ${prefState.enrollmentValue?.prefValue} " +
                                    "cannot be cast to Int for pref ${prefState.prefString()}",
                            ex,
                        )
                        this.errorsList.add(Pair(prefState, ex))
                        null
                    }
                }

                GeckoPreferenceController.PREF_TYPE_BOOL -> {
                    try {
                        GeckoPreferenceController.SetGeckoPreference.setBoolPref(
                            prefState.prefString(),
                            prefState.enrollmentValue!!.prefValue.toBooleanStrict(),
                            prefState.branch().toGeckoBranch(),
                        )
                    } catch (ex: IllegalArgumentException) {
                        logger.error(
                            "Enrollment value ${prefState.enrollmentValue?.prefValue} " +
                                    "cannot be cast to Bool for pref ${prefState.prefString()}",
                            ex,
                        )
                        this.errorsList.add(Pair(prefState, ex))
                        null
                    }
                }

                GeckoPreferenceController.PREF_TYPE_STRING -> {
                    GeckoPreferenceController.SetGeckoPreference.setStringPref(
                        prefState.prefString(),
                        prefState.enrollmentValue!!.prefValue,
                        prefState.branch().toGeckoBranch(),
                    )
                }

                GeckoPreferenceController.PREF_TYPE_INVALID -> {
                    logger.warn(
                        "Preference type \"INVALID\" for preference " +
                                "${prefState.prefString()} does not meet criteria for being set by " +
                                "Nimbus",
                    )
                    null
                }

                else -> {
                    logger.error(
                        "Int value $prefType for preference " +
                                "${prefState.prefString()} does not match any known Gecko preference " +
                                "type",
                    )
                    null
                }
            }
        }
    }

    /**
     * Sets the Gecko preference state when new state should be applied during the Enrollment flow.
     *
     * @param newPrefsState: The list of new Gecko preference states
     */
    override fun setGeckoPrefsState(newPrefsState: List<GeckoPrefState>) {
        if (newPrefsState.isEmpty()) {
            return
        }

        geckoScope.launch {
            val setters: List<GeckoPreferenceController.SetGeckoPreference<*>> =
                getSettersFromNewPrefsState(newPrefsState)

            GeckoPreferenceController.setGeckoPrefs(setters)
                .accept { resultMap ->
                    val succeeded = mutableListOf<String>()
                    resultMap?.forEach { (prefString, wasSet) ->
                        if (wasSet) {
                            val state = getPreferenceState(prefString)!!
                            state.enrollmentValue =
                                newPrefsState.findByPrefString(prefString)!!.enrollmentValue
                            succeeded.add(prefString)
                        } else {
                            val state = getPreferenceState(prefString)!!
                            val throwable = Throwable(
                                "Preference $prefString value was " +
                                        "not set",
                            )
                            logger.error("Error while setting preference value", throwable)
                            errorsList.add(Pair(state, throwable))
                        }
                    }
                    browserPrefObserverIntegration?.register(NimbusGeckoPrefHandler)
                    val successfulPreviousPrefStates = mutableListOf<GeckoPrefState>()
                    for (pref in succeeded) {
                        successfulPreviousPrefStates.add(getPreferenceState(pref)!!)
                        browserPrefObserverIntegration?.registerPrefForObservation(
                            pref,
                            onSuccess = {
                                logger.info("Successfully registered $pref for observation")
                            },
                            onError = { throwable ->
                                logger.error("Failed to register $pref for observation", throwable)
                            },
                        )
                    }
                    nimbusApi!!.registerPreviousGeckoPrefStates(
                        successfulPreviousPrefStates,
                    )
                    handleErrors()
                }.exceptionally<Void> {
                    logger.error(
                        "Unknown error while awaiting setting Gecko preferences",
                        it,
                    )
                    null
                }
        }
    }

    /**
     * Handles when registered preferences are changed.
     *
     * @param observedPreference: The preference that was changed
     */
    override fun onPreferenceChange(observedPreference: BrowserPreference<*>) {
        if (preferenceList.contains(observedPreference.pref)) {
            val geckoPrefState = getPreferenceState(observedPreference.pref) ?: run {
                logger.warn(
                    "Preference ${observedPreference.pref} does not have a " +
                            "GeckoPrefState instance",
                )
                return
            }
            nimbusApi!!.unenrollForGeckoPref(geckoPrefState, PrefUnenrollReason.CHANGED)
        } else {
            logger.info(
                "Preference ${observedPreference.pref} was changed, but is not " +
                        "in Nimbus' preference list",
            )
        }
    }
}
