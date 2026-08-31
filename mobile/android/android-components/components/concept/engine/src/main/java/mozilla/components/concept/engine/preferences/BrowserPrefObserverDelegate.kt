/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package mozilla.components.concept.engine.preferences

/**
 * Interface for implementing a browser preference observer delegate.
 * This delegate reports events related to browser preferences changes.
 */
interface BrowserPrefObserverDelegate {

    /**
     * This method occurs when a preference registered for observation changes.
     *
     * @param observedPreference The browser preference that changed.
     */
    fun onPreferenceChange(observedPreference: BrowserPreference<*>)
}
