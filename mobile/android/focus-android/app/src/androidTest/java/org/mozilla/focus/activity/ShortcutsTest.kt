/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("DEPRECATION")

package org.mozilla.focus.activity

import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.focus.activity.robots.browserScreen
import org.mozilla.focus.activity.robots.homeScreen
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.testAnnotations.SmokeTest

class ShortcutsTest {
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
    fun renameShortcutTest() {
        val webPage = object {
            val url = webServerRule.server.genericAsset.url
            val title = webServerRule.server.genericAsset.title
            val content = webServerRule.server.genericAsset.content
            val newTitle = "TestShortcut"
        }

        searchScreen {
        }.loadPage(webPage.url) {
            verifyPageContent(webPage.content)
        }.openMainMenu {
            clickAddToShortcuts()
        }
        browserScreen {
        }.clearBrowsingData {
            verifyPageShortcutExists(webPage.title)
            longTapPageShortcut(webPage.title)
            clickRenameShortcut()
            renameShortcutAndSave(webPage.newTitle)
            verifyPageShortcutExists(webPage.newTitle)
        }
    }

    @SmokeTest
    @Test
    fun shortcutsDoNotOpenInNewTabTest() {
        val tab1 = webServerRule.server.getGenericTabAsset(1)
        val tab2 = webServerRule.server.getGenericTabAsset(2)

        searchScreen {
        }.loadPage(tab1.url) {
        }.openMainMenu {
            clickAddToShortcuts()
        }
        browserScreen {
        }.clearBrowsingData {
            verifyPageShortcutExists(tab1.title)
        }

        searchScreen {
        }.loadPage(tab2.url) {
        }.openSearchBar {
        }

        homeScreen {
        }.clickPageShortcut(tab1.title) {
        }.openTabsTray {
            verifyTabsOrder("Add new tab", tab1.title)
        }.closeTab(tab1.title) {
            verifyTabsCounterNotShown()
        }
    }

    @SmokeTest
    @Test
    fun searchBarShowsPageShortcutsTest() {
        val webPage = webServerRule.server.genericAsset

        searchScreen {
        }.loadPage(webPage.url) {
            verifyPageContent(webPage.content)
        }.openMainMenu {
            clickAddToShortcuts()
        }
        browserScreen {
        }.clearBrowsingData {
            verifyPageShortcutExists(webPage.title)
        }.clickPageShortcut(webPage.title) {
        }.openSearchBar {
            verifySearchSuggestionsContain(webPage.title)
        }
    }
}
