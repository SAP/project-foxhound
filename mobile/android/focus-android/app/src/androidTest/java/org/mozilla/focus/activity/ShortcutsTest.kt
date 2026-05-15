/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("DEPRECATION")

package org.mozilla.focus.activity

import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.focus.activity.robots.browserScreen
import org.mozilla.focus.activity.robots.homeScreen
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.MockWebServerHelper
import org.mozilla.focus.helpers.TestAssetHelper.genericAsset
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.helpers.TestSetup
import org.mozilla.focus.testAnnotations.SmokeTest
import java.io.IOException

class ShortcutsTest : TestSetup() {
    private lateinit var webServer: MockWebServer
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule
    val mActivityTestRule = MainActivityFirstrunTestRule(showFirstRun = false)

    @Before
    override fun setUp() {
        super.setUp()
        featureSettingsHelper.setCfrForTrackingProtectionEnabled(false)
        featureSettingsHelper.setSearchWidgetDialogEnabled(false)
        webServer = MockWebServer().apply {
            dispatcher = MockWebServerHelper.AndroidAssetDispatcher()
            start()
        }
    }

    @After
    fun tearDown() {
        try {
            webServer.shutdown()
        } catch (e: IOException) {
            throw AssertionError("Could not stop web server", e)
        }
        featureSettingsHelper.resetAllFeatureFlags()
    }

    @SmokeTest
    @Test
    fun renameShortcutTest() {
        val webPage = object {
            val url = webServer.genericAsset.url
            val title = webServer.genericAsset.title
            val content = webServer.genericAsset.content
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
        val tab1 = webServer.getGenericTabAsset(1)
        val tab2 = webServer.getGenericTabAsset(2)

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
        val webPage = webServer.genericAsset

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
