/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.pageObjects

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.ui.efficiency.helpers.BasePage
import org.mozilla.fenix.ui.efficiency.helpers.Selector
import org.mozilla.fenix.ui.efficiency.navigation.NavigationRegistry
import org.mozilla.fenix.ui.efficiency.navigation.NavigationStep
import org.mozilla.fenix.ui.efficiency.selectors.BrowserPageSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SearchBarSelectors
import org.mozilla.fenix.ui.efficiency.selectors.ToolbarSelectors

class BrowserPage(composeRule: AndroidComposeTestRule<HomeActivityIntentTestRule, *>) : BasePage(composeRule) {
    override val pageName = "BrowserPage"

    init {
        NavigationRegistry.register(
            from = "HomePage",
            to = pageName,
            steps = listOf(
                NavigationStep.Click(ToolbarSelectors.TOOLBAR_URL_BOX),
                NavigationStep.EnterText(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE),
                NavigationStep.PressEnter(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE),
            ),
        )

        NavigationRegistry.register(
            from = pageName,
            to = pageName,
            steps = listOf(
                NavigationStep.Click(ToolbarSelectors.TOOLBAR_URL_BOX),
                NavigationStep.EnterText(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE),
                NavigationStep.PressEnter(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE),
            ),
        )

        NavigationRegistry.register(
            from = "SearchBarComponent",
            to = pageName,
            steps = listOf(
                NavigationStep.EnterText(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE),
                NavigationStep.PressEnter(SearchBarSelectors.TOOLBAR_IN_EDIT_MODE),
            ),
        )
    }

    override fun mozGetSelectorsByGroup(group: String): List<Selector> {
        return BrowserPageSelectors.all.filter { it.groups.contains(group) }
    }
}
