/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.home.toolbar

import android.content.Context
import android.content.res.Configuration
import android.view.LayoutInflater
import androidx.core.view.isVisible
import io.mockk.every
import io.mockk.mockk
import io.mockk.spyk
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.databinding.FragmentHomeBinding
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.home.HomeFragment
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class HomeToolbarViewTest {

    private lateinit var binding: FragmentHomeBinding
    private lateinit var toolbarView: HomeToolbarView

    private lateinit var context: Context

    @Before
    fun setup() {
        context = spyk(testContext)

        val homeFragment: HomeFragment = mockk(relaxed = true)
        val homeActivity: HomeActivity = mockk(relaxed = true)
        binding = FragmentHomeBinding.inflate(LayoutInflater.from(testContext))
        every { homeFragment.requireContext() } returns context
        every { context.components.settings } returns mockk(relaxed = true)
        toolbarView =
            spyk(
                HomeToolbarView(
                    binding,
                    mockk(relaxed = true),
                    homeFragment,
                    homeActivity,
                ),
            )
        every { toolbarView.buildHomeMenu() } returns mockk(relaxed = true)
        every { toolbarView.buildTabCounter() } returns mockk(relaxed = true)
    }

    @Test
    fun `WHEN updateLayout is called THEN tab counter and menu are visible and initialized`() {
        toolbarView.updateButtonVisibility(mockk(relaxed = true))

        assertTrue(toolbarView.menuButton.isVisible)
        assertTrue(toolbarView.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)
    }

    @Test
    fun `GIVEN mode is landscape WHEN updateLayout is called THEN tab counter and menu are visible and initialized`() {
        toolbarView.updateButtonVisibility(mockk(relaxed = true))

        assertTrue(toolbarView.menuButton.isVisible)
        assertTrue(toolbarView.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)
    }

    @Test
    fun `GIVEN device is tablet WHEN updateLayout is called THEN tab counter and menu are visible and initialized`() {
        val configuration = Configuration()
        configuration.smallestScreenWidthDp = 900

        every { context.resources.configuration } returns configuration

        toolbarView.updateButtonVisibility(mockk(relaxed = true))

        assertTrue(toolbarView.menuButton.isVisible)
        assertTrue(toolbarView.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)
    }

    @Test
    fun `WHEN build is called THEN layout gets updated`() {
        toolbarView.build(mockk(relaxed = true), mockk(relaxed = true))

        verify(exactly = 1) { toolbarView.updateButtonVisibility(any()) }
        verify(exactly = 1) { toolbarView.updateAddressBarVisibility(any()) }
    }

    @Test
    fun `WHEN updateTabCounter is called THEN update is called on tabCounterView`() {
        val tabCounterView: TabCounterView = mockk(relaxed = true)
        toolbarView.tabCounterView = tabCounterView

        toolbarView.updateTabCounter(mockk(relaxed = true))

        verify { tabCounterView.update(any()) }
    }
}
