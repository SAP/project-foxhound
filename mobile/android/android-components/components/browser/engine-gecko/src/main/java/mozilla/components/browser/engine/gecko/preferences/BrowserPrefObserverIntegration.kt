/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package mozilla.components.browser.engine.gecko.preferences

import mozilla.components.concept.engine.Engine
import mozilla.components.concept.engine.preferences.BrowserPrefObserverDelegate
import mozilla.components.concept.engine.preferences.BrowserPreference
import mozilla.components.support.base.feature.LifecycleAwareFeature
import mozilla.components.support.base.observer.Observable
import mozilla.components.support.base.observer.ObserverRegistry

/**
 * Feature to observe browser preference changes.
 */
class BrowserPrefObserverIntegration(
    private val engine: Engine,
) :
    LifecycleAwareFeature,
    BrowserPrefObserverDelegate,
    Observable<BrowserPrefObserverIntegration.Observer> by ObserverRegistry() {

    override fun start() {
        engine.registerPrefObserverDelegate(this)
    }

    override fun stop() {
        engine.unregisterPrefObserverDelegate()
    }

    /**
     * Will register a browser preference for observation. Will receive reports on changes via
     * [onPreferenceChange].
     *
     * @param pref The browser preference to observe.
     * @param onSuccess What to do in the event of a successful registration.
     * @param onError What to do in the event of a unsuccessful registration.
     */
    fun registerPrefForObservation(
        pref: String,
        onSuccess: () -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        engine.registerPrefForObservation(
            pref,
            onSuccess = {
                onSuccess
            },
            onError = { onError },
        )
    }

    /**
     * Will register a list of browser preferences for observation. Will receive reports on changes via
     * [onPreferenceChange].
     *
     * @param prefs The list of browser preferences to observe.
     * @param onSuccess What to do in the event of a successful registration.
     * @param onError What to do in the event of a unsuccessful registration.
     */
    fun registerPrefsForObservation(
        prefs: List<String>,
        onSuccess: () -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        engine.registerPrefsForObservation(
            prefs,
            onSuccess = {
                onSuccess
            },
            onError = { onError },
        )
    }

/**
 * Will unregister a browser preference for observation that was registered via [registerPrefForObservation].
 *
 * @param pref The browser preference to stop observing.
 * @param onSuccess What to do in the event of a successful deregistration.
 * @param onError What to do in the event of a unsuccessful deregistration.
 *
 */
    fun unregisterPrefForObservation(
        pref: String,
        onSuccess: () -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        engine.unregisterPrefForObservation(
            pref,
            onSuccess = {
                onSuccess
            },
            onError = { onError },
        )
    }

    /**
     * Will unregister a list of browser preferences for
     * observation that was registered via [registerPrefForObservation].
     *
     * @param prefs The list of browser preferences to stop observing.
     * @param onSuccess What to do in the event of a successful deregistration.
     * @param onError What to do in the event of a unsuccessful deregistration.
     *
     */
    fun unregisterPrefsForObservation(
        prefs: List<String>,
        onSuccess: () -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        engine.unregisterPrefsForObservation(
            prefs,
            onSuccess = {
                onSuccess
            },
            onError = { onError },
        )
    }

    /**
     * This function is called when a browser preference registered for observation changes and
     * the preference value changed after registration.
     *
     * Register a preference for observation through [registerPrefForObservation].
     *
     * @param observedPreference The preference that changed and its values.
     */
    override fun onPreferenceChange(observedPreference: BrowserPreference<*>) {
        notifyObservers {
            onPreferenceChange(observedPreference)
        }
    }

    /**
     * Observer interface for observing browser preference changes.
     */
    interface Observer {
        /**
         * A subscription for browser preferences changing is available.
         * Register a preference with the browser using
         * [mozilla.components.concept.engine.preferences.BrowserPrefObserverFeature.registerPrefForObservation]
         *
         * See [mozilla.components.concept.engine.preferences.BrowserPrefObserverFeature.onPreferenceChange]
         * for more details.
         */
        fun onPreferenceChange(observedPreference: BrowserPreference<*>) = Unit
    }
}
