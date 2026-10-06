/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.logo

import androidx.navigation.NavController
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.nav
import org.mozilla.fenix.home.HomeFragmentDirections
import org.mozilla.fenix.trackingprotection.ProtectionsDashboardFragment

/**
 * Home content controller for handling interactions with the tracking protections pill.
 *
 * @param navController [NavController] used for navigation.
 * @param currentSessionId Optional id of a session to observe for tracker related updates
 */
class TrackingProtectionController(
    private val navController: NavController,
    private val currentSessionId: String?,
) {
    /**
     * Handle the tracking protections pill being clicked.
     */
    fun handleProtectionStatusPillClicked() {
        navController.nav(
            R.id.homeFragment,
            HomeFragmentDirections.actionHomeFragmentToGlobalProtectionsDashboard(
                currentSessionId,
                source = ProtectionsDashboardFragment.SOURCE_HOME,
            ),
        )
    }
}
