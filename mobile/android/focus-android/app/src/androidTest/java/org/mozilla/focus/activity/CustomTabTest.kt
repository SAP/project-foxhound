/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("DEPRECATION")

package org.mozilla.focus.activity

import androidx.lifecycle.Lifecycle
import androidx.test.core.app.launchActivity
import androidx.test.internal.runner.junit4.AndroidJUnit4ClassRunner
import androidx.test.rule.ActivityTestRule
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.focus.activity.robots.browserScreen
import org.mozilla.focus.activity.robots.customTab
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.helpers.TestHelper.createCustomTabIntent
import org.mozilla.focus.helpers.TestHelper.mDevice
import org.mozilla.focus.helpers.TestHelper.waitingTime
import org.mozilla.focus.testAnnotations.SmokeTest

@RunWith(AndroidJUnit4ClassRunner::class)
class CustomTabTest {
    private val menuItemTestLabel = "TestItem4223"
    private val actionButtonDescription = "TestButton"
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val activityTestRule = ActivityTestRule(
        IntentReceiverActivity::class.java,
        true,
        false,
    )

    @Before
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
        featureSettingsHelper.setShowStartBrowsingCfrEnabled(false)
        featureSettingsHelper.setCookieBannerReductionEnabled(false)
    }

    @After
    fun tearDown() {
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun testCustomTabUI() {
        val customTabPage = webServerRule.server.genericAsset
        val customTabActivity =
            launchActivity<IntentReceiverActivity>(
                createCustomTabIntent(customTabPage.url, menuItemTestLabel, actionButtonDescription),
            )

        browserScreen {
            progressBar.waitUntilGone(waitingTime)
            verifyPageContent(customTabPage.content)
            verifyCustomTabUrl(customTabPage.url)
        }

        customTab {
            verifyCustomTabActionButton(actionButtonDescription)
            verifyShareButtonIsDisplayed()
            openCustomTabMenu()
            verifyTheStandardMenuItems()
            verifyCustomMenuItem(menuItemTestLabel)
            // Close the menu and close the tab
            mDevice.pressBack()
            closeCustomTab()
            assertEquals(Lifecycle.State.DESTROYED, customTabActivity.state)
        }
    }

    @SmokeTest
    @Test
    fun openCustomTabInFocusTest() {
        val customTabPage = webServerRule.server.getGenericTabAsset(1)

        launchActivity<IntentReceiverActivity>(createCustomTabIntent(customTabPage.url))
        customTab {
            progressBar.waitUntilGone(waitingTime)
            verifyCustomTabUrl(customTabPage.url)
            openCustomTabMenu()
        }.clickOpenInFocusButton {
            verifyCustomTabUrl(customTabPage.url)
        }
    }

    @SmokeTest
    @Test
    fun customTabNavigationButtonsTest() {
        val firstPage = webServerRule.server.getGenericTabAsset(1)
        val secondPage = webServerRule.server.getGenericTabAsset(2)

        launchActivity<IntentReceiverActivity>(createCustomTabIntent(firstPage.url))
        customTab {
            verifyPageContent(firstPage.content)
            clickLinkMatchingText("Tab 2")
            verifyCustomTabUrl(secondPage.url)
        }.openCustomTabMenu {
        }.pressBack {
            progressBar.waitUntilGone(waitingTime)
            verifyCustomTabUrl(firstPage.url)
        }.openMainMenu {
        }.pressForward {
            verifyCustomTabUrl(secondPage.url)
        }.openMainMenu {
        }.clickReloadButton {
            verifyPageContent(secondPage.content)
        }
    }
}
