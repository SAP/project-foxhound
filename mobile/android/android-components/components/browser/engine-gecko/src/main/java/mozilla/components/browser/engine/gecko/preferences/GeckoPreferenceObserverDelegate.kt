/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package mozilla.components.browser.engine.gecko.preferences

import mozilla.components.browser.engine.gecko.preferences.GeckoPreferencesUtils.intoBrowserPreference
import mozilla.components.concept.engine.preferences.BrowserPrefObserverDelegate
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.GeckoPreferenceController

/**
 * A wrapper for the [BrowserPrefObserverDelegate] that connects to Gecko.
 *
 * @param delegate The [BrowserPrefObserverDelegate] to pass Gecko delegate messages on to.
 */
@ExperimentalGeckoViewApi
class GeckoPreferenceObserverDelegate(
    internal val delegate: BrowserPrefObserverDelegate,
) : GeckoPreferenceController.Observer.Delegate {

    /**
     * Called when a registered preference changes value.
     *
     * @param observedGeckoPreference The preference with changed values.
     */
    override fun onGeckoPreferenceChange(observedGeckoPreference: GeckoPreferenceController.GeckoPreference<*>) {
        delegate.onPreferenceChange(observedGeckoPreference.intoBrowserPreference())
    }
}
