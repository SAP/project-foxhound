/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.pageObjects

import android.util.Log
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.Visibility
import androidx.test.espresso.matcher.ViewMatchers.hasSibling
import androidx.test.espresso.matcher.ViewMatchers.withEffectiveVisibility
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.uiautomator.UiScrollable
import androidx.test.uiautomator.UiSelector
import org.hamcrest.Matchers.allOf
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeShort
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSelectors

class SettingsPage(composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>) : BasePage(composeRule) {
    override val pageName = "SettingsPage"

    init {
        NavigationRegistry.register(
            from = "MainMenuPage",
            to = pageName,
            steps = listOf(NavigationStep.Click(MainMenuSelectors.SETTINGS_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "HomePage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.GO_BACK_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsAccessibilityPage",
            steps = listOf(
                NavigationStep.Swipe(SettingsSelectors.ACCESSIBILITY_BUTTON),
                NavigationStep.Click(SettingsSelectors.ACCESSIBILITY_BUTTON),
            ),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsAutofillPage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.AUTOFILL_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsCustomizePage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.CUSTOMIZE_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsHomepagePage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.HOMEPAGE_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsPasswordsPage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.PASSWORDS_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsSearchPage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.SEARCH_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsTabsPage",
            steps = listOf(NavigationStep.Click(SettingsSelectors.TABS_BUTTON)),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "GooglePlayPage",
            steps = listOf(
                NavigationStep.Swipe(SettingsSelectors.RATE_ON_GOOGLE_PLAY_BUTTON),
                NavigationStep.Click(SettingsSelectors.RATE_ON_GOOGLE_PLAY_BUTTON),
            ),
        )
        NavigationRegistry.register(
            from = pageName,
            to = "SettingsAboutPage",
            steps = listOf(
                NavigationStep.Swipe(SettingsSelectors.ABOUT_FIREFOX_BUTTON),
                NavigationStep.Click(SettingsSelectors.ABOUT_FIREFOX_BUTTON),
            ),
        )
    }

    override fun mozGetSelectorsByGroup(group: String): List<Selector> {
        return SettingsSelectors.all.filter { it.groups.contains(group) }
    }

    override fun navigateToPage(url: String, forceNavigation: Boolean): SettingsPage {
        super.navigateToPage(url, forceNavigation)
        return this
    }

    fun verifyHttpsOnlyModeOnAllTabs(): SettingsPage {
        return verifySettingOptionSummary(
            SettingsSelectors.HTTPS_ONLY_MODE_BUTTON.value,
            SettingsSelectors.HTTPS_ONLY_MODE_ON_ALL_TABS_SUMMARY.value,
        )
    }

    fun verifySettingOptionSummary(setting: String, summary: String): SettingsPage {
        val appView = UiScrollable(UiSelector().scrollable(true))
        appView.waitForExists(waitingTimeShort)
        if (appView.exists()) {
            try {
                appView.scrollTextIntoView(setting)
            } catch (e: Exception) {
                Log.w("SettingsPage", "scrollTextIntoView failed for '$setting': ${e.message}")
            }
        }
        onView(allOf(withText(setting), hasSibling(withText(summary))))
            .check(matches(withEffectiveVisibility(Visibility.VISIBLE)))
        return this
    }
}
