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
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.RetryTestRule
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.helpers.TestHelper.randomString
import org.mozilla.focus.helpers.TestHelper.waitingTime
import org.mozilla.focus.testAnnotations.SmokeTest

/**
 * Tests to verify the functionality of Add to homescreen from the main menu
 */
@RunWith(AndroidJUnit4ClassRunner::class)
class AddToHomescreenTest {
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val mActivityTestRule = MainActivityFirstrunTestRule(showFirstRun = false)

    @Rule
    @JvmField
    val retryTestRule = RetryTestRule(3)

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
    }

    @After
    fun tearDown() {
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun addPageToHomeScreenTest() {
        val pageUrl = webServerRule.server.getGenericTabAsset(1).url
        val pageTitle = randomString(5)

        searchScreen {
        }.loadPage(pageUrl) {
            progressBar.waitUntilGone(waitingTime)
        }.openMainMenu {
        }.openAddToHSDialog {
            addShortcutWithTitle(pageTitle)
            handleAddAutomaticallyDialog()
        }.searchAndOpenHomeScreenShortcut(pageTitle) {
            verifyPageURL(pageUrl)
        }
    }

    @SmokeTest
    @Test
    fun noNameShortcutTest() {
        val pageUrl = webServerRule.server.getGenericTabAsset(1).url

        searchScreen {
        }.loadPage(pageUrl) {
        }.openMainMenu {
        }.openAddToHSDialog {
            // leave shortcut title empty and add it to HS
            addShortcutNoTitle()
            handleAddAutomaticallyDialog()
        }.searchAndOpenHomeScreenShortcut(webServerRule.server.hostName) {
            // only checking a part of the URL that is constant,
            // in case it opens a different shortcut on a retry
            verifyPageURL("tab1.html")
        }
    }
}
