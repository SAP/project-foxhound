/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.focus.privacy

import androidx.test.internal.runner.junit4.AndroidJUnit4ClassRunner
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.TestAssetHelper.getStorageTestAsset
import java.io.IOException

/**
 * Test that Global Privacy Control is always enabled in Focus.
 */
@RunWith(AndroidJUnit4ClassRunner::class)
class GlobalPrivacyControlTest {

    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val mActivityTestRule = MainActivityFirstrunTestRule(showFirstRun = false)

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
        featureSettingsHelper.setSearchWidgetDialogEnabled(false)
    }

    @After
    fun tearDown() {
        try {
            } catch (e: IOException) {
            throw AssertionError("Could not stop web server", e)
        }
    }

    @Test
    fun gpcTest() {
        val storageStartUrl = webServerRule.server.getStorageTestAsset("global_privacy_control.html").url

        searchScreen {
        }.loadPage(storageStartUrl) {
            verifyPageContent("GPC is enabled.")
        }
    }
}
