/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Ignore
import org.junit.Test
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

class SettingsAccessibilityTest : BaseTest() {

    @Ignore("Covered by verifyNavigationReachability[0: SettingsAccessibilityPage (TBD) — Navigation Reachability]")
    @Test
    fun verifySettingsAccessibilityPageLoadsTest() {
        on.settingsAccessibility.navigateToPage()
    }
}
