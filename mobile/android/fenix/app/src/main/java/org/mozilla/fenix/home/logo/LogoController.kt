/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.logo

import android.content.Context
import org.mozilla.fenix.longfox.LongFoxFeatureApi

/**
 * Controller for launching the LongFox feature.
 */
class LogoController(
    private val longFoxFeature: LongFoxFeatureApi,
    private val context: Context,
    private val longFoxEnabled: Boolean,
) {

    /**
     * When the longfox entry point text is clicked, launch the LongFox feature.
     */
    fun handleLongfoxEntryPointClicked() {
        if (longFoxEnabled) longFoxFeature.start(context)
    }

    /**
     * When the longfox entry point is shown, record the telemetry event.
     */
    fun handleLongfoxEntryPointShown() {
        longFoxFeature.onEntryPointShown()
    }
}
