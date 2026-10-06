package org.mozilla.fenix.ui.efficiency.pageObjects

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep
import org.mozilla.fenix.ui.efficiency.selectors.HomeSelectors
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSearchDefaultSearchEngineSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSearchSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSelectors

class SettingsSearchDefaultSearchEnginePage(composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>) : BasePage(composeRule) {
    override val pageName = "SettingsSearchDefaultSearchEnginePage"

    init {
        NavigationRegistry.register(
            from = "HomePage",
            to = pageName,
            steps = listOf(
                NavigationStep.Click(HomeSelectors.MAIN_MENU_BUTTON),
                NavigationStep.Click(MainMenuSelectors.SETTINGS_BUTTON),
                NavigationStep.Click(SettingsSelectors.SEARCH_BUTTON),
                NavigationStep.Click(SettingsSearchSelectors.DEFAULT_SEARCH_ENGINE_SETTING_OPTION),
            ),
        )

        NavigationRegistry.register(
            from = pageName,
            to = "HomePage",
            steps = listOf(
                NavigationStep.Click(SettingsSelectors.GO_BACK_BUTTON),
                NavigationStep.Click(SettingsSelectors.GO_BACK_BUTTON),
                NavigationStep.Click(SettingsSelectors.GO_BACK_BUTTON),
            ),
        )
    }

    override fun mozGetSelectorsByGroup(group: String): List<Selector> {
        return SettingsSearchDefaultSearchEngineSelectors.all.filter { it.groups.contains(group) }
    }
}
