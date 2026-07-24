/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("DEPRECATION")

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.core.net.toUri
import androidx.test.rule.ActivityTestRule
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.IntentReceiverActivity
import org.mozilla.fenix.customannotations.SkipLeaks
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.openAppFromExternalLink
import org.mozilla.fenix.helpers.DataGenerationHelper.createCustomTabIntent
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdAndText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithText
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestAssetHelper.pdfFormAsset
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeLong
import org.mozilla.fenix.helpers.TestHelper.exitMenu
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.customTabScreen
import org.mozilla.fenix.ui.robots.enhancedTrackingProtection
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.notificationShade

class CustomTabsTest : TestSetup() {
    private val customMenuItem = "TestMenuItem"
    private val customTabActionButton = "CustomActionButton"

    /* Updated externalLinks.html to v2.0,
       changed the hypertext reference to mozilla-mobile.github.io/testapp/downloads for "External link"
     */
    private val externalLinksPWAPage = "https://mozilla-mobile.github.io/testapp/v2.0/externalLinks.html"
    private val loginPage = "https://mozilla-mobile.github.io/testapp/loginForm"

    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(),
        ) { it.activity }

    @get:Rule
    val intentReceiverActivityTestRule = ActivityTestRule(
        IntentReceiverActivity::class.java,
        true,
        false,
    )

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/249659
    @SmokeTest
    @Test
    fun verifyLoginSaveInCustomTabTest() {
        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                loginPage.toUri().toString(),
                customMenuItem,
            ),
        )

        customTabScreen(composeTestRule) {
            waitForPageToLoad(pageLoadWaitingTime = waitingTimeLong)
            fillAndSubmitLoginCredentials("mozilla", "firefox")
        }

        browserScreen(composeTestRule) {
            verifySaveLoginPromptIsDisplayed()
            clickPageObject(composeTestRule, itemWithText("Save"))
        }

        openAppFromExternalLink(composeTestRule, loginPage)

        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openLoginsAndPasswordSubMenu {
        }.openSavedLogins(composeTestRule) {
            verifySecurityPromptForLogins()
            tapSetupLater()
            verifySavedLoginsSectionUsername("mozilla")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2334762
    @Test
    fun copyCustomTabToolbarUrlTest() {
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
                customMenuItem,
            ),
        )

        customTabScreen(composeTestRule) {
            verifyCustomTabUrl(customTabPage.url.toString())
            longClickAndCopyToolbarUrl()
        }

        openAppFromExternalLink(composeTestRule, customTabPage.url.toString())

        browserScreen(composeTestRule) {
        }.openSearch {
            clickClearButton()
            longClickToolbar()
            clickPasteText()
            verifyTypedToolbarText(customTabPage.url.toString(), exists = true)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2334761
    @SmokeTest
    @Test
    fun verifyDownloadInACustomTabTest() {
        val customTabPage = "https://storage.googleapis.com/mobile_test_assets/test_app/downloads.html"
        val downloadFile = "web_icon.png"

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.toUri().toString(),
                customMenuItem,
            ),
        )

        customTabScreen(composeTestRule) {
            waitForPageToLoad(pageLoadWaitingTime = waitingTimeLong)
        }

        browserScreen(composeTestRule) {
        }.clickDownloadLink(downloadFile) {
            verifyDownloadPrompt(downloadFile)
        }.clickDownload {
            verifyDownloadCompleteSnackbar(fileName = "web_icon.png")
            waitUntilDownloadSnackbarGone()
        }
        mDevice.openNotification()
            notificationShade {
            verifySystemNotificationExists("Download completed")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/249644
    // Verifies the main menu of a custom tab with a custom menu item
    @SmokeTest
    @Test
    fun verifyCustomTabMenuItemsTest() {
        val customMenuItem = "TestMenuItem"
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
                customMenuItem,
            ),
        )

        customTabScreen(composeTestRule) {
            verifyCustomTabCloseButton()
        }.openMainMenu {
            verifyCustomTabsMainMenuItems(customMenuItem, true)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/249645
    // The test opens a link in a custom tab then sends it to the browser
    @SmokeTest
    @Test
    fun openCustomTabInFirefoxTest() {
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
            ),
        )

        customTabScreen(composeTestRule) {
            verifyCustomTabCloseButton()
        }.openMainMenu {
        }.clickOpenInBrowserButtonFromRedesignedToolbar {
            verifyPageContent(customTabPage.content)
            verifyTabCounter("1")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/249643
    @Test
    fun verifyCustomTabViewItemsTest() {
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                pageUrl = customTabPage.url.toString(),
                customActionButtonDescription = customTabActionButton,
            ),
        )

        customTabScreen(composeTestRule) {
            verifyCustomTabCloseButton()
            verifyCustomTabsSiteInfoButton()
            verifyCustomTabToolbarTitle(customTabPage.title)
            verifyCustomTabUrl(customTabPage.url.toString())
            verifyCustomTabActionButton(customTabActionButton)
            verifyMainMenuButton()
            clickCustomTabCloseButton()
        }
        homeScreen(composeTestRule) {
            verifyHomeScreenAppBarItems()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2239544
    @Test
    fun verifyPDFViewerInACustomTabTest() {
        val customTabPage = mockWebServer.getGenericAsset(3)
        val pdfFormResource = mockWebServer.pdfFormAsset

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
            ),
        )

        customTabScreen(composeTestRule) {
            clickPageObject(composeTestRule, itemWithText("PDF form file"))
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            waitForPageToLoad()
            verifyPDFReaderToolbarItems()
            verifyCustomTabCloseButton()
            verifyCustomTabsSiteInfoButton()
            verifyCustomTabToolbarTitle("Untitled document - pdfForm.pdf")
            verifyCustomTabUrl(pdfFormResource.url.toString())
            verifyMainMenuButton()
            clickCustomTabCloseButton()
        }
        homeScreen(composeTestRule) {
            verifyHomeScreenAppBarItems()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2239117
    @SkipLeaks(reasons = ["https://bugzilla.mozilla.org/show_bug.cgi?id=2006672"])
    @Test
    fun verifyCustomTabETPSheetAndToggleTest() {
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                pageUrl = customTabPage.url.toString(),
                customActionButtonDescription = customTabActionButton,
            ),
        )

        browserScreen(composeTestRule) {
        }.openSiteSecuritySheet {
            verifyEnhancedTrackingProtectionSheetStatus(status = "ON", state = true)
        }.toggleEnhancedTrackingProtectionFromSheet {
            verifyEnhancedTrackingProtectionSheetStatus(status = "OFF", state = false)
        }.closeSiteSecuritySheet(composeTestRule) {
        }

        openAppFromExternalLink(composeTestRule, customTabPage.url.toString())

        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openEnhancedTrackingProtectionSubMenu {
            switchEnhancedTrackingProtectionToggle()
            verifyEnhancedTrackingProtectionOptionsEnabled(enabled = false)
        }

        exitMenu()

        browserScreen(composeTestRule) {
        }.goBack {
            // Actually exiting to the previously opened custom tab
        }

        enhancedTrackingProtection {
            verifyETPSectionIsDisplayedInQuickSettingsSheet(isDisplayed = false)
        }
    }
}
