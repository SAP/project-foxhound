/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.activity

import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule

class AboutURITest {
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    @get:Rule
    val mActivityTestRule = MainActivityFirstrunTestRule(showFirstRun = false)

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
    }

    @After
    fun tearDown() {
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @Test
    fun verifyWebCompatPageIsLoadingTest() {
        val webCompatPage = "about:compat"

        searchScreen {
        }.loadPage(webCompatPage) {
            verifyPageURL(webCompatPage)

            verifyPageContent("More Information: Bug")
            verifyPageContent("Interventions")
            verifyPageContent("Disable", alsoClick = true)
            verifyPageContent("Enable", alsoClick = true)
            verifyPageContent("Disable", alsoClick = true)

            verifyPageContent("SmartBlock Fixes", alsoClick = true)
            verifyPageContent("More Information: Bug")
            verifyPageContent("Disable")
        }
    }
}
