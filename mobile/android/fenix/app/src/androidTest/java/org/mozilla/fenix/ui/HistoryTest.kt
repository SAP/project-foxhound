/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.Espresso.openActionBarOverflowOrOptionsMenu
import androidx.test.espresso.Espresso.pressBack
import androidx.test.filters.SdkSuppress
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.customannotations.SkipLeaks
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.AppAndSystemHelper.registerAndCleanupIdlingResources
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MockBrowserDataHelper.createHistoryItem
import org.mozilla.fenix.helpers.RecyclerViewIdlingResource
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestAssetHelper.htmlControlsFormAsset
import org.mozilla.fenix.helpers.TestHelper.exitMenu
import org.mozilla.fenix.helpers.TestHelper.longTapSelectItem
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.verifySnackBarText
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.browserScreen
import org.mozilla.fenix.ui.robots.historyMenu
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.multipleSelectionToolbar
import org.mozilla.fenix.ui.robots.navigationToolbar

/**
 *  Tests for verifying basic functionality of history
 *
 */
class HistoryTest : TestSetup() {
    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule(
                // workaround for toolbar at top position by default
                // remove with https://bugzilla.mozilla.org/show_bug.cgi?id=1917640
                shouldUseBottomToolbar = true,
            ),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/243285
    @Test
    fun verifyEmptyHistoryMenuTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
            verifyHistoryButton()
        }.clickHistoryButton {
            verifyHistoryMenuView()
            verifyEmptyHistoryView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2302742
    // Test running on beta/release builds in CI:
    // caution when making changes to it, so they don't block the builds
    @SmokeTest
    @Test
    fun verifyHistoryMenuWithHistoryItemsTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 1),
            ) {
                verifyHistoryMenuView()
                verifyVisitedTimeTitle()
                verifyFirstTestPageTitle("Test_Page_1")
                verifyTestPageUrl(firstWebPage.url)
                verifyDeleteHistoryItemButton("Test_Page_1")
            }
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/243288
    @Test
    fun deleteHistoryItemTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(
                    composeTestRule.activity.findViewById(R.id.history_list),
                    1,
                ),
            ) {
                clickDeleteHistoryButton(firstWebPage.url.toString())
            }
            verifySnackBarText(expectedText = "Deleted")
            verifyEmptyHistoryView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1848881
    @SmokeTest
    @Test
    fun deleteAllHistoryTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 1),
            ) {
                clickDeleteAllHistoryButton()
            }
            verifyDeleteConfirmationMessage()
            selectEverythingOption()
            confirmDeleteAllHistory()
            verifySnackBarText(expectedText = "Browsing data deleted")
            verifyEmptyHistoryView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/339690
    @Test
    fun historyMultiSelectionToolbarItemsTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 1),
            ) {
                longTapSelectItem(firstWebPage.url)
            }
        }

        multipleSelectionToolbar(composeTestRule) {
            verifyMultiSelectionCheckmark()
            verifyMultiSelectionCounter(1)
            verifyShareHistoryButton()
            verifyCloseToolbarButton()
        }.closeToolbarReturnToHistory {
            verifyHistoryMenuView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/339696
    @Test
    fun openMultipleSelectedHistoryItemsInANewTabTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openTabDrawer(composeTestRule) {
            closeTab()
        }

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 1),
            ) {
                longTapSelectItem(firstWebPage.url)
                openActionBarOverflowOrOptionsMenu(composeTestRule.activity)
            }
        }

        multipleSelectionToolbar(composeTestRule) {
        }.clickOpenNewTab {
            verifyNormalTabsList()
            verifyNormalBrowsingButtonIsSelected()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/346098
    @Test
    @SkipLeaks(reasons = ["https://bugzilla.mozilla.org/show_bug.cgi?id=2000810"])
    fun openMultipleSelectedHistoryItemsInPrivateTabTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 1),
            ) {
                longTapSelectItem(firstWebPage.url)
                openActionBarOverflowOrOptionsMenu(composeTestRule.activity)
            }
        }

        multipleSelectionToolbar(composeTestRule) {
        }.clickOpenPrivateTab {
            verifyPrivateTabsList()
            verifyPrivateBrowsingButtonIsSelected()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/346099
    @Test
    fun deleteMultipleSelectedHistoryItemsTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val secondWebPage = mockWebServer.getGenericAsset(2)

        createHistoryItem(firstWebPage.url.toString())
        createHistoryItem(secondWebPage.url.toString())

        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 2),
            ) {
                verifyHistoryItemExists(true, firstWebPage.url.toString())
                verifyHistoryItemExists(true, secondWebPage.url.toString())
                longTapSelectItem(firstWebPage.url)
                longTapSelectItem(secondWebPage.url)
                openActionBarOverflowOrOptionsMenu(composeTestRule.activity)
            }
        }

        multipleSelectionToolbar(composeTestRule) {
            clickMultiSelectionDelete()
        }

        historyMenu(composeTestRule) {
            verifyEmptyHistoryView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/339701
    @Test
    fun shareMultipleSelectedHistoryItemsTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            registerAndCleanupIdlingResources(
                RecyclerViewIdlingResource(composeTestRule.activity.findViewById(R.id.history_list), 1),
            ) {
                longTapSelectItem(firstWebPage.url)
            }
        }

        multipleSelectionToolbar(composeTestRule) {
            clickShareHistoryButton()
            verifyShareOverlay()
            verifyShareTabFavicon()
            verifyShareTabTitle()
            verifyShareTabUrl()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1715627
    @Ignore("Disabled after enabling the composable toolbar and main menu: https://bugzilla.mozilla.org/show_bug.cgi?id=2006295")
    @Test
    fun verifySearchHistoryViewTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
        }.clickSearchButton {
            verifySearchToolbar(true)
            verifySearchSelectorButton()
            verifySearchEngineIcon("History")
            verifySearchBarPlaceholder("Search history")
            verifySearchBarPosition(true)
            tapOutsideToDismissSearchBar()
            verifySearchToolbar(false)
            exitMenu()
        }
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickSettingsButton {
        }.openCustomizeSubMenu {
            clickTopToolbarToggle()
        }

        exitMenu()

        browserScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
        }.clickSearchButton {
            verifySearchToolbar(true)
            verifySearchBarPosition(false)
            pressBack()
        }
        historyMenu(composeTestRule) {
            verifyHistoryMenuView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1715631
    @SdkSuppress(minSdkVersion = 34)
    @Test
    fun verifyVoiceSearchInHistoryTest() {
        homeScreen(composeTestRule) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
        }.clickSearchButton {
            verifySearchToolbar(true)
            verifySearchEngineIcon("History")
            startVoiceSearch()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1715632
    @Test
    fun verifySearchForHistoryItemsTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val secondWebPage = mockWebServer.htmlControlsFormAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(secondWebPage.url) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
        }.clickSearchButton {
            // Search for a valid term
            typeSearch(firstWebPage.title)
            verifySearchSuggestionsAreDisplayed(firstWebPage.url.toString())
            verifySuggestionsAreNotDisplayed(secondWebPage.url.toString())
            clickClearButton()
            // Search for invalid term
            typeSearch("Android")
            verifySuggestionsAreNotDisplayed(firstWebPage.url.toString())
            verifySuggestionsAreNotDisplayed(secondWebPage.url.toString())
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1715634
    @Test
    fun verifyDeletedHistoryItemsCanNotBeSearchedTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val secondWebPage = mockWebServer.getGenericAsset(2)
        val thirdWebPage = mockWebServer.getGenericAsset(3)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            verifyPageContent(firstWebPage.content)
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(secondWebPage.url) {
            verifyPageContent(secondWebPage.content)
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(thirdWebPage.url) {
            verifyPageContent(thirdWebPage.content)
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyHistoryListExists()
            clickDeleteHistoryButton(firstWebPage.title)
            verifyHistoryItemExists(false, firstWebPage.title)
            clickDeleteHistoryButton(secondWebPage.title)
            verifyHistoryItemExists(false, secondWebPage.title)
        }.clickSearchButton {
            // Search for a valid term
            typeSearch("generic")
            verifySuggestionsAreNotDisplayed(firstWebPage.url.toString())
            verifySuggestionsAreNotDisplayed(secondWebPage.url.toString())
            verifySponsoredSuggestionsResults(thirdWebPage.url.toString(), searchTerm = "generic")
            pressBack()
        }
        historyMenu(composeTestRule) {
            clickDeleteHistoryButton(thirdWebPage.title)
            verifyHistoryItemExists(false, firstWebPage.title)
        }.clickSearchButton {
            // Search for a valid term
            typeSearch("generic")
            verifySuggestionsAreNotDisplayed(thirdWebPage.url.toString())
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/903590
    // Test running on beta/release builds in CI:
    // caution when making changes to it, so they don't block the builds
    @SmokeTest
    @Test
    fun noHistoryInPrivateBrowsingTest() {
        val website = mockWebServer.getGenericAsset(1)

        homeScreen(composeTestRule) {
        }.togglePrivateBrowsingMode()

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(website.url) {
            mDevice.waitForIdle()
        }.openThreeDotMenu {
        }.clickHistoryButton {
            verifyEmptyHistoryView()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/243287
    @Test
    fun openHistoryItemTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(defaultWebPage.url) {
        }.openThreeDotMenu {
        }.clickHistoryButton {
        }.openWebsite(defaultWebPage.url) {
            verifyUrl(defaultWebPage.url.toString())
        }
    }
}
