package org.mozilla.fenix.ui

import androidx.core.net.toUri
import androidx.test.filters.SdkSuppress
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.AppAndSystemHelper.clickSystemHomeScreenShortcutAddButton
import org.mozilla.fenix.helpers.FenixTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestAssetHelper.textFragmentAsset
import org.mozilla.fenix.helpers.TestHelper.waitUntilSnackbarGone
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2

class TextFragmentsTest {
    @get:Rule(order = 0)
    val fenixTestRule: FenixTestRule = FenixTestRule()

    private val mockWebServer get() = fenixTestRule.mockWebServer

    @get:Rule(order = 1)
    val composeTestRule = AndroidComposeTestRuleV2(
        HomeActivityIntentTestRule.withDefaultSettingsOverrides(),
    ) { it.activity }

    @get:Rule(order = 2)
    val memoryLeaksRule = DetectMemoryLeaksRule(composeTestRule = { composeTestRule })

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
            waitUntilSnackbarGone()
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
