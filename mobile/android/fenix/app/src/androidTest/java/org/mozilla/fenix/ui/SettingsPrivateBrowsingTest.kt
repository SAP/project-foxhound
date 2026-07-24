/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.AppAndSystemHelper
import org.mozilla.fenix.helpers.AppAndSystemHelper.clickSystemHomeScreenShortcutAddButton
import org.mozilla.fenix.helpers.DataGenerationHelper
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.restartApp
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.addToHomeScreen
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar

class SettingsPrivateBrowsingTest : TestSetup() {
    private val pageShortcutName = DataGenerationHelper.generateRandomString(5)

    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(
                skipOnboarding = true,
            ),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/555822
    @Test
    fun verifyPrivateBrowsingMenuItemsTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openPrivateBrowsingSubMenu {
            verifyAddPrivateBrowsingShortcutButton()
            verifyOpenLinksInPrivateTab()
            verifyOpenLinksInPrivateTabOff()
        }.goBack {
            verifySettingsView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/420086
    @Test
    fun launchLinksInAPrivateTabTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val secondWebPage = mockWebServer.getGenericAsset(2)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openPrivateBrowsingSubMenu {
            verifyOpenLinksInPrivateTabEnabled()
            clickOpenLinksInPrivateTabSwitch()
        }.goBack {
        }.goBack(composeTestRule) {
        }

        homeScreen(composeTestRule) {
            verifyHomeComponent()
        }

        AppAndSystemHelper.openAppFromExternalLink(composeTestRule, firstWebPage.url.toString())

        browserScreen(composeTestRule) {
            verifyUrl(firstWebPage.url.toString())
        }.openTabDrawer(composeTestRule) {
            verifyPrivateBrowsingButtonIsSelected()
        }.closeTabDrawer {
        }.goToHomescreen(isPrivateModeEnabled = true) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openPrivateBrowsingSubMenu {
            clickOpenLinksInPrivateTabSwitch()
            verifyOpenLinksInPrivateTabOff()
        }.goBack {
        }.goBack(composeTestRule) {
            verifyHomeComponent()
        }

        // We need to open a different link, otherwise it will open the same session
        AppAndSystemHelper.openAppFromExternalLink(composeTestRule, secondWebPage.url.toString())

        browserScreen(composeTestRule) {
            verifyUrl(secondWebPage.url.toString())
        }.openTabDrawer(composeTestRule) {
            verifyNormalBrowsingButtonIsSelected()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/555776
    @Test
    fun launchPageShortcutInPrivateBrowsingTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openPrivateBrowsingSubMenu {
            verifyOpenLinksInPrivateTabEnabled()
            clickOpenLinksInPrivateTabSwitch()
        }.goBack {
        }.goBack(composeTestRule) {
        }

        homeScreen(composeTestRule) {
            verifyHomeComponent()
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickAddToHomeScreenButton {
            addShortcutName(pageShortcutName)
            clickAddShortcutButton()
            clickSystemHomeScreenShortcutAddButton()
            verifyShortcutAdded(pageShortcutName)
        }

        mDevice.waitForIdle()
        // We need to close the existing tab here, to open a different session
        restartApp(composeTestRule.activityRule)

        browserScreen(composeTestRule) {
        }.openTabDrawer(composeTestRule) {
            verifyNormalBrowsingButtonIsSelected()
            closeTab()
        }

        addToHomeScreen(composeTestRule) {
        }.searchAndOpenHomeScreenShortcut(pageShortcutName) {
        }.openTabDrawer(composeTestRule) {
            verifyPrivateBrowsingButtonIsSelected()
            closeTab()
        }

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openPrivateBrowsingSubMenu {
            clickOpenLinksInPrivateTabSwitch()
            verifyOpenLinksInPrivateTabOff()
        }.goBack {
        }.goBack(composeTestRule) {
        }

        homeScreen(composeTestRule) {
            verifyHomeComponent()
        }

        addToHomeScreen(composeTestRule) {
        }.searchAndOpenHomeScreenShortcut(pageShortcutName) {
        }.openTabDrawer(composeTestRule) {
            verifyNormalBrowsingButtonIsSelected()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/414583
    @Test
    fun addPrivateBrowsingShortcutFromSettingsTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openPrivateBrowsingSubMenu {
            cancelPrivateShortcutAddition()
            addPrivateShortcutToHomescreen()
            verifyPrivateBrowsingShortcutIcon()
        }.openPrivateBrowsingShortcut(composeTestRule) {
        }
        homeScreen(composeTestRule) {
            verifyIfInPrivateOrNormalMode(privateBrowsingEnabled = true)
        }
    }
}
