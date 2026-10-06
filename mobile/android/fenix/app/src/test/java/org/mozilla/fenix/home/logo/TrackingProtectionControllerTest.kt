/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.logo

import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.home.HomeFragmentDirections
import org.mozilla.fenix.trackingprotection.ProtectionsDashboardFragment

@RunWith(AndroidJUnit4::class)
class TrackingProtectionControllerTest {
    @get:Rule
    val gleanRule = FenixGleanTestRule(testContext)

    @Test
    fun `WHEN the protection status pill is clicked THEN navigate to the protections dashboard`() {
        val navController: NavController = mockk {
            every { currentDestination } returns mockk<NavDestination> {
                every { id } returns R.id.homeFragment
            }
            every { navigate(any<NavDirections>(), anyNullable<NavOptions>()) } just Runs
        }
        val currentSessionId = "test"
        val controller = TrackingProtectionController(navController, currentSessionId)

        controller.handleProtectionStatusPillClicked()

        verify { navController.currentDestination }
        verify {
            navController.navigate(
                directions = HomeFragmentDirections.actionHomeFragmentToGlobalProtectionsDashboard(
                    currentSessionId,
                    source = ProtectionsDashboardFragment.SOURCE_HOME,
                ),
                navOptions = null,
            )
        }
    }
}
