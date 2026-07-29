/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.focus.activity

import androidx.test.internal.runner.junit4.AndroidJUnit4ClassRunner
import androidx.test.platform.app.InstrumentationRegistry
import mozilla.components.browser.state.selector.privateTabs
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.focus.R
import org.mozilla.focus.activity.robots.browserScreen
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.ext.components
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.RetryTestRule
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.helpers.TestHelper.clickSnackBarActionButton
import org.mozilla.focus.helpers.TestHelper.getStringResource
import org.mozilla.focus.helpers.TestHelper.openAppFromExternalLink
import org.mozilla.focus.helpers.TestHelper.verifySnackBarText
import org.mozilla.focus.testAnnotations.SmokeTest

/**
 * Open multiple sessions and verify that the trash icon changes to a tabs counter
 */
@RunWith(AndroidJUnit4ClassRunner::class)
class MultitaskingTest {
    private val store = InstrumentationRegistry.getInstrumentation()
        .targetContext
        .applicationContext
        .components
        .store
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
    @Throws(Exception::class)
    fun setUp() {
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
    }

    @After
    @Throws(Exception::class)
    fun tearDown() {
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun testVisitingMultipleSites() {
        val tab1 = webServerRule.server.getGenericTabAsset(1)
        val tab2 = webServerRule.server.getGenericTabAsset(2)
        val tab3 = webServerRule.server.getGenericTabAsset(3)
        val eraseBrowsingSnackBarText = getStringResource(R.string.feedback_erase2)
        val customTabPage = webServerRule.server.genericAsset

        // Load website: Erase button visible, Tabs button not
        searchScreen {
        }.loadPage(tab1.url) {
            longPressLink("Tab 2")
            verifyLinkContextMenu(tab2.url)
            openLinkInNewTab()
            verifyNumberOfTabsOpened(2)
            longPressLink("Tab 3")
            openLinkInNewTab()
            verifySnackBarText("New private tab opened")
            clickSnackBarActionButton("SWITCH")
            verifyNumberOfTabsOpened(3)
        }

        openAppFromExternalLink(customTabPage.url)
        browserScreen {
            verifyNumberOfTabsOpened(4)
        }.openTabsTray {
            verifyTabsOrder("Add new tab", tab1.title, tab3.title, tab2.title, customTabPage.title)
        }.selectTab(tab1.title) {
            verifyPageContent("Tab 1")
        }.clearBrowsingData {
            verifySnackBarText(eraseBrowsingSnackBarText)
            assertTrue(store.state.privateTabs.isEmpty())
        }
    }

    @SmokeTest
    @Test
    fun closeTabButtonTest() {
        val tab1 = webServerRule.server.getGenericTabAsset(1)
        val tab2 = webServerRule.server.getGenericTabAsset(2)
        val tab3 = webServerRule.server.getGenericTabAsset(3)

        searchScreen {
        }.loadPage(tab1.url) {
            verifyPageContent("Tab 1")
            longPressLink("Tab 2")
            openLinkInNewTab()
            longPressLink("Tab 3")
            openLinkInNewTab()
            verifyNumberOfTabsOpened(3)
        }.openTabsTray {
            verifyTabsOrder("Add new tab", tab1.title, tab3.title, tab2.title)
        }.closeTab(tab1.title) {
        }.openTabsTray {
            verifyTabsOrder("Add new tab", tab3.title, tab2.title)
        }.closeTab(tab3.title) {
        }.openTabsTray {
            verifyTabsOrder("Add new tab", tab2.title)
        }.closeTab(tab2.title) {
            verifyTabsCounterNotShown()
        }
    }

    @SmokeTest
    @Test
    fun verifyTabsTrayListTest() {
        val tab1 = webServerRule.server.getGenericTabAsset(1)
        val tab2 = webServerRule.server.getGenericTabAsset(2)

        searchScreen {
        }.loadPage(tab1.url) {
            longPressLink("Tab 2")
            openLinkInNewTab()
        }.openTabsTray {
        }.selectTab(tab2.title) {
        }.openTabsTray {
            verifyCloseTabButton(tab1.title)
            verifyCloseTabButton(tab2.title)
        }
    }

    @SmokeTest
    @Test
    fun verifyTheTabsTrayAddNewTabButtonTest() {
        val tab1 = webServerRule.server.getGenericTabAsset(1)
        val tab2 = webServerRule.server.getGenericTabAsset(2)
        val tab3 = webServerRule.server.getGenericTabAsset(3)

        searchScreen {
        }.loadPage(tab1.url) {
        }.openTabsTray {
            verifyTheAddNewTabButtonIsDisplayed()
            verifyTabsOrder("Add new tab", tab1.title)
            verifyTheCloseOtherTabsButtonIsDisplayed()
        }.clickTheAddNewTabButton {
        }

        searchScreen {
        }.loadPage(tab2.url) {
            verifyNumberOfTabsOpened(2)
        }.openTabsTray {
        }.clickTheAddNewTabButton {
        }

        searchScreen {
        }.loadPage(tab3.url) {
            verifyNumberOfTabsOpened(3)
        }
    }
}
