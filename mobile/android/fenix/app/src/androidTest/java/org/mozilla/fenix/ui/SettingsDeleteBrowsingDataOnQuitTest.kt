/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import android.Manifest
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.core.net.toUri
import androidx.test.espresso.Espresso.pressBack
import androidx.test.rule.GrantPermissionRule
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.setNetworkEnabled
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MatcherHelper
import org.mozilla.fenix.helpers.MatcherHelper.itemWithText
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestAssetHelper.storageCheckPageAsset
import org.mozilla.fenix.helpers.TestAssetHelper.storageWritePageAsset
import org.mozilla.fenix.helpers.TestHelper.exitMenu
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.restartApp
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.downloadRobot
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar

/**
 *  Tests for verifying the Settings for:
 *  Delete Browsing Data on quit
 *
 */
class SettingsDeleteBrowsingDataOnQuitTest : TestSetup() {
    @get:Rule(order = 0)
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(
                skipOnboarding = true,
            ),
        ) { it.activity }

    @get:Rule(order = 1)
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // Automatically allows app permissions, avoiding a system dialog showing up.
    @get:Rule(order = 2)
    val grantPermissionRule: GrantPermissionRule = GrantPermissionRule.grant(
        Manifest.permission.RECORD_AUDIO,
    )

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416048
    @Test
    fun deleteBrowsingDataOnQuitSettingTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            verifyNavigationToolBarHeader()
            verifyDeleteBrowsingOnQuitEnabled(false)
            verifyDeleteBrowsingOnQuitButtonSummary()
            verifyDeleteBrowsingOnQuitEnabled(false)
            clickDeleteBrowsingOnQuitButtonSwitch()
            verifyDeleteBrowsingOnQuitEnabled(true)
            verifyAllTheCheckBoxesText()
            verifyAllTheCheckBoxesChecked(true)
        }.goBack {
            verifySettingsOptionSummary("Delete browsing data on quit", "On")
        }.goBack(composeTestRule) {
        }.openThreeDotMenu {
            verifyQuitButtonExists()
            pressBack()
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("test".toUri()) {
        }.openThreeDotMenu {
            verifyQuitButtonExists()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416049
    @Test
    fun deleteOpenTabsOnQuitTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            clickDeleteBrowsingOnQuitButtonSwitch()
            exitMenu()
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.goToHomescreen {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            restartApp(composeTestRule.activityRule)
        }
        homeScreen(composeTestRule) {
        }.openTabDrawer {
            verifyNoOpenTabsInNormalBrowsing()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416050
    @Test
    fun deleteBrowsingHistoryOnQuitTest() {
        val genericPage = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            clickDeleteBrowsingOnQuitButtonSwitch()
            exitMenu()
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericPage.url) {
        }.goToHomescreen {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            restartApp(composeTestRule.activityRule)
        }

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyEmptyHistoryView()
            exitMenu()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416051
    @Test
    fun deleteCookiesAndSiteDataOnQuitTest() {
        val storageWritePage = mockWebServer.storageWritePageAsset
        val storageCheckPage = mockWebServer.storageCheckPageAsset

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            clickDeleteBrowsingOnQuitButtonSwitch()
            exitMenu()
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageWritePage.url) {
            clickPageObject(composeTestRule, itemWithText("Set cookies"))
            verifyPageContent("Values written to storage")
        }.goToHomescreen {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            restartApp(composeTestRule.activityRule)
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageCheckPage.url) {
            verifyPageContent("Session storage empty")
            verifyPageContent("Local storage empty")
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageWritePage.url) {
            verifyPageContent("No cookies set")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1243096
    @SmokeTest
    @Test
    fun deleteDownloadsOnQuitTest() {
        val downloadTestPage = "https://storage.googleapis.com/mobile_test_assets/test_app/downloads.html"

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            clickDeleteBrowsingOnQuitButtonSwitch()
            exitMenu()
        }
        downloadRobot(composeTestRule) {
            openPageAndDownloadFile(url = downloadTestPage.toUri(), downloadFile = "smallZip.zip")
            verifyDownloadCompleteSnackbar(fileName = "smallZip.zip")
        }
        browserScreen(composeTestRule) {
        }.goToHomescreen {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            mDevice.waitForIdle()
        }
        restartApp(composeTestRule.activityRule)
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickDownloadsButton {
            verifyEmptyDownloadsList()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416053
    @SmokeTest
    @Test
    fun deleteSitePermissionsOnQuitTest() {
        val testPage = "https://mozilla-mobile.github.io/testapp/permissions"
        val testPageHost = "mozilla-mobile.github.io"

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            clickDeleteBrowsingOnQuitButtonSwitch()
            exitMenu()
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.toUri()) {
            verifyPageContent("Open microphone")
        }.clickStartMicrophoneButton {
            verifyMicrophonePermissionPrompt(testPageHost)
            selectRememberPermissionDecision()
        }.clickPagePermissionButton(false) {
            verifyPageContent("Microphone not allowed")
        }.goToHomescreen {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            mDevice.waitForIdle()
        }
        restartApp(composeTestRule.activityRule)
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.toUri()) {
            verifyPageContent("Open microphone")
        }.clickStartMicrophoneButton {
            verifyMicrophonePermissionPrompt(testPageHost)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416052
    @Ignore("Failing, see https://bugzilla.mozilla.org/show_bug.cgi?id=1987355")
    @Test
    fun deleteCachedFilesOnQuitTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            clickDeleteBrowsingOnQuitButtonSwitch()
            exitMenu()
        }
        homeScreen(composeTestRule) {
            verifyExistingTopSitesTabs("Wikipedia")
        }.openTopSiteTabWithTitle("Wikipedia") {
            verifyUrl("wikipedia.org")
        }.goToHomescreen {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            mDevice.waitForIdle()
        }
        // disabling wifi to prevent downloads in the background
        setNetworkEnabled(enabled = false)
        restartApp(composeTestRule.activityRule)
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("about:cache".toUri()) {
            verifyNetworkCacheIsEmpty("memory")
            verifyNetworkCacheIsEmpty("disk")
        }
        setNetworkEnabled(enabled = true)
    }
}
