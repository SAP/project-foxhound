/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.filters.SdkSuppress
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SkipLeaks
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.setNetworkEnabled
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
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
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar
import org.mozilla.fenix.ui.robots.settingsScreen

/**
 *  Tests for verifying the Settings for:
 *  Delete Browsing Data
 */

class SettingsDeleteBrowsingDataTest : TestSetup() {
    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(
                skipOnboarding = true,
            ),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/937561
    @Test
    fun deleteBrowsingDataOptionStatesTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyAllCheckBoxesAreChecked()
            switchBrowsingHistoryCheckBox()
            switchCachedFilesCheckBox()
            verifyOpenTabsCheckBox(true)
            verifyBrowsingHistoryDetails(false)
            verifyCookiesCheckBox(true)
            verifyCachedFilesCheckBox(false)
            verifySitePermissionsCheckBox(true)
            verifyDownloadsCheckBox(true)
        }

        restartApp(composeTestRule.activityRule)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyOpenTabsCheckBox(true)
            verifyBrowsingHistoryDetails(false)
            verifyCookiesCheckBox(true)
            verifyCachedFilesCheckBox(false)
            verifySitePermissionsCheckBox(true)
            verifyDownloadsCheckBox(true)
            switchOpenTabsCheckBox()
            switchBrowsingHistoryCheckBox()
            switchCookiesCheckBox()
            switchCachedFilesCheckBox()
            switchSitePermissionsCheckBox()
            switchDownloadsCheckBox()
            verifyOpenTabsCheckBox(false)
            verifyBrowsingHistoryDetails(true)
            verifyCookiesCheckBox(false)
            verifyCachedFilesCheckBox(true)
            verifySitePermissionsCheckBox(false)
            verifyDownloadsCheckBox(false)
        }

        restartApp(composeTestRule.activityRule)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyOpenTabsCheckBox(false)
            verifyBrowsingHistoryDetails(true)
            verifyCookiesCheckBox(false)
            verifyCachedFilesCheckBox(true)
            verifySitePermissionsCheckBox(false)
            verifyDownloadsCheckBox(false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/517811
    @Test
    fun deleteOpenTabsBrowsingDataWithNoOpenTabsTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyAllCheckBoxesAreChecked()
            selectOnlyOpenTabsCheckBox()
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            confirmDeletionAndAssertSnackbar()
        }
        settingsScreen {
            verifyGeneralHeading()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/353531
    @SmokeTest
    @Test
    fun deleteOpenTabsBrowsingDataTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyAllCheckBoxesAreChecked()
            selectOnlyOpenTabsCheckBox()
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            clickDialogCancelButton()
            verifyOpenTabsCheckBox(true)
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            confirmDeletionAndAssertSnackbar()
        }
        settingsScreen {
            verifyGeneralHeading()
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyOpenTabsDetails("0")
        }.goBack {
        }.goBack(composeTestRule) {
        }.openTabDrawer {
            verifyNoOpenTabsInNormalBrowsing()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/378864
    @SmokeTest
    @Test
    fun deleteBrowsingHistoryTest() {
        val genericPage = mockWebServer.getGenericAsset(1).url

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericPage) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            verifyBrowsingHistoryDetails("1")
            selectOnlyBrowsingHistoryCheckBox()
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            clickDialogCancelButton()
            verifyBrowsingHistoryDetails(true)
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            confirmDeletionAndAssertSnackbar()
            verifyBrowsingHistoryDetails("0")
            exitMenu()
        }
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyEmptyHistoryView()
            mDevice.pressBack()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416041
    @SmokeTest
    @Test
    @SkipLeaks
    fun deleteCookiesAndSiteDataTest() {
        val genericPage = mockWebServer.getGenericAsset(1)
        val storageWritePage = mockWebServer.storageWritePageAsset.url
        val storageCheckPage = mockWebServer.storageCheckPageAsset.url

        // Browsing a generic page to allow GV to load on a fresh run
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericPage.url) {
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageWritePage) {
            verifyPageContent("No cookies set")
            clickPageObject(composeTestRule, itemWithResId("setCookies"))
            verifyPageContent("user=android")
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageCheckPage) {
            verifyPageContent("Session storage has value")
            verifyPageContent("Local storage has value")
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            selectOnlyCookiesCheckBox()
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            clickDialogCancelButton()
            verifyCookiesCheckBox(status = true)
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            confirmDeletionAndAssertSnackbar()
            exitMenu()
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageCheckPage) {
            verifyPageContent("Session storage empty")
            verifyPageContent("Local storage empty")
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(storageWritePage) {
            verifyPageContent("No cookies set")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416042
    @Ignore("Failing, see https://bugzilla.mozilla.org/show_bug.cgi?id=1987355")
    @SdkSuppress(minSdkVersion = 34)
    @SmokeTest
    @Test
    fun deleteCachedFilesTest() {
        homeScreen(composeTestRule) {
            verifyExistingTopSitesTabs("Wikipedia")
        }.openTopSiteTabWithTitle("Wikipedia") {
            verifyUrl("wikipedia.org")
        }.openTabDrawer(composeTestRule) {
        }.openNewTab {
        }.submitQuery("about:cache") {
            // disabling wifi to prevent downloads in the background
            setNetworkEnabled(enabled = false)
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingData {
            selectOnlyCachedFilesCheckBox()
            clickDeleteBrowsingDataButton()
            verifyDeleteBrowsingDataDialog()
            confirmDeletionAndAssertSnackbar()
            exitMenu()
        }
        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickRefreshButton {
            verifyNetworkCacheIsEmpty("memory")
            verifyNetworkCacheIsEmpty("disk")
        }
        setNetworkEnabled(enabled = true)
    }
}
