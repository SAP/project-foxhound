/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestAssetHelper.pdfFormAsset
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.BookmarksSelectors
import org.mozilla.fenix.ui.efficiency.selectors.BookmarksSelectors.DELETE_BOOKMARK_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.BrowserPageSelectors
import org.mozilla.fenix.ui.efficiency.selectors.HistorySelectors.NAVIGATE_BACK_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.HomeSelectors
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors.BACK_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors.BOOKMARK_THIS_PAGE_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors.EDIT_BOOKMARK_BUTTON
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors.FORWARD_BUTTON

class MainMenuTest : BaseTest() {

    private val mockWebServer get() = fenixTestRule.mockWebServer

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080168
    @SmokeTest
    @Test
    fun verifyMainMenuItemsTest() {
        on.mainMenu.navigateToPage()
            .mozVerifyElementsByGroup("homePageMainMenuItems")
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080124
    @SmokeTest
    @Test
    fun verifyTheBrowserViewMainMenuItemsTest() {
        val website = mockWebServer.getGenericAsset(1)

        on.browserPage.navigateToPage(website.url.toString())
        on.mainMenu.navigateToPage()
            .mozVerifyElementsByGroup("browserViewMainMenuItems")
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080172
    @SmokeTest
    @Test
    fun verifyTheExtensionsMenuOptionTest() {
        on.settingsAddonsManager.navigateToPage()
            .mozVerifyElementsByGroup("addOns")
        on.home.navigateToPage()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080181
    @SmokeTest
    @Ignore("Covered by verifyNavigationReachability[1: SettingsHomepagePage (TBD) — Navigation Reachability]")
    @Test
    fun verifyTheHomePageSettingsMenuItemTest() {
        on.settings.navigateToPage()
        on.home.navigateToPage()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080129
    @SmokeTest
    @Test
    fun verifyBookmarkPageMenuOptionTest() {
        val testPage = mockWebServer.getGenericAsset(1)
        on.browserPage.navigateToPage(testPage.url.toString())
            .mozClick(HomeSelectors.MAIN_MENU_BUTTON_UIAUTOMATOR)
            .mozClick(MainMenuSelectors.BOOKMARK_THIS_PAGE_BUTTON)
            .mozClick(BrowserPageSelectors.SNACKBAR_EDIT_BUTTON)
        on.bookmarks
            .mozVerifyElementsByGroup("bookmarkEdit")
            .mozClick(BookmarksSelectors.DELETE_BOOKMARK_BUTTON)
        on.browserPage
            .mozClick(HomeSelectors.MAIN_MENU_BUTTON_UIAUTOMATOR)
        on.mainMenu
            .mozVerifyElementsByGroup("bookmarkActions")
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080138
    @SmokeTest
    @Test
    fun verifyTheDownloadsMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        on.browserPage.navigateToPage(testPage.url.toString())
        on.downloads.navigateToPage()
            .mozVerifyElementsByGroup("emptyDownloads")
        on.browserPage.navigateToPage()
            .verifyPageContent(testPage.content)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080129
    @SmokeTest
    @Test
    fun verifyTheBookmarkPageMenuOptionTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        on.browserPage.navigateToPage(testPage.url.toString())
        on.mainMenu.navigateToPage()
            .mozClick(BOOKMARK_THIS_PAGE_BUTTON)
        on.browserPage.navigateToPage()
        on.mainMenu.navigateToPage()
            .mozClick(EDIT_BOOKMARK_BUTTON)
        on.bookmarks
            .mozVerifyElementsByGroup("editBookmarksView")
            .mozClick(DELETE_BOOKMARK_BUTTON)
        on.browserPage.navigateToPage()
        on.mainMenu.navigateToPage()
            .mozVerify(BOOKMARK_THIS_PAGE_BUTTON)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080136
    @SmokeTest
    @Test
    fun verifyTheHistoryMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        on.browserPage.navigateToPage(testPage.url.toString())
        on.history.navigateToPage()
            .mozVerifyElementsByGroup("historyMenuViewWithHistoryItems")
            .mozClick(NAVIGATE_BACK_BUTTON)
        on.browserPage
            .verifyPageContent(testPage.content)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080133
    @SmokeTest
    @Test
    fun verifySwitchToDesktopSiteIsDisabledOnPDFsTest() {
        val pdfPage = mockWebServer.pdfFormAsset

        on.browserPage.navigateToPage(pdfPage.url.toString())
        on.mainMenu.navigateToPage()
            .mozVerifyElementIsNotEnabled(MainMenuSelectors.DESKTOP_SITE_BUTTON)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080139
    @SmokeTest
    @Test
    fun verifyThePasswordsMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(1)

        on.browserPage.navigateToPage(testPage.url.toString())
        on.settingsSavedPasswords.navigateToPage()
            .mozVerifyElementsByGroup("emptySavedPasswordsList")
        on.browserPage.navigateToPage()
            .verifyPageContent(testPage.content)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080126
    @SmokeTest
    @Test
    fun verifyTheMainMenuForwardButtonTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val nextWebPage = mockWebServer.getGenericAsset(2)

        on.browserPage
            .navigateToPage(firstWebPage.url.toString())
            .verifyUrl(firstWebPage.url.toString())
            .navigateToPage(nextWebPage.url.toString(), forceNavigation = true)
            .verifyUrl(nextWebPage.url.toString())
        on.mainMenu.navigateToPage()
            .mozClick(BACK_BUTTON)
        on.browserPage.navigateToPage()
            .verifyUrl(firstWebPage.url.toString())
        on.mainMenu.navigateToPage()
            .mozClick(FORWARD_BUTTON)
        on.browserPage.navigateToPage()
            .verifyUrl(nextWebPage.url.toString())
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080125
    @SmokeTest
    @Test
    fun verifyTheMainMenuBackButtonTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val nextWebPage = mockWebServer.getGenericAsset(2)

        on.browserPage
            .navigateToPage(firstWebPage.url.toString())
            .verifyUrl(firstWebPage.url.toString())
            .navigateToPage(nextWebPage.url.toString(), forceNavigation = true)
            .verifyUrl(nextWebPage.url.toString())
        on.mainMenu.navigateToPage()
            .mozClick(BACK_BUTTON)
        on.browserPage.navigateToPage()
            .verifyUrl(firstWebPage.url.toString())
    }
}
