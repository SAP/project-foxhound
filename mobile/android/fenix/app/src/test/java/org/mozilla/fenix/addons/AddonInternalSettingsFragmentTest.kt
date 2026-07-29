/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.addons

import androidx.navigation.NavController
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.spyk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.addons.AddonManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.R
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AddonInternalSettingsFragmentTest {

    private lateinit var fragment: AddonInternalSettingsFragment
    private lateinit var navController: NavController
    private val addonManager = mockk<AddonManager>()

    @Before
    fun setup() {
        fragment = spyk(AddonInternalSettingsFragment())
        navController = mockk(relaxed = true)
        every { fragment.provideNavController() } returns navController
        every { fragment.provideAddonManager() } returns addonManager
    }

    @Test
    fun `GIVEN the options page content can go back WHEN pressing back THEN the content handles it and does not navigate away`() {
        fragment.onNavigationStateChange(canGoBack = true, canGoForward = null)

        assertTrue(fragment.onBackPressed())

        verify(exactly = 0) { navController.popBackStack(any<Int>(), any()) }
        verify(exactly = 0) { navController.navigate(any<NavDirections>(), any<NavOptions>()) }
    }

    @Test
    fun `GIVEN the content cannot go back AND the details screen is on the back stack WHEN pressing back THEN pop back to it`() {
        fragment.onNavigationStateChange(canGoBack = false, canGoForward = null)
        every { navController.popBackStack(R.id.installedAddonDetailsFragment, false) } returns true

        assertTrue(fragment.onBackPressed())

        verify { navController.popBackStack(R.id.installedAddonDetailsFragment, false) }
        verify(exactly = 0) { navController.navigate(any<NavDirections>(), any<NavOptions>()) }
    }

    @Test
    fun `GIVEN the options page was opened on its own WHEN navigating back THEN navigate to the addon details`() =
        runTest {
            coEvery { addonManager.getAddonByID(ADD_ON_ID) } returns mockAddon()

            fragment.navigateToInstalledAddonDetailsFor(ADD_ON_ID)

            val directions = slot<NavDirections>()
            verify {
                navController.navigate(capture(directions), any<NavOptions>())
            }
            assertEquals(
                R.id.action_global_to_installedAddonDetailsFragment,
                directions.captured.actionId,
            )
        }

    @Test
    fun `GIVEN the addon cannot be resolved WHEN navigating back THEN navigate up`() = runTest {
        coEvery { addonManager.getAddonByID(ADD_ON_ID) } returns null

        fragment.navigateToInstalledAddonDetailsFor(ADD_ON_ID)

        verify { navController.navigateUp() }
        verify(exactly = 0) { navController.navigate(any<NavDirections>(), any<NavOptions>()) }
    }

    private fun mockAddon(): Addon {
        val addon: Addon = mockk()
        every { addon.id } returns ADD_ON_ID
        return addon
    }

    companion object {
        private const val ADD_ON_ID = "some-addon-id"
    }
}
