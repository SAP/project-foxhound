/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.RetryTestRule
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestHelper.waitUntilSnackbarGone
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar

/**
 *  Tests for verifying the presence of home screen and first-run homescreen elements
 *
 *  Note: For private browsing, navigation bar and tabs see separate test class
 *
 */

class HomeScreenTest : TestSetup() {
    @get:Rule(order = 0)
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(),
        ) { it.activity }

    @get:Rule(order = 1)
    val memoryLeaksRule = DetectMemoryLeaksRule()

    @Rule(order = 2)
    @JvmField
    val retryTestRule = RetryTestRule(3)

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/235396
    @Test
    fun homeScreenItemsTest() {
        // Workaround to make sure the Pocket articles are populated before starting the test.
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.goBack(composeTestRule) {
            verifyHomeWordmark()
            verifyHomePrivateBrowsingButton()
            verifyExistingTopSitesTabs("Wikipedia")
            verifyExistingTopSitesTabs("Google")
            verifyCollectionsHeader()
            verifyNoCollectionsText()
            verifyThoughtProvokingStories(true)
            verifyNavigationToolbar()
            verifyHomeMenuButton()
            verifyTabCounter("0")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/244199
    @Test
    fun privateBrowsingHomeScreenItemsTest() {
        homeScreen(composeTestRule) {
        }.togglePrivateBrowsingMode()

        homeScreen(composeTestRule) {
            verifyPrivateBrowsingHomeScreenItems()
        }.openPrivateBrowsingModeLearnMoreLink {
            verifyUrl("common-myths-about-private-browsing")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1364362
    @SmokeTest
    @Test
    fun verifyJumpBackInSectionTest() {
        composeTestRule.activityRule.applySettingsExceptions {
            it.isRecentlyVisitedFeatureEnabled = false
            it.isPocketEnabled = false
        }

        val firstWebPage = mockWebServer.getGenericAsset(4)
        val secondWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            verifyPageContent(firstWebPage.content)
            verifyUrl(firstWebPage.url.toString())
        }.goToHomescreen {
            verifyJumpBackInSectionIsDisplayed()
            verifyJumpBackInItemTitle(composeTestRule, firstWebPage.title)
            verifyJumpBackInItemWithUrl(composeTestRule, firstWebPage.url.toString())
            verifyJumpBackInShowAllButton()
        }.clickJumpBackInShowAllButton {
            verifyExistingOpenTabs(firstWebPage.title)
        }.closeTabDrawer {
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(secondWebPage.url) {
            verifyPageContent(secondWebPage.content)
            verifyUrl(secondWebPage.url.toString())
        }.goToHomescreen {
            verifyJumpBackInSectionIsDisplayed()
            verifyJumpBackInItemTitle(composeTestRule, secondWebPage.title)
            verifyJumpBackInItemWithUrl(composeTestRule, secondWebPage.url.toString())
        }.openTabDrawer {
            closeTabWithTitle(secondWebPage.title)
            waitUntilSnackbarGone()
            verifyExistingOpenTabs(firstWebPage.title)
        }.closeTabDrawer {
        }

        homeScreen(composeTestRule) {
            verifyJumpBackInSectionIsDisplayed()
            verifyJumpBackInItemTitle(composeTestRule, firstWebPage.title)
            verifyJumpBackInItemWithUrl(composeTestRule, firstWebPage.url.toString())
        }.openTabDrawer {
            closeTab()
        }

        homeScreen(composeTestRule) {
            verifyJumpBackInSectionIsNotDisplayed()
        }
    }
}
