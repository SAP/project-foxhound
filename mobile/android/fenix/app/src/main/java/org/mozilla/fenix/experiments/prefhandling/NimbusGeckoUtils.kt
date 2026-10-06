/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experiments.prefhandling

import androidx.annotation.VisibleForTesting
import mozilla.components.concept.engine.preferences.Branch
import mozilla.components.concept.engine.preferences.BrowserPrefType
import mozilla.components.concept.engine.preferences.SetBrowserPreference
import mozilla.components.concept.engine.preferences.SetBrowserPreference.Companion.setBoolPref
import mozilla.components.concept.engine.preferences.SetBrowserPreference.Companion.setIntPref
import mozilla.components.concept.engine.preferences.SetBrowserPreference.Companion.setStringPref
import mozilla.components.support.base.log.logger.Logger
import org.json.JSONException
import org.json.JSONTokener
import org.mozilla.experiments.nimbus.internal.GeckoPrefState
import org.mozilla.experiments.nimbus.internal.OriginalGeckoPref
import org.mozilla.experiments.nimbus.internal.PrefBranch

private val logger = Logger("service/Nimbus/GeckoPrefHandlerExt")

/**
 * Helper method to obtain the underlying Gecko preference's string name
 */
fun GeckoPrefState.prefString(): String = this.geckoPref.pref

/**
 * Helper method to obtain the underlying Gecko preference's branch name
 */
fun GeckoPrefState.branch(): PrefBranch = this.geckoPref.branch

/**
 * Helper method to convert a PrefBranch to the appropriate AC preference branch.
 *
 * @return The [Branch] corresponding with the [PrefBranch] value
 */
fun PrefBranch.toBrowserPrefBranch(): Branch {
    return when (this) {
        PrefBranch.DEFAULT -> Branch.DEFAULT
        PrefBranch.USER -> Branch.USER
    }
}

/**
 * Helper method to iterate through a list of [GeckoPrefState] instances and obtain the instance
 * with the provided preference string name, if it exists.
 *
 * @param prefString: The preference string name for which to search
 * @return The [GeckoPrefState] matching the `prefString`, if it exists
 */
fun List<GeckoPrefState>.findByPrefString(prefString: String): GeckoPrefState? {
    return this.find { state ->
        state.prefString() == prefString
    }
}

/**
 * Helper method to correctly parse experiment preference string values.
 * @throws JSONException
 */
@VisibleForTesting
internal fun String.fromJsonStringValue(): String {
    // Using toString, because raw values are also acceptable.
    return JSONTokener(this).nextValue().toString()
}

/**
 * Convenience method for converting an [OriginalGeckoPref] into a settable Gecko preference.
 * @param originalGeckoPref An original preference object to convert to a [SetBrowserPreference].
 * @param setType The confirmed Gecko stated preference type.
 * @return A [SetBrowserPreference] object, if possible, else throw.
 * @throws NullPointerException - When there is no original value.
 * @throws NumberFormatException - When an int preference cannot be parsed.
 * @throws JSONException - When a string value cannot be parsed.
 * @throws IllegalStateException - When the pref doesn't correspond to a known [setType].
 */
fun createPrefSetter(originalGeckoPref: OriginalGeckoPref, setType: BrowserPrefType?): SetBrowserPreference<*> {
    val originalValue = originalGeckoPref.value ?: throw NullPointerException("No original value to set!")

    return when (setType) {
        BrowserPrefType.INT -> {
                setIntPref(
                    originalGeckoPref.pref,
                    originalValue.toInt(),
                    originalGeckoPref.branch.toBrowserPrefBranch(),
                )
        }
        BrowserPrefType.BOOL -> {
                setBoolPref(
                    originalGeckoPref.pref,
                    originalValue.toBooleanStrict(),
                    originalGeckoPref.branch.toBrowserPrefBranch(),
                )
        }
        BrowserPrefType.STRING -> {
                setStringPref(
                    originalGeckoPref.pref,
                    originalValue.fromJsonStringValue(),
                    originalGeckoPref.branch.toBrowserPrefBranch(),
                )
        }
        else -> {
            logger.error(
                "${originalGeckoPref.pref} of $setType does not match any known Gecko preference type.",
            )
            throw IllegalStateException("Unknown Gecko preference type!")
        }
    }
}

/**
 * Convenience method for converting an [GeckoPrefState] into a settable Gecko preference for
 * enrollment values.
 * @param geckoPrefState An original preference object to convert to a [SetBrowserPreference].
 * @param setType The confirmed Gecko stated preference type.
 * @return A [SetBrowserPreference] object, if possible, else throw (related to parsing issues).
 * @throws NullPointerException - When there is no enrollment value.
 * @throws JSONException - When a string value cannot be parsed.
 * @throws NumberFormatException - When an int preference cannot be parsed.
 * @throws IllegalStateException - When the pref doesn't correspond to a known [setType].
 */
fun createPrefSetter(geckoPrefState: GeckoPrefState, setType: BrowserPrefType?): SetBrowserPreference<*>? {
    val enrollmentValue = geckoPrefState.enrollmentValue ?: throw NullPointerException("No enrollment value to set!")

    return when (setType) {
        BrowserPrefType.INT -> {
                setIntPref(
                    geckoPrefState.prefString(),
                    enrollmentValue.prefValue.toInt(),
                    geckoPrefState.branch().toBrowserPrefBranch(),
                )
        }
        BrowserPrefType.BOOL -> {
                setBoolPref(
                    geckoPrefState.prefString(),
                    enrollmentValue.prefValue.toBooleanStrict(),
                    geckoPrefState.branch().toBrowserPrefBranch(),
                )
        }
        BrowserPrefType.STRING -> {
                setStringPref(
                    geckoPrefState.prefString(),
                    enrollmentValue.prefValue.fromJsonStringValue(),
                    geckoPrefState.branch().toBrowserPrefBranch(),
                )
        }
        else -> {
            logger.error(
                "${geckoPrefState.prefString()} of $setType does not match any known Gecko preference type.",
            )
            throw IllegalStateException("Unknown Gecko preference type!")
        }
    }
}

/**
 * Creates a pref setter based on [OriginalGeckoPref].
 *
 * @param originalGeckoPrefs: The original Gecko pref values before Nimbus set them during
 * enrollment
 * @param setTypes: A map with the pref name as a key and the known [BrowserPrefType] as the value
 * to determine what kind of setter to create.
 * @return The list of [SetBrowserPreference] instances
 */
@Suppress("TooGenericExceptionCaught")
fun createSettersFromOriginalGeckoPrefs(
    originalGeckoPrefs: List<OriginalGeckoPref>,
    setTypes: Map<String, BrowserPrefType>,
): List<SetBrowserPreference<*>> {
    return originalGeckoPrefs.mapNotNull { originalGeckoPref ->
        try {
            return@mapNotNull createPrefSetter(
                originalGeckoPref = originalGeckoPref,
                setType = setTypes.getValue(originalGeckoPref.pref),
            )
        } catch (t: Throwable) {
            logger.error(
                "Enrollment value ${originalGeckoPref.pref} " +
                        "cannot be cast to correct pref type for pref ${originalGeckoPref.value}",
                t,
            )
            null
        }
    }
}

/**
 * Creates [SetBrowserPreference] objects which are used to set the
 * Gecko preference values.
 *
 * @param prefsState: The list of new Gecko preference states
 * @param setTypes: A map with the pref name as a key and the known [BrowserPrefType] as the value
 * to determine what kind of setter to create.
 * @return The list of [SetBrowserPreference] instances
 */
@Suppress("TooGenericExceptionCaught")
fun createSettersFromGeckoPrefStates(
    prefsState: List<GeckoPrefState>,
    setTypes: Map<String, BrowserPrefType>,
): List<SetBrowserPreference<*>> {
    return prefsState.mapNotNull { prefState ->
        try {
            return@mapNotNull createPrefSetter(
                geckoPrefState = prefState,
                setType = setTypes.getValue(prefState.prefString()),
            )
        } catch (t: Throwable) {
            logger.error(
                "Enrollment value ${prefState.enrollmentValue?.prefValue} " +
                        "cannot be cast to correct pref type for pref ${prefState.prefString()}",
                t,
            )
            null
        }
    }
}
