/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.core.net.toUri
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.FenixTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.homeScreen
import org.mozilla.fenix.ui.robots.navigationToolbar
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2

class CrashReportingTest {
    @get:Rule(order = 0)
    val fenixTestRule: FenixTestRule = FenixTestRule()

    private val mockWebServer get() = fenixTestRule.mockWebServer

    @get:Rule(order = 1)
    val composeTestRule = AndroidComposeTestRuleV2(
        HomeActivityIntentTestRule(
            isPocketEnabled = false,
            isWallpaperOnboardingEnabled = false,
        ),
    ) { it.activity }

    @get:Rule(order = 2)
    val memoryLeaksRule = DetectMemoryLeaksRule(composeTestRule = { composeTestRule })

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/308906
    @Test
    fun closeTabFromCrashedTabReporterTest() {
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("about:crashcontent".toUri()) {
        }.clickTabCrashedCloseButton {
        }.openTabDrawer {
            verifyNoOpenTabsInNormalBrowsing()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2336134
    @Test
    fun restoreTabFromTabCrashedReporterTest() {
        val website = mockWebServer.getGenericAsset(1)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(website.url) {
        }
        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("about:crashcontent".toUri()) {
            verifyTabCrashReporterView()
            clickPageObject(composeTestRule, itemWithResId("$packageName:id/restoreTabButton"))
            verifyPageContent(website.content)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1681928
    @SmokeTest
    @Test
    fun useAppWhileTabIsCrashedTest() {
        val firstWebPage = mockWebServer.getGenericAsset(1)
        val secondWebPage = mockWebServer.getGenericAsset(2)

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(firstWebPage.url) {
            mDevice.waitForIdle()
        }.openTabDrawer(composeTestRule) {
        }.openNewTab {
        }.submitQuery(secondWebPage.url.toString()) {
            waitForPageToLoad()
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser("about:crashcontent".toUri()) {
            verifyTabCrashReporterView()
        }.openTabDrawer(composeTestRule) {
            verifyExistingOpenTabs(firstWebPage.title)
            verifyExistingOpenTabs(secondWebPage.title)
        }.closeTabDrawer {
        }.goToHomescreen {
            verifyExistingTopSitesList()
        }.openThreeDotMenu {
            verifySettingsButton()
        }
    }
}
