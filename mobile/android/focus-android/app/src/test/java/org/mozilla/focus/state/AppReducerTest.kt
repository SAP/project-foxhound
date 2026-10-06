package org.mozilla.focus.state

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertSame
import org.junit.Test

class AppReducerTest {

    @Test
    fun `test showFirstRun() should return the correct state when in other screen than FirstRun`() {
        val initialState = AppState(screen = Screen.Home)
        val expectedState = showFirstRun(initialState)

        assertNotSame(initialState, expectedState)
        assertEquals(Screen.FirstRun, expectedState.screen)
    }

    @Test
    fun `test showFirstRun() should return the correct state when already in FirstRun`() {
        val initialState = AppState(screen = Screen.FirstRun)
        val expectedState = showFirstRun(initialState)

        assertSame(initialState, expectedState)
        assertEquals(Screen.FirstRun, expectedState.screen)
    }

    @Test
    fun `test showOnBoardingSecondScreen() should return the correct state when in other screen than OnboardingSecondScreen`() {
        val initialState = AppState(screen = Screen.Home)
        val expectedState = showOnBoardingSecondScreen(initialState)

        assertNotSame(initialState, expectedState)
        assertEquals(Screen.OnboardingSecondScreen, expectedState.screen)
    }

    @Test
    fun `test showOnBoardingSecondScreen() should return the correct state when already in OnboardingSecondScreen`() {
        val initialState = AppState(screen = Screen.OnboardingSecondScreen)
        val expectedState = showOnBoardingSecondScreen(initialState)

        assertSame(initialState, expectedState)
        assertEquals(Screen.OnboardingSecondScreen, expectedState.screen)
    }

    @Test
    fun `test showHomeScreen() should return the correct state when in other screen than Home`() {
        val initialState = AppState(screen = Screen.Browser(tabId = "tab1", showTabs = true))
        val expectedState = showHomeScreen(initialState)

        assertNotSame(initialState, expectedState)
        assertEquals(Screen.Home, expectedState.screen)
    }

    @Test
    fun `test showHomeScreen() should return the correct state when already in Home`() {
        val initialState = AppState(screen = Screen.Home)
        val expectedState = showHomeScreen(initialState)

        assertSame(initialState, expectedState)
        assertEquals(Screen.Home, expectedState.screen)
    }

    @Test
    fun `test lock() should return the correct state when in other screen than Locked`() {
        val initialState = AppState(screen = Screen.Home)
        val action = AppAction.Lock()
        val expectedState = lock(initialState, action)

        assertNotSame(initialState, expectedState)
        assertEquals(Screen.Locked(bundle = null), expectedState.screen)
    }

    @Test
    fun `test lock() should return the correct state when already in Locked`() {
        val initialState = AppState(screen = Screen.Locked())
        val action = AppAction.Lock()
        val expectedState = lock(initialState, action)

        assertSame(initialState, expectedState)
        assertEquals(Screen.Locked(), expectedState.screen)
    }
}
