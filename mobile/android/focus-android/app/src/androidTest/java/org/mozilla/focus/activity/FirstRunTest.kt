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
import org.mozilla.focus.helpers.TestHelper.restartApp
import org.mozilla.focus.testAnnotations.SmokeTest

// Tests the First run onboarding screens
@RunWith(AndroidJUnit4ClassRunner::class)
class FirstRunTest {
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    @get:Rule
    val mActivityTestRule = MainActivityFirstrunTestRule(showFirstRun = true)

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
    }

    @After
    fun stopWebServer() {
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun onboardingScreensTest() {
        homeScreen {
            verifyFirstOnboardingScreenItems()
            restartApp(mActivityTestRule)
            verifyFirstOnboardingScreenItems()
            clickAgreeAndContinueButton()
            verifySecondOnboardingScreenItems()
            restartApp(mActivityTestRule)
            verifySecondOnboardingScreenItems()
        }
    }
}
