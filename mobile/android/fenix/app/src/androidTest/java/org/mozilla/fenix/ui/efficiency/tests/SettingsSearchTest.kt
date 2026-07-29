/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.SettingsSearchDefaultSearchEngineSelectors.DEFAULT_SEARCH_ENGINE_OPTION
import org.mozilla.fenix.ui.efficiency.selectors.ToolbarSelectors.SEARCH_ENGINE_SELECTOR_ICON

class SettingsSearchTest : BaseTest() {
    private val defaultSearchEngineList =
        listOf(
            "Bing",
            "DuckDuckGo",
            "Google",
        )

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2203333
    @Ignore("Covered by verifyNavigationReachability[1: SettingsSearchPage (TBD) — Navigation Reachability]")
    @Test
    fun verifySearchSettingsMenuItemsTest() {
        // Given: App is loaded with default settings
        // on = AndroidComposeTestRule<HomeActivityIntentTestRule, *> with app defaults

        // When: We navigate to the Settings 'Search' page
        on.settingsSearch.navigateToPage()

        // Then: all elements should load
        // by default navigateToPage() asserts all 'requiredForPage' elements are present
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2203308
    @SmokeTest
    @Test
    fun verifyTheDefaultSearchEngineCanBeChangedTest() {
        defaultSearchEngineList.forEach {
            on.settingsSearchDefaultSearchEngine.navigateToPage()
                .mozClick(DEFAULT_SEARCH_ENGINE_OPTION(engineName = it))
            on.home.navigateToPage()
                .mozVerify(SEARCH_ENGINE_SELECTOR_ICON(searchEngineName = it))
        }
    }
}
