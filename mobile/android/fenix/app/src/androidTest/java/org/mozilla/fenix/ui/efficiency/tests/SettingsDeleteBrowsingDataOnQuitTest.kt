/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import android.Manifest
import androidx.test.rule.GrantPermissionRule
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.helpers.TestAssetHelper
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.TestHelper.restartApp
import org.mozilla.fenix.helpers.ext.waitNotNull
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.DownloadsSelectors
import org.mozilla.fenix.ui.efficiency.selectors.MainMenuSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsDeleteBrowsingDataOnQuitSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SitePermissionsSelectors

class SettingsDeleteBrowsingDataOnQuitTest : BaseTest() {
    @get:Rule
    val grantPermissionRule: GrantPermissionRule = GrantPermissionRule.grant(Manifest.permission.RECORD_AUDIO)

    @Ignore("Covered by verifyNavigationReachability[1: SettingsDeleteBrowsingDataOnQuitPage (TBD) — Navigation Reachability]")
    @Test
    fun verifyTheDeleteBrowsingDataOnQuitSectionTest() {
        on.settingsDeleteBrowsingDataOnQuit.navigateToPage()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1243096
    @SmokeTest
    @Test
    fun deleteDownloadsOnQuitTest() {
        val downloadTestPage = "https://storage.googleapis.com/mobile_test_assets/test_app/downloads.html"

        on.settingsDeleteBrowsingDataOnQuit.navigateToPage()
            .mozClick(SettingsDeleteBrowsingDataOnQuitSelectors.DELETE_BROWSING_DATA_ON_QUIT_TOGGLE)
        on.home.navigateToPage()
        on.browserPage.navigateToPage(downloadTestPage)
            .clickPageContent("smallZip.zip")
            .mozClick(DownloadsSelectors.DOWNLOAD_DIALOG_CONFIRM_BUTTON)
            .mozVerify(DownloadsSelectors.DOWNLOAD_COMPLETE_SNACKBAR, timeout = 15_000)
        on.home.navigateToPage()
        on.mainMenu.navigateToPage()
            .mozClick(MainMenuSelectors.QUIT_FIREFOX_BUTTON)
        mDevice.waitNotNull(Until.gone(By.pkg(packageName)), TestAssetHelper.waitingTime)
        restartApp(composeRule.activityRule)
        on.home.navigateToPage()
        on.downloads.navigateToPage()
            .mozVerifyElementsByGroup("emptyDownloads")
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/416053
    @SmokeTest
    @Test
    fun deleteSitePermissionsOnQuitTest() {
        val testPage = "https://mozilla-mobile.github.io/testapp/permissions"

        on.settingsDeleteBrowsingDataOnQuit.navigateToPage()
            .mozClick(SettingsDeleteBrowsingDataOnQuitSelectors.DELETE_BROWSING_DATA_ON_QUIT_TOGGLE)
        on.browserPage.navigateToPage(testPage)
            .verifyPageContent("Open microphone")
            .clickPageContent("Open microphone")
        on.browserPage
            .mozVerify(SitePermissionsSelectors.MICROPHONE_PERMISSION_PROMPT)
            .mozClick(SitePermissionsSelectors.PAGE_PERMISSION_REMEMBER_DECISION_CHECKBOX)
            .mozClick(SitePermissionsSelectors.PAGE_PERMISSION_DIALOG_DENY_BUTTON)
        on.browserPage.verifyPageContent("Microphone not allowed")
        on.home.navigateToPage()
        on.mainMenu.navigateToPage()
            .mozClick(MainMenuSelectors.QUIT_FIREFOX_BUTTON)
        mDevice.waitNotNull(Until.gone(By.pkg(packageName)), TestAssetHelper.waitingTime)
        restartApp(composeRule.activityRule)
        on.home.navigateToPage()
        on.browserPage.navigateToPage(testPage)
            .verifyPageContent("Open microphone")
            .clickPageContent("Open microphone")
        on.browserPage
            .mozVerify(SitePermissionsSelectors.MICROPHONE_PERMISSION_PROMPT)
    }
}
