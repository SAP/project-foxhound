/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.BookmarksSelectors
import org.mozilla.fenix.ui.efficiency.selectors.BrowserPageSelectors
import org.mozilla.fenix.ui.efficiency.selectors.HomeSelectors
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors

class BookmarksTest : BaseTest() {

    // TODO (I. RIOS 3/20/2026): add to BaseTest for State Machine
    private val mockWebServer get() = fenixTestRule.mockWebServer

    @Ignore("Covered by verifyNavigationReachability[0: BookmarksPage (TBD) — Navigation Reachability]")
    @Test
    fun verifyBookmarksSectionTest() {
        on.bookmarks.navigateToPage()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2833691
    @SmokeTest
    @Test
    fun editBookmarksNameAndUrlTest() {
        val defaultWebPage = mockWebServer.getGenericAsset(1)
        val editedWebPage = mockWebServer.getGenericAsset(2)
        on.browserPage.navigateToPage(defaultWebPage.url.toString())
            .mozClick(HomeSelectors.MAIN_MENU_BUTTON)
            .mozClick(MainMenuSelectors.BOOKMARK_THIS_PAGE_BUTTON)
            .mozClick(BrowserPageSelectors.SNACKBAR_EDIT_BUTTON)
        on.bookmarks
            .mozClearAndEnterText("Bookmark title", BookmarksSelectors.EDIT_BOOKMARK_ITEM_TITLE_TEXT_FIELD)
            .mozClearAndEnterText(editedWebPage.url.toString(), BookmarksSelectors.EDIT_BOOKMARK_ITEM_URL_TEXT_FIELD)
            .mozClick(BookmarksSelectors.NAVIGATE_UP_BUTTON)
        on.bookmarks.navigateToPage()
            .mozClick(BookmarksSelectors.BOOKMARK_TITLE_TEXT)
    }
}
