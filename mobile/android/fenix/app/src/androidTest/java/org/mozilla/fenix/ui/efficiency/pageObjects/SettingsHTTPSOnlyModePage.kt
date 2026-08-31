/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.pageObjects

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isChecked
import androidx.test.espresso.matcher.ViewMatchers.isNotChecked
import androidx.test.espresso.matcher.ViewMatchers.withId
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestHelper.appContext
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep
import org.mozilla.fenix.ui.efficiency.selectors.HomeSelectors
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsHTTPSOnlyModeSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSelectors

class SettingsHTTPSOnlyModePage(composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>) : BasePage(composeRule) {
    override val pageName = "SettingsHTTPSOnlyModePage"

    init {
        NavigationRegistry.register(
            from = "HomePage",
            to = pageName,
            steps = listOf(
                NavigationStep.Click(HomeSelectors.MAIN_MENU_BUTTON),
                NavigationStep.Click(MainMenuSelectors.SETTINGS_BUTTON),
                NavigationStep.Swipe(SettingsSelectors.HTTPS_ONLY_MODE_BUTTON),
                NavigationStep.Click(SettingsSelectors.HTTPS_ONLY_MODE_BUTTON),
            ),
        )

        NavigationRegistry.register(
            from = pageName,
            to = "SettingsPage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.GO_BACK_BUTTON)),
        )
    }

    override fun mozGetSelectorsByGroup(group: String): List<Selector> {
        return SettingsHTTPSOnlyModeSelectors.all.filter { it.groups.contains(group) }
    }

    override fun navigateToPage(url: String, forceNavigation: Boolean): SettingsHTTPSOnlyModePage {
        super.navigateToPage(url, forceNavigation)
        return this
    }

    fun enableHttpsOnlyMode(): SettingsHTTPSOnlyModePage {
        if (!appContext.components.settings.shouldUseHttpsOnly) {
            mozClick(SettingsHTTPSOnlyModeSelectors.HTTPS_ONLY_MODE_TOGGLE)
        }
        return this
    }

    fun verifyHttpsOnlyAllTabsSelected(): SettingsHTTPSOnlyModePage {
        onView(withId(R.id.https_only_all_tabs)).check(matches(isChecked()))
        onView(withId(R.id.https_only_private_tabs)).check(matches(isNotChecked()))
        return this
    }
}
