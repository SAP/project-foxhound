/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.customannotations.SmokeTest
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest
import org.mozilla.fenix.ui.efficiency.selectors.SettingsAppIconSelectors
import org.mozilla.fenix.ui.efficiency.selectors.SettingsCustomizeSelectors

class SettingsCustomizeTest : BaseTest() {

    @Ignore("Covered by verifyNavigationReachability[0: SettingsCustomizePage (TBD) — Navigation Reachability]")
    @Test
    fun verifySettingsCustomizeLoadsTest() {
        on.settingsCustomize.navigateToPage()
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3333174
    @Test
    fun verifyTheToolbarLayoutSectionTest() {
        on.settingsCustomize.navigateToPage()
        on.settingsCustomize.mozVerifyElementsByGroup("toolbarLayout")
        on.settingsCustomize.verifyOptionIsSelected(SettingsCustomizeSelectors.TOOLBAR_LAYOUT_SIMPLE)
        on.settingsCustomize.mozClick(SettingsCustomizeSelectors.TOOLBAR_LAYOUT_EXPANDED)
        on.settingsCustomize.mozClick(SettingsCustomizeSelectors.TOOLBAR_POSITION_BOTTOM)
        on.settingsCustomize.verifyOptionIsSelected(SettingsCustomizeSelectors.TOOLBAR_POSITION_BOTTOM)
        on.settingsCustomize.mozVerifyElementsByGroup("toolbarLayout")
        on.settingsCustomize.verifyOptionIsSelected(SettingsCustomizeSelectors.TOOLBAR_LAYOUT_EXPANDED)
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3186734
    @SmokeTest
    @Test
    fun verifyTheChangeAppIconButtonTest() {
        on.settingsCustomize.navigateToPage()
            .mozVerifyElementHasSiblingWithText(
                selector = SettingsCustomizeSelectors.SELECT_APP_ICON_TITLE,
                siblingText = SettingsCustomizeSelectors.APP_ICON_DEFAULT.value,
            )
        on.settingsAppIcon.navigateToPage()
            .clickAppIconOption(SettingsAppIconSelectors.DARK_ICON)
            .mozVerifyElementsByGroup("changeIconDialog")
        on.settingsAppIcon.clickChangeIconButton()
        on.settingsAppIcon.restartApp()
        on.settingsCustomize.navigateToPage()
            .mozVerifyElementHasSiblingWithText(
                selector = SettingsCustomizeSelectors.SELECT_APP_ICON_TITLE,
                siblingText = SettingsAppIconSelectors.DARK_ICON.value,
            )
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3186731
    @SmokeTest
    @Test
    fun verifyTheAppIconSelectionPageTest() {
        on.settingsAppIcon.navigateToPage()
            .mozVerifyElementsByGroup("appIconItems")
            .mozVerifyElementsByGroup("appIconGradientsItems")
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/3186732
    @SmokeTest
    @Test
    fun verifyTheDefaultAppIconSettingTest() {
        on.settingsCustomize.navigateToPage()
            .mozVerifyElementHasSiblingWithText(
                selector = SettingsCustomizeSelectors.SELECT_APP_ICON_TITLE,
                siblingText = SettingsCustomizeSelectors.APP_ICON_DEFAULT.value,
            )
    }
}
