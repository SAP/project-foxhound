/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.home

import android.view.LayoutInflater
import androidx.core.view.isVisible
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.spyk
import io.mockk.unmockkStatic
import io.mockk.verify
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.utils.ext.isLandscape
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.HomeActivity
import org.mozilla.fenix.databinding.FragmentHomeBinding
import org.mozilla.fenix.ext.isTablet
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.helpers.FenixRobolectricTestRunner

@RunWith(FenixRobolectricTestRunner::class)
class ToolbarViewTest {

    private lateinit var binding: FragmentHomeBinding
    private lateinit var toolbarView: ToolbarView

    @Before
    fun setup() {
        mockkStatic("mozilla.components.support.utils.ext.ContextKt")
        mockkStatic("org.mozilla.fenix.ext.ContextKt")

        val homeFragment: HomeFragment = mockk(relaxed = true)
        val homeActivity: HomeActivity = mockk(relaxed = true)
        binding = FragmentHomeBinding.inflate(LayoutInflater.from(testContext))
        every { homeFragment.requireContext() } returns testContext
        every { testContext.settings() } returns mockk(relaxed = true)
        toolbarView = spyk(ToolbarView(binding, mockk(relaxed = true), homeFragment, homeActivity, {}, {}))
        every { toolbarView.buildHomeMenu() } returns mockk(relaxed = true)
        every { toolbarView.buildTabCounter() } returns mockk(relaxed = true)
    }

    @After
    fun teardown() {
        unmockkStatic("mozilla.components.support.utils.ext.ContextKt")
        unmockkStatic("org.mozilla.fenix.ext.ContextKt")
    }

    @Test
    fun `GIVEN navbar is visible WHEN updateLayout is called THEN tab counter and menu are gone and not initialized`() {
        every { testContext.settings().navigationToolbarEnabled } returns true
        toolbarView.updateButtonVisibility()

        assertFalse(binding.menuButton.isVisible)
        assertFalse(binding.tabButton.isVisible)
        assertNull(toolbarView.homeMenuView)
        assertNull(toolbarView.tabCounterView)
    }

    @Test
    fun `GIVEN navbar isn't visible WHEN updateLayout is called THEN tab counter and menu are visible and initialized`() {
        every { testContext.settings().navigationToolbarEnabled } returns false
        toolbarView.updateButtonVisibility()

        assertTrue(binding.menuButton.isVisible)
        assertTrue(binding.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)
    }

    @Test
    fun `GIVEN mode is landscape WHEN updateLayout is called THEN tab counter and menu are visible and initialized`() {
        every { testContext.isLandscape() } returns true

        every { testContext.settings().navigationToolbarEnabled } returns false

        toolbarView.updateButtonVisibility()

        assertTrue(binding.menuButton.isVisible)
        assertTrue(binding.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)

        every { testContext.settings().navigationToolbarEnabled } returns true

        toolbarView.updateButtonVisibility()

        assertTrue(binding.menuButton.isVisible)
        assertTrue(binding.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)
    }

    @Test
    fun `GIVEN device is tablet WHEN updateLayout is called THEN tab counter and menu are visible and initialized`() {
        every { testContext.isTablet() } returns true

        every { testContext.settings().navigationToolbarEnabled } returns false

        toolbarView.updateButtonVisibility()

        assertTrue(binding.menuButton.isVisible)
        assertTrue(binding.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)

        every { testContext.settings().navigationToolbarEnabled } returns true

        toolbarView.updateButtonVisibility()

        assertTrue(binding.menuButton.isVisible)
        assertTrue(binding.tabButton.isVisible)
        assertNotNull(toolbarView.tabCounterView)
        assertNotNull(toolbarView.homeMenuView)
    }

    @Test
    fun `WHEN build is called THEN layout gets updated`() {
        toolbarView.build()

        verify(exactly = 1) { toolbarView.updateButtonVisibility() }
    }

    @Test
    fun `WHEN dismissMenu is called THEN dismissMenu is called on homeMenuView`() {
        val homeMenuView: HomeMenuView = mockk(relaxed = true)
        toolbarView.homeMenuView = homeMenuView

        toolbarView.dismissMenu()

        verify { homeMenuView.dismissMenu() }
    }

    @Test
    fun `WHEN updateTabCounter is called THEN update is called on tabCounterView`() {
        val tabCounterView: TabCounterView = mockk(relaxed = true)
        toolbarView.tabCounterView = tabCounterView

        toolbarView.updateTabCounter(mockk(relaxed = true))

        verify { tabCounterView.update(any()) }
    }
}
