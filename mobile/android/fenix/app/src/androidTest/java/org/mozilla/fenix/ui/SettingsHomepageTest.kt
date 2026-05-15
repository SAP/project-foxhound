/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.openAppFromExternalLink
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.RetryTestRule
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.restartApp
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar

/**
 *  Tests for verifying the Homepage settings menu
 *
 */
class SettingsHomepageTest : TestSetup() {
    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(skipOnboarding = true),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    @Rule
    @JvmField
    val retryTestRule = RetryTestRule(3)

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1564843
    @Test
    fun verifyHomepageSettingsTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openHomepageSubMenu {
            verifyHomePageView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1564859
    @Test
    fun verifyShortcutOptionTest() {
        // en-US defaults
        val defaultTopSites = arrayOf(
            "Wikipedia",
            "Google",
        )
        val genericURL = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
            defaultTopSites.forEach { item ->
                verifyExistingTopSitesTabs(item)
            }
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openHomepageSubMenu {
            clickShortcutsButton()
        }.goBack {
        }.goBack(composeTestRule) {
            defaultTopSites.forEach { item ->
                verifyNotExistingTopSiteItem(item)
            }
        }
        // Disabling the "Shortcuts" homepage setting option should remove the "Add to shortcuts" from main menu option
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
            verifyAddToShortcutsButton(isDisplayed = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1565003
    @Test
    fun verifyRecentlyVisitedOptionTest() {
        composeTestRule.activityRule.applySettingsExceptions {
            it.isRecentTabsFeatureEnabled = false
        }
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.goToHomescreen {
            verifyRecentlyVisitedSectionIsDisplayed(true)
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openHomepageSubMenu {
            clickRecentlyVisited()
        }.goBack {
        }.goBack(composeTestRule) {
            verifyRecentlyVisitedSectionIsDisplayed(false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1564999
    @SmokeTest
    @Test
    fun jumpBackInOptionTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.goToHomescreen {
            verifyJumpBackInSectionIsDisplayed()
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openHomepageSubMenu {
            clickJumpBackInButton()
        }.goBack {
        }.goBack(composeTestRule) {
            verifyJumpBackInSectionIsNotDisplayed()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1565000
    @SmokeTest
    @Test
    fun recentBookmarksOptionTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.openThreeDotMenu {
        }.clickBookmarkThisPageButton {
        }.goToHomescreen {
            verifyBookmarksSectionIsDisplayed(exists = true)
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openHomepageSubMenu {
            clickRecentBookmarksButton()
        }.goBack {
        }.goBack(composeTestRule) {
            verifyBookmarksSectionIsDisplayed(exists = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1569831
    @SmokeTest
    @Test
    fun verifyOpeningScreenOptionsTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
            verifySettingsOptionSummary("Homepage", "Open on homepage after four hours")
        }.openHomepageSubMenu {
            verifySelectedOpeningScreenOption("Homepage after four hours of inactivity")
            clickOpeningScreenOption("Homepage")
            verifySelectedOpeningScreenOption("Homepage")
        }

        restartApp(composeTestRule.activityRule)

        homeScreen(composeTestRule) {
            verifyHomeScreen()
        }.openThreeDotMenu {
        }.clickSettingsButton {
            verifySettingsOptionSummary("Homepage", "Open on homepage")
        }.openHomepageSubMenu {
            clickOpeningScreenOption("Last tab")
            verifySelectedOpeningScreenOption("Last tab")
        }.goBack {
            verifySettingsOptionSummary("Homepage", "Open on last tab")
        }

        restartApp(composeTestRule.activityRule)

        browserScreen(composeTestRule) {
            verifyUrl(genericURL.url.toString())
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1569843
    @Test
    fun verifyOpeningScreenAfterLaunchingExternalLinkTest() {
        val genericPage = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openHomepageSubMenu {
            clickOpeningScreenOption("Homepage")
        }.goBackToHomeScreen(composeTestRule) {
        }

        composeTestRule.activityRule.applySettingsExceptions {
            it.isTermsOfServiceAccepted = true

            with(composeTestRule.activityRule) {
                finishActivity()
                mDevice.waitForIdle()
                openAppFromExternalLink(composeTestRule, genericPage.url.toString())
            }
        }

        browserScreen(composeTestRule) {
            verifyPageContent(genericPage.content)
        }
    }
}
