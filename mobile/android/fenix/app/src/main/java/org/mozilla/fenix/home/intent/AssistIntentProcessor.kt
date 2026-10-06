/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.intent

import android.content.Intent
import androidx.navigation.NavController
import org.mozilla.fenix.NavGraphDirections
import org.mozilla.fenix.components.metrics.MetricsUtils
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.utils.Settings

/**
 * Using Firefox as a digital assistant application should start a voice search.
 */
class AssistIntentProcessor : HomeIntentProcessor {
    override fun process(intent: Intent, navController: NavController, out: Intent, settings: Settings): Boolean {
        if (intent.action != Intent.ACTION_ASSIST) {
            return false
        }

        navController.nav(
            id = null,
            directions = NavGraphDirections.actionGlobalHome(
                searchAccessPoint = MetricsUtils.Source.DIGITAL_ASSISTANT,
                focusOnAddressBar = true,
                startVoiceSearch = settings.shouldShowVoiceSearch,
            ),
        )

        return true
    }
}
