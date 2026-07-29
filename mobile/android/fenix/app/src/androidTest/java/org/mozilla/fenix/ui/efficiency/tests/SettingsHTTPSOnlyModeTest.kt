/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

class SettingsHTTPSOnlyModeTest : BaseTest() {

    @Ignore("Covered by verifyNavigationReachability[1: SettingsHTTPSOnlyModePage (TBD) — Navigation Reachability]")
    @Test
    fun verifyTheHTTPSOnlyModeSectionTest() {
        on.settingsHTTPSOnlyMode.navigateToPage()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/1724827
    @SmokeTest
    @Test
    fun httpsOnlyModeEnabledInNormalBrowsingTest() {
        on.settingsHTTPSOnlyMode.navigateToPage()
            .enableHttpsOnlyMode()
            .verifyHttpsOnlyAllTabsSelected()

        on.settings.navigateToPage()
            .verifyHttpsOnlyModeOnAllTabs()

        on.home.navigateToPage()

        on.browserPage.navigateToPage("http://permission.site/")
            .verifyPageContent("permission.site")

        on.searchBar.navigateToPage()
            .verifyUrl("https://permission.site/")

        on.browserPage.navigateToPage("http.badssl.com")
            .verifyHttpsOnlyErrorPage()
            .goBackFromHttpsError()
            .verifyPageContent("permission.site")

        on.searchBar.navigateToPage()
        on.browserPage.navigateToPage("http.badssl.com")
            .continueToHttpSite()
            .verifyPageContent("http.badssl.com")
    }
}
