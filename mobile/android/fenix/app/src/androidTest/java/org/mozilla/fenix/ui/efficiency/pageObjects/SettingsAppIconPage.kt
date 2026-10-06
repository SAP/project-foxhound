/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.pageObjects

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestHelper
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.PageStateTracker
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep
import org.mozilla.fenix.ui.efficiency.selectors.SettingsAppIconSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsCustomizeSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSelectors

class SettingsAppIconPage(composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>) : BasePage(composeRule) {
    override val pageName = "SettingsAppIconPage"

    init {
        NavigationRegistry.register(
            from = "SettingsCustomizePage",
            to = pageName,
            steps = listOf(NavigationStep.Click(SettingsCustomizeSelectors.SELECT_APP_ICON_TITLE)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsCustomizePage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.GO_BACK_BUTTON)),
        )
    }

    override fun navigateToPage(url: String, forceNavigation: Boolean): SettingsAppIconPage {
        super.navigateToPage(url, forceNavigation)
        return this
    }

    fun clickAppIconOption(selector: Selector): SettingsAppIconPage {
        mozClick(selector)
        return this
    }

    fun clickChangeIconButton(): SettingsAppIconPage {
        mozClick(SettingsAppIconSelectors.CHANGE_ICON_DIALOG_CHANGE_BUTTON)
        return this
    }

    fun restartApp(): SettingsAppIconPage {
        TestHelper.restartApp(composeRule.activityRule)
        PageStateTracker.currentPageName = "AppEntry"
        return this
    }

    override fun mozGetSelectorsByGroup(group: String): List<Selector> {
        return SettingsAppIconSelectors.all.filter { it.groups.contains(group) }
    }
}
