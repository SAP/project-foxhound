/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.tabstray.ui

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.tabstray.Page

private val ToolbarHeight = 10.dp
private val ToolbarPaddingValues = PaddingValues(vertical = ToolbarHeight)

class DefaultTabManagerAnimationHelperTest {

    /**
     * [DefaultTabManagerAnimationHelper.animationsEnabled] coverage
    */

    @Test
    fun `WHEN the animation feature flag is disabled THEN the opening animation is disabled`() {
        assertFalse(createHelper(animationEnabled = false).animationsEnabled)
    }

    @Test
    fun `WHEN the animation feature flag is enabled THEN the opening animation is enabled`() {
        assertTrue(createHelper(animationEnabled = true).animationsEnabled)
    }

    /**
     * [DefaultTabManagerAnimationHelper.shouldAnimateOnTabManagerOpen] coverage
     */

    @Test
    fun `GIVEN the previous destination is the Browser WHEN launching the Tab Manager THEN the opening animation should run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url"),
            previousDestinationId = R.id.browserFragment,
        ).shouldAnimateOnTabManagerOpen
        assertTrue(actualShouldTransition)
    }

    @Test
    fun `GIVEN the previous destination is the Homescreen and HNT is enabled WHEN launching the Tab Manager THEN the opening animation should run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url"),
            previousDestinationId = R.id.homeFragment,
            homepageAsANewTabEnabled = true,
        ).shouldAnimateOnTabManagerOpen
        assertTrue(actualShouldTransition)
    }

    @Test
    fun `GIVEN the selected tab is null WHEN launching the Tab Manager THEN the opening animation should not run`() {
        assertFalse(createHelper(selectedTab = null).shouldAnimateOnTabManagerOpen)
    }

    @Test
    fun `GIVEN the selected tab is private and the initial page is Normal WHEN launching the Tab Manager THEN the opening animation should not run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url", private = true),
            initialPage = Page.NormalTabs,
        ).shouldAnimateOnTabManagerOpen
        assertFalse(actualShouldTransition)
    }

    @Test
    fun `GIVEN the selected tab is normal and the initial page is Private WHEN launching the Tab Manager THEN the opening animation should not run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url", private = false),
            initialPage = Page.PrivateTabs,
        ).shouldAnimateOnTabManagerOpen
        assertFalse(actualShouldTransition)
    }

    @Test
    fun `GIVEN the initial page is Synced WHEN launching the Tab Manager THEN the opening animation should not run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url"),
            initialPage = Page.SyncedTabs,
        ).shouldAnimateOnTabManagerOpen
        assertFalse(actualShouldTransition)
    }

    @Test
    fun `GIVEN the previous destination is neither the Browser nor Home WHEN launching the Tab Manager THEN the opening animation should not run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url"),
            previousDestinationId = R.id.aboutFragment,
        ).shouldAnimateOnTabManagerOpen
        assertFalse(actualShouldTransition)
    }

    @Test
    fun `GIVEN the previous destination is Home and HNT is disabled WHEN launching the Tab Manager THEN the opening animation should not run`() {
        val actualShouldTransition = createHelper(
            selectedTab = createTab(url = "url"),
            previousDestinationId = R.id.homeFragment,
            homepageAsANewTabEnabled = false,
        ).shouldAnimateOnTabManagerOpen
        assertFalse(actualShouldTransition)
    }

    /**
     * [DefaultTabManagerAnimationHelper.state] coverage
     */

    @Test
    fun `GIVEN the selected tab is null WHEN the helper is created THEN the initial state should be the thumbnail to tab manager transition`() {
        val expectedInitialState = TabManagerAnimationState.ThumbnailToTabManager
        val actualInitialState = createHelper(selectedTab = null).state
        assertEquals(expectedInitialState, actualInitialState)
    }

    @Test
    fun `GIVEN there is to be no opening animation WHEN the helper is created THEN the initial state should thumbnail to tab manager transition`() {
        val expectedInitialState = TabManagerAnimationState.ThumbnailToTabManager
        val actualInitialState = createHelperThatDoesNotTransition().state
        assertEquals(expectedInitialState, actualInitialState)
    }

    @Test
    fun `GIVEN there is to be an opening animation and the selected tab is not null WHEN the helper is created THEN the initial state should be the tab manager to thumbnail transition`() {
        val expectedTab = createTab("expected.tab")
        val expectedInitialState = TabManagerAnimationState.TabManagerToThumbnail(tab = expectedTab)
        val actualInitialState = createHelperThatTransitions(selectedTab = expectedTab).state
        assertEquals(expectedInitialState, actualInitialState)
    }

    /**
     * [DefaultTabManagerAnimationHelper.transitionPaddingValues] coverage
     */

    @Test
    fun `GIVEN the previous destination was the Homescreen WHEN launching the Tab Manager THEN the padding values should incorporate the toolbar heights`() {
        val actualPaddingValues = createHelperWithToolbar(
            previousDestinationId = R.id.homeFragment,
        ).transitionPaddingValues
        assertEquals(ToolbarPaddingValues, actualPaddingValues)
    }

    @Test
    fun `GIVEN the previous destination was the Browser WHEN launching the Tab Manager THEN the padding values should incorporate the toolbar heights`() {
        val actualPaddingValues = createHelperWithToolbar(
            previousDestinationId = R.id.browserFragment,
        ).transitionPaddingValues
        assertEquals(ToolbarPaddingValues, actualPaddingValues)
    }

    @Test
    fun `GIVEN the previous destination was neither the Homescreen nor the Browser WHEN launching the Tab Manager THEN the padding values should be zero`() {
        val expectedPaddingValues = PaddingValues()
        val actualPaddingValues = createHelper(
            previousDestinationId = R.id.bookmarkFragment,
        ).transitionPaddingValues
        assertEquals(expectedPaddingValues, actualPaddingValues)
    }

    /**
     * [DefaultTabManagerAnimationHelper.leaveTabManager] coverage
     */

    @Test
    fun `GIVEN the the selected tab is null WHEN leaving the Tab Manager THEN the tab manager does not animate`() {
        val helper = createHelper(selectedTab = null)
        val expectedState = TabManagerAnimationState.ThumbnailToTabManager
        helper.leaveTabManager()
        assertEquals(expectedState, helper.state)
    }

    @Test
    fun `GIVEN the the selected tab is not null WHEN leaving the Tab Manager THEN the tab manager animates to the fullscreen thumbnail`() {
        val tab = createTab(url = "url")
        val helper = createHelper(selectedTab = tab)
        val expectedState = TabManagerAnimationState.TabManagerToThumbnail(tab = tab)
        helper.leaveTabManager()
        assertEquals(expectedState, helper.state)
    }

    /**
     * [DefaultTabManagerAnimationHelper.transitionToTabManager] coverage
     */

    @Test
    fun `WHEN requested to transition to the tab manager THEN the tab manager animates into view`() {
        val helper = createHelper()
        val expectedState = TabManagerAnimationState.ThumbnailToTabManager
        helper.leaveTabManager()
        assertEquals(expectedState, helper.state)
    }

    /**
     * [DefaultTabManagerAnimationHelper.transitionToThumbnail] coverage
     */

    @Test
    fun `WHEN the tab manager is transitioning to the fullscreen thumbnail THEN the selected tab should be transitioned to`() {
        val originalTab = createTab(url = "originalTab")
        val transitionTab = createTab(url = "transitionTab")
        val helper = createHelper(selectedTab = originalTab)
        helper.transitionToThumbnail(tab = transitionTab)
        val actualTab = (helper.state as TabManagerAnimationState.TabManagerToThumbnail).tab
        assertEquals(transitionTab, actualTab)
    }

    private fun createHelperThatTransitions(selectedTab: TabSessionState) = createHelper(
        selectedTab = selectedTab,
        previousDestinationId = R.id.browserFragment,
    )

    private fun createHelperThatDoesNotTransition() = createHelper(selectedTab = null)

    private fun createHelperWithToolbar(previousDestinationId: Int? = null) = createHelper(
        previousDestinationId = previousDestinationId,
        topToolbarHeight = ToolbarHeight,
        bottomToolbarHeight = ToolbarHeight,
    )

    private fun createHelper(
        selectedTab: TabSessionState? = null,
        initialPage: Page = Page.NormalTabs,
        previousDestinationId: Int? = null,
        homepageAsANewTabEnabled: Boolean = false,
        topToolbarHeight: Dp = 0.dp,
        bottomToolbarHeight: Dp = 0.dp,
        animationEnabled: Boolean = true,
    ) = DefaultTabManagerAnimationHelper(
        selectedTab = selectedTab,
        animationsEnabled = animationEnabled,
        initialPage = initialPage,
        previousDestinationId = previousDestinationId,
        homepageAsANewTabEnabled = homepageAsANewTabEnabled,
        topToolbarHeight = topToolbarHeight,
        bottomToolbarHeight = bottomToolbarHeight,
    )
}
