/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.focus.activity

import androidx.test.internal.runner.junit4.AndroidJUnit4ClassRunner
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityIntentsTestRule
import org.mozilla.focus.helpers.StringsHelper.GOOGLE_CHROME
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestHelper.assertNativeAppOpens
import org.mozilla.focus.testAnnotations.SmokeTest

// This test verifies the "Open in..." option from the main menu
@RunWith(AndroidJUnit4ClassRunner::class)
class OpenInExternalBrowserDialogueTest {
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val mActivityTestRule = MainActivityIntentsTestRule(showFirstRun = false)

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
    }

    @After
    fun tearDown() {
        mActivityTestRule.activity.finishAndRemoveTask()
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun openPageInExternalAppTest() {
        val pageUrl = webServerRule.server.genericAsset.url

        searchScreen {
        }.loadPage(pageUrl) {
        }.openMainMenu {
            clickOpenInOption()
            verifyOpenInDialog()
            clickOpenInChrome()
            assertNativeAppOpens(GOOGLE_CHROME)
        }
    }
}
