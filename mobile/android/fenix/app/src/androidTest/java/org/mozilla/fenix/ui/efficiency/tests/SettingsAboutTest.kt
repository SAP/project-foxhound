/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

class SettingsAboutTest : BaseTest() {

     // TestRail: https://mozilla.testrail.io/index.php?/cases/view/2092700
     @Test
     fun verifyAboutSettingsItemsTest() {
         on.settings.navigateToPage()
             .mozVerifyElementsByGroup("aboutSection")
     }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/246966
    @Test
    fun verifyRateOnGooglePlayButtonTest() {
        on.settings.navigateToPage()
            .mozVerifyElementsByGroup("googlePlay")
    }

    @Test
    fun verifyLibrariesListInReleaseBuildsTest() {
            on.settingsAbout.navigateToPage()
                .mozVerifyElementsByGroup("librariesThatWeUse")
                .mozVerifyElementsByGroup("aboutInfo")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132639
    @Test
    fun verifyAboutFirefoxMenuAppDetailsItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("aboutInfo")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132640
    @Test
    fun verifyAboutFirefoxMenuWhatsNewInFirefoxItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("whatsNew")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132641
    @Test
    fun verifyAboutFirefoxMenuSupportItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("supportItem")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132642
    @Test
    fun verifyAboutFirefoxMenuCrashesItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("crashes")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132643
    @Test
    fun verifyAboutFirefoxMenuPrivacyNoticeItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("privacyNotice")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132644
    @Test
    fun verifyAboutFirefoxMenuKnowYourRightsItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("knowYourRights")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132645
    @Test
    fun verifyAboutFirefoxMenuLicensingInformationItemTest() {
        on.settingsAbout.navigateToPage()
           .mozVerifyElementsByGroup("licensingInformation")
    }

    // TestRail: https://mozilla.testrail.io/index.php?/cases/view/3132646
    @Test
    fun verifyAboutFirefoxMenuLibrariesThatWeUseItemTest() {
        on.settingsAbout.navigateToPage()
            .mozVerifyElementsByGroup("librariesThatWeUse")
    }
}
