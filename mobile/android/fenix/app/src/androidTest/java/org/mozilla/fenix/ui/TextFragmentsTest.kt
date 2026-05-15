package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.core.net.toUri
import androidx.test.filters.SdkSuppress
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.AppAndSystemHelper.clickSystemHomeScreenShortcutAddButton
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestAssetHelper.textFragmentAsset
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar

class TextFragmentsTest : TestSetup() {
    @get:Rule
    val composeTestRule = AndroidComposeTestRule(
        HomeActivityIntentTestRule.withDefaultSettingsOverrides(),
    ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2753059
    @SdkSuppress(minSdkVersion = 34)
    @Test
    fun verifyTheTextFragmentUrlAddedToHomescreenTest() {
        val genericPage = mockWebServer.textFragmentAsset
        val textFragmentLink = genericPage.url.toString() + "#:~:text=Firefox"

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(textFragmentLink.toUri()) {
            verifyTextFragmentsPageContent("Firefox")
        }.openThreeDotMenu {
            clickTheMoreButton()
        }.clickAddToHomeScreenButton {
            clickAddShortcutButton()
            clickSystemHomeScreenShortcutAddButton()
        }.openHomeScreenShortcut(genericPage.title) {
            verifyTextFragmentsPageContent("Firefox")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2753061
    @SdkSuppress(minSdkVersion = 34)
    @Test
    fun verifyTheTextFragmentLinksInHistoryTest() {
        val genericPage = mockWebServer.textFragmentAsset
        val textFragmentLink = genericPage.url.toString() + "#:~:text=Firefox"

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(textFragmentLink.toUri()) {
            verifyTextFragmentsPageContent("Firefox")
        }.openTabDrawer(composeTestRule) {
            closeTabWithTitle(genericPage.title)
        }
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryItemExists(true, genericPage.title)
        }.openWebsite(textFragmentLink.toUri()) {
            verifyTextFragmentsPageContent("Firefox")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2753062
    @SdkSuppress(minSdkVersion = 34)
    @Test
    fun verifyTheTextFragmentLinksInBookmarksTest() {
        val genericPage = mockWebServer.textFragmentAsset
        val textFragmentLink = genericPage.url.toString() + "#:~:text=Firefox"

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(textFragmentLink.toUri()) {
            verifyTextFragmentsPageContent("Firefox")
        }.openThreeDotMenu {
        }.clickBookmarkThisPageButton {
        }
        browserScreen(composeTestRule) {
        }.openTabDrawer(composeTestRule) {
            closeTabWithTitle(genericPage.title)
        }
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickBookmarksButton {
            verifyBookmarkTitle(genericPage.title)
        }.openBookmarkWithTitle(genericPage.title) {
            verifyTextFragmentsPageContent("Firefox")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2753064
    @SdkSuppress(minSdkVersion = 34)
    @Test
    fun sendTextFragmentTabToDeviceTest() {
        val genericPage = mockWebServer.textFragmentAsset
        val textFragmentLink = genericPage.url.toString() + "#:~:text=Firefox"

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(textFragmentLink.toUri()) {
            verifyTextFragmentsPageContent("Firefox")
        }.openThreeDotMenu {
        }.clickShareButton {
            verifyShareTabLayout()
            verifySharingWithSelectedApp(
                appName = "Gmail",
                content = textFragmentLink,
                subject = genericPage.title,
            )
        }
    }
}
