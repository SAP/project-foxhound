/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("DEPRECATION")

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.core.net.toUri
import androidx.test.rule.ActivityTestRule
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.IntentReceiverActivity
import org.mozilla.fenix.R
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.assertExternalAppOpens
import org.mozilla.fenix.helpers.AppAndSystemHelper.assertNativeAppOpens
import org.mozilla.fenix.helpers.AppAndSystemHelper.assertYoutubeAppOpens
import org.mozilla.fenix.helpers.AppAndSystemHelper.clickSystemHomeScreenShortcutAddButton
import org.mozilla.fenix.helpers.Constants.PackageName.GOOGLE_DOCS
import org.mozilla.fenix.helpers.Constants.PackageName.PRINT_SPOOLER
import org.mozilla.fenix.helpers.DataGenerationHelper.createCustomTabIntent
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MatcherHelper
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdAndText
import org.mozilla.fenix.helpers.MockBrowserDataHelper
import org.mozilla.fenix.helpers.TestAssetHelper.firstForeignWebPageAsset
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestAssetHelper.pdfFormAsset
import org.mozilla.fenix.helpers.TestAssetHelper.refreshAsset
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeLong
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeVeryShort
import org.mozilla.fenix.helpers.TestHelper.clickSnackbarButton
import org.mozilla.fenix.helpers.TestHelper.closeApp
import org.mozilla.fenix.helpers.TestHelper.exitMenu
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.restartApp
import org.mozilla.fenix.helpers.TestHelper.verifySnackBarText
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.TestHelper.waitUntilSnackbarGone
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.nimbus.FxNimbus
import org.mozilla.fenix.nimbus.Translations
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.customTabScreen
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar

class MainMenuTest : TestSetup() {
    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule(
                skipOnboarding = true,
                isMenuRedesignCFREnabled = false,
                isPageLoadTranslationsPromptEnabled = false,
            ),
        ) { it.activity }

    @get:Rule
    val intentReceiverActivityTestRule = ActivityTestRule(
        IntentReceiverActivity::class.java,
        true,
        false,
    )

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080168
    @SmokeTest
    @Test
    fun verifyTheHomepageRedesignedMenuItemsTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
            verifyHomeMainMenuItems()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080124
    @SmokeTest
    @Test
    fun verifyTheWebpageRedesignedMenuItemsTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
            verifyPageMainMenuItems()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080133
    @SmokeTest
    @Test
    fun verifySwitchToDesktopSiteIsDisabledOnPDFsTest() {
        val pdfPage = mockWebServer.pdfFormAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(pdfPage.url) {
            waitForPageToLoad()
            verifyPageContent(pdfPage.content)
        }.openThreeDotMenu {
            verifySwitchToDesktopSiteButtonIsEnabled(isEnabled = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080130
    @SmokeTest
    @Test
    fun verifyTheFindInPageMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(3)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickFindInPageButton {
            verifyFindInPageNextButton()
            verifyFindInPagePrevButton()
            verifyFindInPageCloseButton()
            enterFindInPageQuery("a")
            verifyFindInPageResult("1/3")
            clickFindInPageNextButton()
            verifyFindInPageResult("2/3")
            clickFindInPageNextButton()
            verifyFindInPageResult("3/3")
            clickFindInPagePrevButton()
            verifyFindInPageResult("2/3")
            clickFindInPagePrevButton()
            verifyFindInPageResult("1/3")
        }.closeFindInPageWithCloseButton(composeTestRule) {
            verifyFindInPageBar(false)
        }.openThreeDotMenu {
        }.clickFindInPageButton {
            enterFindInPageQuery("3")
            verifyFindInPageResult("1/1")
        }.closeFindInPageWithBackButton(composeTestRule) {
            verifyFindInPageBar(false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080136
    @SmokeTest
    @Test
    fun verifyTheHistoryMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryMenuView()
        }.goBack {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080138
    @SmokeTest
    @Test
    fun verifyTheDownloadsMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickDownloadsButton {
            verifyEmptyDownloadsList()
            exitMenu()
        }.exitDownloadsManagerToBrowser {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080139
    @SmokeTest
    @Test
    fun verifyThePasswordsMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickPasswordsButton {
            verifySecurityPromptForLogins()
            tapSetupLater()
            verifyEmptySavedLoginsListView()
        }.goBack {
        }

        exitMenu()
        browserScreen(composeTestRule) {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080095
    // Verifies the main menu of a custom tab with a custom menu item
    @SmokeTest
    @Test
    fun verifyTheCustomTabsMainMenuItemsTest() {
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

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080100
    // The test opens a link in a custom tab then sends it to the browser
    @SmokeTest
    @Test
    fun verifyOpenInFirefoxMainMenuTest() {
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

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080151
    @SmokeTest
    @Test
    fun verifyRecommendedExtensionsListWhileNoExtensionIsInstalledTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
            verifyPageContent(genericURL.content)
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsButton {
            verifyRecommendedAddonsViewFromRedesignedMainMenu(composeTestRule)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080160
    @SmokeTest
    @Test
    fun verifyTheExtensionsMenuListAfterRemovingAnExtensionTest() {
        var recommendedExtensionTitle = ""
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
            verifyPageContent(genericURL.content)
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsButton {
            recommendedExtensionTitle = installRecommendedAddon(composeTestRule)
            verifyAddonPermissionPrompt(recommendedExtensionTitle)
            acceptPermissionToInstallAddon()
            verifyAddonInstallCompletedPrompt(
                recommendedExtensionTitle,
                composeTestRule.activityRule,
            )
            closeAddonInstallCompletePrompt()
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.openThreeDotMenu {
        }.clickExtensionsButton {
            clickManageExtensionsButtonFromRedesignedMainMenu(composeTestRule)
        }.openDetailedMenuForAddon(recommendedExtensionTitle) {
        }.removeAddon(composeTestRule.activityRule) {
        }.goBackToHomeScreen {
        }
        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080163
    @SmokeTest
    @Test
    fun verifyTheManageExtensionsItemTest() {
        var recommendedExtensionTitle = ""
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
            verifyPageContent(genericURL.content)
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsButton {
            recommendedExtensionTitle = installRecommendedAddon(composeTestRule)
            verifyAddonPermissionPrompt(recommendedExtensionTitle)
            acceptPermissionToInstallAddon()
            verifyAddonInstallCompletedPrompt(
                recommendedExtensionTitle,
                composeTestRule.activityRule,
            )
            closeAddonInstallCompletePrompt()
        }
        browserScreen(composeTestRule) {
            waitForPageToLoad()
        }.openThreeDotMenu {
            waitForAppWindowToBeUpdated()
        }.clickExtensionsButton {
            clickManageExtensionsButtonFromRedesignedMainMenu(composeTestRule)
            verifyAddonsListIsDisplayed(shouldBeDisplayed = true)
            verifyAddonIsInstalled(recommendedExtensionTitle)
            verifyEnabledTitleDisplayed()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080129
    @SmokeTest
    @Test
    fun verifyTheBookmarkPageMenuOptionTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickBookmarkThisPageButton {
        }.openThreeDotMenu {
        }.clickEditBookmarkButton {
            verifyEditBookmarksView()
            clickDeleteBookmarkButtonInEditMode()
        }
        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
            verifyBookmarkThisPageButton()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080113
    @SmokeTest
    @Test
    fun verifyTheAddToShortcutsSubMenuOptionTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
            verifyPageContent(testPage.content)
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickAddToShortcutsButton {
            verifySnackBarText(getStringResource(R.string.snackbar_added_to_shortcuts))
        }.goToHomescreen {
            verifyExistingTopSitesTabs(testPage.title)
        }.openTopSiteTabWithTitle(testPage.title) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickRemoveFromShortcutsButton {
            composeTestRule.waitForIdle()
        }.goToHomescreen {
            verifyNotExistingTopSiteItem(testPage.title)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080114
    @SmokeTest
    @Test
    fun verifyTheAddToHomeScreenSubMenuOptionTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickAddToHomeScreenButton {
            clickCancelShortcutButton()
        }
        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickAddToHomeScreenButton {
            clickAddShortcutButton()
            clickSystemHomeScreenShortcutAddButton()
        }.openHomeScreenShortcut(testPage.title) {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080115
    @SmokeTest
    @Test
    fun verifyTheSaveToCollectionSubMenuOptionTest() {
        val collectionTitle = "First Collection"
        val firstTestPage = mockWebServer.getGenericAsset(1)
        val secondTestPage = mockWebServer.getGenericAsset(2)

        composeTestRule.activityRule.applySettingsExceptions {
            // Disabling these features to have better visibility of the Collections view
            it.isRecentlyVisitedFeatureEnabled = false
            it.isRecentTabsFeatureEnabled = false
        }

        MockBrowserDataHelper
            .createCollection(
                Pair(firstTestPage.url.toString(), firstTestPage.title),
                title = collectionTitle,
            )

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(secondTestPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickSaveToCollectionButton {
        }.selectExistingCollection(collectionTitle) {
            verifySnackBarText("Tab saved")
        }.goToHomescreen {
        }.expandCollection(collectionTitle) {
            verifyTabSavedInCollection(firstTestPage.title)
            verifyTabSavedInCollection(secondTestPage.title)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080118
    @SmokeTest
    @Test
    fun verifyTheSaveAsPDFSubMenuOptionTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickSaveAsPDFButton {
            verifyDownloadPrompt(testPage.title + ".pdf")
        }.clickDownload {
            clickSnackbarButton(composeTestRule = composeTestRule, "OPEN")
            assertExternalAppOpens(GOOGLE_DOCS)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080111
    @SmokeTest
    @Test
    fun verifyTheTranslatePageSubMenuOptionTest() {
        val testPage = mockWebServer.firstForeignWebPageAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickTranslateButton {
            verifyTranslationSheetIsDisplayed(isDisplayed = true)
        }.clickTranslateButton {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickTranslatedButton {
            verifyTranslationSheetIsDisplayed(isDisplayed = true)
        }.clickShowOriginalButton {
            verifyPageContent(testPage.content)
        }.openThreeDotMenu {
            clickTheMoreButton()
            verifyTranslatePageButton()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080128
    @SmokeTest
    @Test
    fun verifyTheShareButtonTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
            verifyPageContent(testPage.content)
        }.openThreeDotMenu {
        }.clickShareButton {
            verifyShareTabLayout()
            verifySharingWithSelectedApp(
                appName = "Gmail",
                content = testPage.url.toString(),
                subject = testPage.title,
            )
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080117
    @SmokeTest
    @Test
    fun verifyTheOpenInAppSubMenuOptionIsEnabledTest() {
        val youtubeURL = "vnd.youtube://".toUri()

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(youtubeURL) {
            waitForPageToLoad(waitingTime)
        }.openThreeDotMenu {
            clickTheMoreButton()
            verifyOpenInAppButtonIsEnabled(appName = "YouTube", isEnabled = true)
            clickOpenInAppButton(appName = "YouTube")
            assertYoutubeAppOpens()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080131
    @SmokeTest
    @Test
    fun verifyDesktopSiteModeOnOffIsEnabledTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            verifySwitchToDesktopSiteButton()
            verifyDesktopSiteButtonState(isEnabled = false)
            clickSwitchToDesktopSiteButton()
        }
        browserScreen(composeTestRule) {
            waitForPageToLoad(pageLoadWaitingTime = waitingTimeLong)
        }.openThreeDotMenu {
            verifyDesktopSiteButtonState(isEnabled = true)
            clickSwitchToDesktopSiteButton()
        }
        browserScreen(composeTestRule) {
            waitForPageToLoad(pageLoadWaitingTime = waitingTimeLong)
        }.openThreeDotMenu {
            verifyDesktopSiteButtonState(isEnabled = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080119
    @SmokeTest
    @Test
    fun verifyThePrintSubMenuOptionTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
            clickTheMoreButton()
            clickPrintContentButton()
            assertNativeAppOpens(composeTestRule, PRINT_SPOOLER)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080156
    @SmokeTest
    @Test
    fun verifyTheExtensionInstallationTest() {
        var recommendedExtensionTitle = ""
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
            verifyPageContent(genericURL.content)
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsButton {
            recommendedExtensionTitle = installRecommendedAddon(composeTestRule)
            acceptPermissionToInstallAddon()
            verifyAddonInstallCompletedPrompt(
                recommendedExtensionTitle,
                composeTestRule.activityRule,
            )
            closeAddonInstallCompletePrompt()
        }
        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
            verifyExtensionsButtonWithInstalledExtension(recommendedExtensionTitle)
        }.clickExtensionsButton {
            verifyDiscoverMoreExtensionsButton(composeTestRule, isDisplayed = false)
            verifyManageExtensionsButtonFromRedesignedMainMenu(composeTestRule, isDisplayed = true)
            verifyInstalledExtension(composeTestRule, recommendedExtensionTitle)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080181
    @SmokeTest
    @Test
    fun verifyTheHomePageSettingsMenuItemTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
            verifySettingsToolbar()
        }.goBack(composeTestRule) {
            verifyHomeWordmark()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080121
    @Ignore("Disabled after enabling the composable toolbar and main menu: https://bugzilla.mozilla.org/show_bug.cgi?id=2006295")
    @Test
    fun verifyTheBrowserViewMainMenuCFRTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        composeTestRule.activityRule.applySettingsExceptions {
            it.isMenuRedesignCFREnabled = true
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.openThreeDotMenu {
            verifyMainMenuCFR()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080898
    @Test
    fun verifyTheFindInPageOptionInPDFsTest() {
        val testPage = mockWebServer.getGenericAsset(3)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
            clickPageObject(composeTestRule, MatcherHelper.itemWithText("PDF form file"))
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
        }.openThreeDotMenu {
        }.clickFindInPageButton {
            verifyFindInPageNextButton()
            verifyFindInPagePrevButton()
            verifyFindInPageCloseButton()
            enterFindInPageQuery("l")
            verifyFindInPageResult("1/2")
            clickFindInPageNextButton()
            verifyFindInPageResult("2/2")
            clickFindInPagePrevButton()
            verifyFindInPageResult("1/2")
        }.closeFindInPageWithCloseButton(composeTestRule) {
            verifyFindInPageBar(false)
        }.openThreeDotMenu {
        }.clickFindInPageButton {
            enterFindInPageQuery("p")
            verifyFindInPageResult("1/1")
        }.closeFindInPageWithBackButton(composeTestRule) {
            verifyFindInPageBar(false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080145
    @Test
    fun verifyTheQuitFirefoxMenuItemTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            verifyDeleteBrowsingOnQuitEnabled(false)
            clickDeleteBrowsingOnQuitButtonSwitch()
            verifyDeleteBrowsingOnQuitEnabled(true)
        }.goBack {
            verifySettingsOptionSummary("Delete browsing data on quit", "On")
        }.goBack(composeTestRule) {
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            restartApp(composeTestRule.activityRule)
        }
        homeScreen(composeTestRule) {
            verifyHomeWordmark()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080103
    @Test
    fun verifyTheDesktopSiteMenuItemInACustomTabTest() {
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
            ),
        )

        customTabScreen(composeTestRule) {
        }.openMainMenu {
            verifySwitchToDesktopSiteButton()
            verifyDesktopSiteButtonState(isEnabled = false)
            clickSwitchToDesktopSiteButton()
        }.openMainMenu {
            verifyDesktopSiteButtonState(isEnabled = true)
            clickSwitchToDesktopSiteButton()
        }.openMainMenu {
            verifyDesktopSiteButtonState(isEnabled = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080101
    @SmokeTest
    @Test
    fun verifyTheFindInPageMenuItemInACustomTabTest() {
        val customTabPage = mockWebServer.getGenericAsset(3)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
            ),
        )

        customTabScreen(composeTestRule) {
        }.openMainMenu {
        }.clickFindInPageButton {
            verifyFindInPageNextButton()
            verifyFindInPagePrevButton()
            verifyFindInPageCloseButton()
            enterFindInPageQuery("a")
            verifyFindInPageResult("1/3")
            clickFindInPageNextButton()
            verifyFindInPageResult("2/3")
            clickFindInPageNextButton()
            verifyFindInPageResult("3/3")
            clickFindInPagePrevButton()
            verifyFindInPageResult("2/3")
            clickFindInPagePrevButton()
            verifyFindInPageResult("1/3")
        }.closeFindInPageWithCloseButton(composeTestRule) {
            verifyFindInPageBar(false)
        }.openThreeDotMenu {
        }.clickFindInPageButton {
            enterFindInPageQuery("3")
            verifyFindInPageResult("1/1")
        }.closeFindInPageWithBackButton(composeTestRule) {
            verifyFindInPageBar(false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080107
    @Test
    fun verifyTheClosingBehaviourWhenTappingOutsideTheCustomTabMainMenuTest() {
        val customMenuItem = "TestMenuItem"
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
            ),
        )

        customTabScreen(composeTestRule) {
        }.openMainMenu {
        }.clickOutsideTheMainMenu {
        }
        customTabScreen(composeTestRule) {
            verifyCustomTabsMainMenuItems(
                customMenuItem,
                false,
                waitingTimeVeryShort,
            )
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080162
    @SmokeTest
    @Test
    fun verifyTheExtensionMenuListWhileExtensionsAreDisabledTest() {
        var recommendedExtensionTitle = ""
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
            verifyPageContent(genericURL.content)
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsButton {
            recommendedExtensionTitle = installRecommendedAddon(composeTestRule)
            acceptPermissionToInstallAddon()
            verifyAddonInstallCompletedPrompt(
                recommendedExtensionTitle,
                composeTestRule.activityRule,
            )
            closeAddonInstallCompletePrompt()
        }
        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
            verifyExtensionsButtonWithInstalledExtension(recommendedExtensionTitle)
        }.clickExtensionsButton {
            clickManageExtensionsButtonFromRedesignedMainMenu(composeTestRule)
        }.openDetailedMenuForAddon(recommendedExtensionTitle) {
            disableExtension()
            waitUntilSnackbarGone()
        }.goBack {
        }.goBackToBrowser {
        }.openThreeDotMenu {
            verifyNoExtensionsEnabledButton()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080153
    @Test
    fun verifyTheDiscoverMoreExtensionsSubMenuItemTest() {
        val genericURL = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(genericURL.url) {
            verifyPageContent(genericURL.content)
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsButton {
        }.clickDiscoverMoreExtensionsButton(composeTestRule) {
            verifyUrl("addons.mozilla.org")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080112
    @SmokeTest
    @Test
    fun verifyTheReportBrokenSiteSubMenuOptionTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(websiteURL = defaultWebPage.url.toString())
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937924
    @Test
    fun verifyTheWhatIsBrokenErrorMessageTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(defaultWebPage.url.toString())
            verifyWhatIsBrokenField(composeTestRule)
            verifySendButtonIsEnabled(isEnabled = false)
            clickChooseReasonField(composeTestRule)
            clickSiteDoesNotLoadReason(composeTestRule)
            verifyChooseReasonErrorMessageIsNotDisplayed(composeTestRule)
            verifySendButtonIsEnabled(isEnabled = true)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937926
    @Test
    fun verifyThatTheBrokenSiteFormSubmissionCanBeCanceledTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(defaultWebPage.url.toString())
            clickChooseReasonField(composeTestRule)
            clickSiteDoesNotLoadReason(composeTestRule)
            clickBrokenSiteFormCancelButton(composeTestRule)
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWhatIsBrokenField(composeTestRule)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937927
    @Test
    fun verifyTheBrokenSiteFormSubmissionWithOptionalFieldsTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(defaultWebPage.url.toString())
            clickChooseReasonField(composeTestRule)
            clickSiteDoesNotLoadReason(composeTestRule)
            describeBrokenSiteProblem(problemDescription = "Prolonged page loading time")
            clickBrokenSiteFormSendButton(composeTestRule)
        }
        browserScreen(composeTestRule) {
            verifySnackBarText("Report sent")
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWhatIsBrokenField(composeTestRule)
            verifyBrokenSiteProblem(
                problemDescription = "Prolonged page loading time",
                isDisplayed = false,
            )
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937930
    @Test
    fun verifyThatTheBrokenSiteFormInfoPersistsTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(defaultWebPage.url.toString())
            clickChooseReasonField(composeTestRule)
            clickSiteDoesNotLoadReason(composeTestRule)
            describeBrokenSiteProblem(problemDescription = "Prolonged page loading time")
        }.closeWebCompatReporter {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyBrokenSiteProblem(
                problemDescription = "Prolonged page loading time",
                isDisplayed = true,
            )
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937931
    @Test
    fun verifyTheBrokenSiteFormIsEmptyWithoutSubmittingThePreviousOneTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val secondWebPage = mockWebServer.getGenericAsset(2)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(firstWebPage.url.toString())
            clickChooseReasonField(composeTestRule)
            clickSiteDoesNotLoadReason(composeTestRule)
            describeBrokenSiteProblem(
                problemDescription = "Prolonged page loading time",
            )
        }.closeWebCompatReporter {
        }.openTabDrawer(composeTestRule) {
        }.openNewTab {
        }.submitQuery(secondWebPage.url.toString()) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWhatIsBrokenField(composeTestRule)
            verifyBrokenSiteProblem(
                problemDescription = "Prolonged page loading time",
                isDisplayed = false,
            )
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937932
    @Test
    fun verifyThatTheBrokenSiteFormInfoIsErasedWhenKillingTheAppTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWebCompatReporterViewItems(defaultWebPage.url.toString())
            clickChooseReasonField(composeTestRule)
            clickSiteDoesNotLoadReason(composeTestRule)
            describeBrokenSiteProblem(problemDescription = "Prolonged page loading time")
        }
        closeApp(composeTestRule.activityRule)
        restartApp(composeTestRule.activityRule)

        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            verifyWhatIsBrokenField(composeTestRule)
            verifyBrokenSiteProblem(
                problemDescription = "Prolonged page loading time",
                isDisplayed = false,
            )
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2937933
    @Test
    fun verifyReportBrokenSiteFormNotDisplayedWhenTelemetryIsDisabledTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDataCollection {
            clickUsageAndTechnicalDataToggle(composeTestRule)
            verifyUsageAndTechnicalDataToggle(composeTestRule, isChecked = false)
        }
        exitMenu()
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickReportBrokenSiteButton {
            waitForAppWindowToBeUpdated()
            verifyUrl("webcompat.com/issues/new")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080172
    @SmokeTest
    @Test
    fun verifyTheExtensionsMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickExtensionsButton {
            verifyAddonsListIsDisplayed(true)
        }.goBackToHomeScreen {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080173
    @Test
    fun verifyTheHistoryMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyEmptyHistoryView()
        }.goBackToHomeScreen {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080174
    @Test
    fun verifyTheBookmarksMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickBookmarksButton {
            verifyEmptyBookmarksMenuView()
        }.goBackToHomeScreen {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080175
    @Test
    fun verifyTheDownloadsMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickDownloadsButton {
            verifyEmptyDownloadsList()
        }.goBackToHomeScreen {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080176
    @Test
    fun verifyThePasswordsMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickPasswordsButton {
            verifySecurityPromptForLogins()
            tapSetupLater()
            verifyEmptySavedLoginsListView()
        }.goBack {
        }

        exitMenu()

        homeScreen(composeTestRule) {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080177
    @Test
    fun verifyTheSignInMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSignInToSyncButton {
            verifyTurnOnSyncMenu()
        }.goBackToHomeScreen {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080182
    @Test
    fun verifyTheQuitMenuOptionTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openSettingsSubMenuDeleteBrowsingDataOnQuit {
            verifyDeleteBrowsingOnQuitEnabled(false)
            clickDeleteBrowsingOnQuitButtonSwitch()
            verifyDeleteBrowsingOnQuitEnabled(true)
        }.goBack {
            verifySettingsOptionSummary("Delete browsing data on quit", "On")
        }.goBack(composeTestRule) {
        }.openThreeDotMenu {
            clickTheQuitFirefoxButton()
            restartApp(composeTestRule.activityRule)
        }
        homeScreen(composeTestRule) {
            verifyHomeComponent()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080125
    @SmokeTest
    @Test
    fun verifyTheMainMenuBackButtonTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val nextWebPage = mockWebServer.getGenericAsset(2)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(nextWebPage.url) {
            verifyUrl(nextWebPage.url.toString())
        }.openThreeDotMenu {
        }.clickPreviousPageButton {
            waitForAppWindowToBeUpdated()
            verifyUrl(firstWebPage.url.toString())
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080126
    @SmokeTest
    @Test
    fun verifyTheMainMenuForwardButtonTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val nextWebPage = mockWebServer.getGenericAsset(2)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(nextWebPage.url) {
            verifyUrl(nextWebPage.url.toString())
        }.openThreeDotMenu {
        }.clickPreviousPageButton {
            mDevice.waitForIdle()
            verifyUrl(firstWebPage.url.toString())
        }.openThreeDotMenu {
        }.clickForwardButton {
            waitForAppWindowToBeUpdated()
            verifyUrl(nextWebPage.url.toString())
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080127
    @Test
    fun verifyTheRefreshButtonTest() {
        val refreshWebPage = mockWebServer.refreshAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(refreshWebPage.url) {
            verifyPageContent("DEFAULT")
        }.openThreeDotMenu {
        }.clickRefreshButton {
            verifyPageContent("REFRESHED")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080134
    @SmokeTest
    @Test
    fun verifyTheExtensionsMainMenuListTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
            verifyTryRecommendedExtensionButton()
        }.clickExtensionsChevronFromMainMenu {
            verifyRecommendedAddonsViewFromRedesignedMainMenu(composeTestRule)
            clickCollapseExtensionsChevronFromMainMenu(composeTestRule)
            verifyExtensionsMainMenuOptionIsCollapsed(composeTestRule, areExtensionsInstalled = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080135
    @Test
    fun verifyTheMoreMainMenuListTest() {
        val firstTestPage = mockWebServer.firstForeignWebPageAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstTestPage.url) {
        }.openThreeDotMenu {
            clickMoreOptionChevron()
            verifyMoreMainMenuItems()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080137
    @SmokeTest
    @Test
    fun verifyTheBookmarksMainMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickBookmarksButton {
            verifyEmptyBookmarksMenuView()
        }.goBackToBrowserScreen {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080140
    @Test
    fun verifyTheSignInMainMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickSignInToSyncButton {
            verifyTurnOnSyncMenu()
        }.goBack {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080144
    @Test
    fun verifyTheSettingsMainMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(testPage.url) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
            verifySettingsView()
        }.goBackToBrowser(composeTestRule) {
            verifyPageContent(testPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080096
    @SmokeTest
    @Test
    fun verifyTheMainMenuBackButtonFromCustomTabTest() {
        val customMenuItem = "TestMenuItem"
        val customTabPage = mockWebServer.getGenericAsset(4)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
                customMenuItem,
            ),
        )

        customTabScreen(composeTestRule) {
            clickPageObject(composeTestRule, itemContainingText("Link 1"))
        }.openMainMenu {
        }.clickBackButtonFromMenu {
            waitForPageToLoad(waitingTime)
        }

        browserScreen(composeTestRule) {
            verifyPageContent(customTabPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080097
    @SmokeTest
    @Test
    fun verifyTheMainMenuForwardButtonFromCustomTabTest() {
        val customMenuItem = "TestMenuItem"
        val firstCustomTabPage = mockWebServer.getGenericAsset(4)
        val secondCustomTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                firstCustomTabPage.url.toString(),
                customMenuItem,
            ),
        )

        customTabScreen(composeTestRule) {
            clickPageObject(composeTestRule, itemContainingText("Link 1"))
        }.openMainMenu {
        }.clickBackButtonFromMenu {
            waitForPageToLoad(waitingTime)
            verifyPageContent(firstCustomTabPage.content)
        }

        customTabScreen(composeTestRule) {
        }.openMainMenu {
        }.clickForwardButtonFromMenu {
            waitForPageToLoad(waitingTime)
            verifyPageContent(secondCustomTabPage.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080098
    @Test
    fun verifyTheMainMenuRefreshButtonFromCustomTabTest() {
        val customMenuItem = "TestMenuItem"
        val customTabPage = mockWebServer.refreshAsset

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
                customMenuItem,
                ),
        )

        browserScreen(composeTestRule) {
            verifyPageContent("DEFAULT")
        }
        customTabScreen(composeTestRule) {
        }.openMainMenu {
        }.clickRefreshButton {
            verifyPageContent("REFRESHED")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080099
    @Test
    fun verifyTheMainMenuShareButtonFromCustomTabTest() {
        val customMenuItem = "TestMenuItem"
        val customTabPage = mockWebServer.getGenericAsset(1)

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPage.url.toString(),
                customMenuItem,
                ),
        )

        customTabScreen(composeTestRule) {
        }.openMainMenu {
        }.clickShareButtonFromRedesignedMenu {
            verifyShareTabLayout()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080102
    @Test
    fun verifySwitchToDesktopSiteIsDisabledOnPDFsFromCustomTabTest() {
        val customMenuItem = "TestMenuItem"
        val customTabPDF = mockWebServer.pdfFormAsset

        intentReceiverActivityTestRule.launchActivity(
            createCustomTabIntent(
                customTabPDF.url.toString(),
                customMenuItem,
                ),
        )

        browserScreen(composeTestRule) {
            verifyPageContent(customTabPDF.content)
        }

        customTabScreen(composeTestRule) {
        }.openMainMenu {
            verifySwitchToDesktopSiteButton()
            verifyDesktopSiteButtonState(isEnabled = false)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080110
    @SmokeTest
    @Test
    fun verifyTheMoreMainMenuSubListTest() {
        val firstTestPage = mockWebServer.firstForeignWebPageAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstTestPage.url) {
        }.openThreeDotMenu {
            clickTheMoreButton()
            verifyMoreMainMenuItems()
        }
    }
}
