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
import org.mozilla.focus.activity.robots.homeScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.helpers.TestHelper.waitingTimeShort
import org.mozilla.focus.testAnnotations.SmokeTest

// These tests check the advanced settings options
@RunWith(AndroidJUnit4ClassRunner::class)
class SettingsAdvancedTest {

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
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun openLinksInAppsTest() {
        val tab3Url = webServerRule.server.getGenericTabAsset(3).url

        homeScreen {
        }.openMainMenu {
        }.openSettings {
        }.openAdvancedSettingsMenu {
            verifyOpenLinksInAppsSwitchState(false)
            clickOpenLinksInAppsSwitch()
            verifyOpenLinksInAppsSwitchState(true)
        }.goBackToSettings {
        }.goBackToHomeScreen {
        }.loadPage(tab3Url) {
            progressBar.waitUntilGone(waitingTimeShort)
            clickLinkMatchingText("Mozilla Youtube link")
            verifyOpenLinksInAppsPrompt(true)
            clickOpenLinksInAppsCancelButton()
        }.clearBrowsingData {
        }.openMainMenu {
        }.openSettings {
        }.openAdvancedSettingsMenu {
            verifyOpenLinksInAppsSwitchState(true)
            clickOpenLinksInAppsSwitch()
            verifyOpenLinksInAppsSwitchState(false)
        }.goBackToSettings {
        }.goBackToHomeScreen {
        }.loadPage(tab3Url) {
            progressBar.waitUntilGone(waitingTimeShort)
            clickLinkMatchingText("Mozilla Youtube link")
            verifyOpenLinksInAppsPrompt(false)
        }
    }
}
