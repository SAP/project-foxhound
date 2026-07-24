package org.mozilla.fenix.onboarding.store

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.onboarding.view.ThemeOptionType
import org.mozilla.fenix.onboarding.view.ToolbarOptionType

class OnboardingStoreTest {

    @Test
    fun `WHEN init action is dispatched THEN state is updated as expected`() {
        val store = OnboardingStore()

        store.dispatch(OnboardingAction.Init)

        val expected = OnboardingState(
            toolbarOptionSelected = ToolbarOptionType.TOOLBAR_TOP,
        )
        assertEquals(expected, store.state)
    }

    @Test
    fun `WHEN update selected toolbar action is dispatched THEN the toolbar state selected value is updated`() {
        val store = OnboardingStore()

        store.dispatch(OnboardingAction.OnboardingToolbarAction.UpdateSelected(ToolbarOptionType.TOOLBAR_BOTTOM))

        assertEquals(ToolbarOptionType.TOOLBAR_BOTTOM, store.state.toolbarOptionSelected)

        store.dispatch(OnboardingAction.OnboardingToolbarAction.UpdateSelected(ToolbarOptionType.TOOLBAR_TOP))

        assertEquals(ToolbarOptionType.TOOLBAR_TOP, store.state.toolbarOptionSelected)
    }

    @Test
    fun `WHEN update selected theme action is dispatched THEN the theme state selected value is updated`() {
        val store = OnboardingStore()

        store.dispatch(OnboardingAction.OnboardingThemeAction.UpdateSelected(ThemeOptionType.THEME_SYSTEM))

        assertEquals(ThemeOptionType.THEME_SYSTEM, store.state.themeOptionSelected)

        store.dispatch(OnboardingAction.OnboardingThemeAction.UpdateSelected(ThemeOptionType.THEME_LIGHT))

        assertEquals(ThemeOptionType.THEME_LIGHT, store.state.themeOptionSelected)

        store.dispatch(OnboardingAction.OnboardingThemeAction.UpdateSelected(ThemeOptionType.THEME_DARK))

        assertEquals(ThemeOptionType.THEME_DARK, store.state.themeOptionSelected)
    }
}
