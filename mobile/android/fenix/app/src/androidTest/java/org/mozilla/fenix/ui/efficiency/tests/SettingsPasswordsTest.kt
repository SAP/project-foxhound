/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

class SettingsPasswordsTest : BaseTest() {

    @Ignore("Covered by verifyNavigationReachability[1: SettingsPasswordsPage (TBD) — Navigation Reachability]")
    @Test
    fun verifySettingsPasswordsLoadsTest() {
        on.settingsPasswords.navigateToPage()
    }

    @Ignore("Covered by verifyNavigationReachability[1: SettingsSavePasswordsPage (TBD) — Navigation Reachability]")
    @Test
    fun verifySettingsSavePasswordsSectionTest() {
        on.settingsSavePasswords.navigateToPage()
    }
}
