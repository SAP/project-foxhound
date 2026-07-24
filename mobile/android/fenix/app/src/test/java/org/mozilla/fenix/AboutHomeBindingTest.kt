/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix

import androidx.navigation.NavController
import androidx.navigation.NavDestination
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import mozilla.components.browser.state.action.ContentAction
import mozilla.components.browser.state.state.BrowserState
import mozilla.components.browser.state.state.TabSessionState
import mozilla.components.browser.state.state.createTab
import mozilla.components.browser.state.store.BrowserStore
import mozilla.components.concept.engine.utils.ABOUT_HOME_URL
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.never
import org.mockito.Mockito.verify

@RunWith(AndroidJUnit4::class)
class AboutHomeBindingTest {
    private val testDispatcher = StandardTestDispatcher()

    private lateinit var browserStore: BrowserStore
    private lateinit var tabId: String
    private lateinit var navController: NavController

    private val tab: TabSessionState
        get() = browserStore.state.tabs.find { it.id == tabId }!!

    @Before
    fun setUp() {
        navController = mock()

        val tab = createTab(url = "https://www.mozilla.org").also {
            tabId = it.id
        }
        browserStore = BrowserStore(
            initialState = BrowserState(
                tabs = listOf(tab),
                selectedTabId = tabId,
            ),
        )
    }

    @Test
    fun `WHEN URL is updated to ABOUT_HOME THEN navigate to the homepage`() = runTest(testDispatcher) {
        val binding = AboutHomeBinding(
            browserStore = browserStore,
            navController = navController,
            mainDispatcher = testDispatcher,
        )

        binding.start()

        browserStore.dispatch(
            ContentAction.UpdateUrlAction(
                sessionId = tab.id,
                url = ABOUT_HOME_URL,
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(ABOUT_HOME_URL, tab.content.url)

        verify(navController).navigate(NavGraphDirections.actionGlobalHome())
    }

    @Test
    fun `GIVEN homepage is the currently shown WHEN URL is updated to ABOUT_HOME THEN do not navigate to the homepage`() = runTest(testDispatcher) {
        val mockDestination: NavDestination = mock()
        whenever(mockDestination.id).thenReturn(R.id.homeFragment)
        whenever(navController.currentDestination).thenReturn(mockDestination)

        val binding = AboutHomeBinding(
            browserStore = browserStore,
            navController = navController,
            mainDispatcher = testDispatcher,
        )

        binding.start()

        browserStore.dispatch(
            ContentAction.UpdateUrlAction(
                sessionId = tabId,
                url = ABOUT_HOME_URL,
            ),
        )

        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(ABOUT_HOME_URL, tab.content.url)

        verify(navController, never()).navigate(NavGraphDirections.actionGlobalHome())
    }

    @Test
    fun `GIVEN onboarding is the currently shown WHEN URL is updated to ABOUT_HOME THEN do not navigate to the homepage`() = runTest(testDispatcher) {
        val mockDestination: NavDestination = mock()
        whenever(mockDestination.id).thenReturn(R.id.onboardingFragment)
        whenever(navController.currentDestination).thenReturn(mockDestination)

        val binding = AboutHomeBinding(
            browserStore = browserStore,
            navController = navController,
            mainDispatcher = testDispatcher,
            )

        binding.start()

        browserStore.dispatch(
            ContentAction.UpdateUrlAction(
                sessionId = tabId,
                url = ABOUT_HOME_URL,
            ),
        )

        // Wait for ContentAction.UpdateUrlAction
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(ABOUT_HOME_URL, tab.content.url)

        verify(navController, never()).navigate(NavGraphDirections.actionGlobalHome())
    }

    @Test
    fun `WHEN URL is updated to a URL that is not ABOUT_HOME THEN do not navigate to the homepage`() = runTest(testDispatcher) {
        val binding = AboutHomeBinding(
            browserStore = browserStore,
            navController = navController,
        )

        binding.start()

        val newUrl = "https://www.firefox.com"
        browserStore.dispatch(
            ContentAction.UpdateUrlAction(
                sessionId = tabId,
                url = newUrl,
            ),
        )

        // Wait for ContentAction.UpdateUrlAction
        testDispatcher.scheduler.advanceUntilIdle()

        assertEquals(newUrl, tab.content.url)

        verify(navController, never()).navigate(NavGraphDirections.actionGlobalHome())
    }
}
