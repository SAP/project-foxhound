/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.FindInPageSelectors

class FindInPageTest : BaseTest() {

    private val mockWebServer get() = fenixTestRule.mockWebServer

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3080130
    @SmokeTest
    @Test
    fun verifyTheFindInPageMenuItemTest() {
        val testPage = mockWebServer.getGenericAsset(3)

        on.findInPage.navigateToPage(testPage.url.toString())
            .verifyFindInPageElement("a", 3)
        on.browserPage.navigateToPage()
            .mozVerifyElementAbsent(FindInPageSelectors.FIND_IN_PAGE_CLOSE_BUTTON)
        on.findInPage.navigateToPage()
            .verifyFindInPageElement("3", 1)
        on.browserPage.navigateToPage()
            .mozVerifyElementAbsent(FindInPageSelectors.FIND_IN_PAGE_CLOSE_BUTTON)
    }
}
