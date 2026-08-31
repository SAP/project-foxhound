/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.focus.activity

import androidx.test.internal.runner.junit4.AndroidJUnit4ClassRunner
import org.junit.After
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.DeleteFilesHelper.deleteFileUsingDisplayName
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityIntentsTestRule
import org.mozilla.focus.helpers.RetryTestRule
import org.mozilla.focus.helpers.StringsHelper
import org.mozilla.focus.helpers.TestAssetHelper.getGenericTabAsset
import org.mozilla.focus.helpers.TestAssetHelper.imageTestAsset
import org.mozilla.focus.helpers.TestHelper
import org.mozilla.focus.helpers.TestHelper.assertNativeAppOpens
import org.mozilla.focus.helpers.TestHelper.getTargetContext
import org.mozilla.focus.helpers.TestHelper.permAllowBtn
import org.mozilla.focus.testAnnotations.SmokeTest

// These tests check the interaction with various context menu options
@RunWith(AndroidJUnit4ClassRunner::class)
class ContextMenusTest {
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val mActivityTestRule = MainActivityIntentsTestRule(showFirstRun = false)

    @get:Rule
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
    fun linkedImageContextMenuItemsTest() {
        val imagesTestPage = webServerRule.server.imageTestAsset
        val imageAssetUrl = webServerRule.server.url("download.jpg").toString()

        searchScreen {
        }.loadPage(imagesTestPage.url) {
            longPressLink("download icon")
            verifyImageContextMenu(true, imageAssetUrl)
        }
    }

    @SmokeTest
    @Test
    fun simpleImageContextMenuItemsTest() {
        val imagesTestPage = webServerRule.server.imageTestAsset
        val imageAssetUrl = webServerRule.server.url("rabbit.jpg").toString()

        searchScreen {
        }.loadPage(imagesTestPage.url) {
            longPressLink("rabbit.jpg")
            verifyImageContextMenu(false, imageAssetUrl)
        }
    }

    @SmokeTest
    @Test
    fun linkContextMenuItemsTest() {
        val tab1Page = webServerRule.server.getGenericTabAsset(1)
        val tab2Page = webServerRule.server.getGenericTabAsset(2)

        searchScreen {
        }.loadPage(tab1Page.url) {
            verifyPageContent("Tab 1")
            longPressLink("Tab 2")
            verifyLinkContextMenu(tab2Page.url)
        }
    }

    @Ignore("Failing, see: https://bugzilla.mozilla.org/show_bug.cgi?id=1819872")
    @SmokeTest
    @Test
    fun copyLinkAddressTest() {
        val tab1Page = webServerRule.server.getGenericTabAsset(1)
        val tab2Page = webServerRule.server.getGenericTabAsset(2)

        searchScreen {
        }.loadPage(tab1Page.url) {
            longPressLink("Tab 2")
            verifyLinkContextMenu(tab2Page.url)
            clickContextMenuCopyLink()
        }.openSearchBar {
            clearSearchBar()
            longPressSearchBar()
        }.pasteAndLoadLink {
            progressBar.waitUntilGone(TestHelper.waitingTime)
            verifyPageURL(tab2Page.url)
        }
    }

    @SmokeTest
    @Test
    fun shareLinkTest() {
        val tab1Page = webServerRule.server.getGenericTabAsset(1)
        val tab2Page = webServerRule.server.getGenericTabAsset(2)

        searchScreen {
        }.loadPage(tab1Page.url) {
            longPressLink("Tab 2")
            verifyLinkContextMenu(tab2Page.url)
            clickShareLink()
            verifyShareAppsListOpened()
        }
    }

    @Test
    fun copyImageLocationTest() {
        val imagesTestPage = webServerRule.server.imageTestAsset
        val imageAssetUrl = webServerRule.server.url("rabbit.jpg").toString()

        searchScreen {
        }.loadPage(imagesTestPage.url) {
            longPressLink("rabbit.jpg")
            verifyImageContextMenu(false, imageAssetUrl)
            clickCopyImageLocation()
        }.openSearchBar {
            clearSearchBar()
            longPressSearchBar()
        }.pasteAndLoadLink {
            progressBar.waitUntilGone(TestHelper.waitingTime)
            verifyPageURL(imageAssetUrl)
        }
    }

    @SmokeTest
    @Test
    fun saveImageTest() {
        val imagesTestPage = webServerRule.server.imageTestAsset
        val fileName = "rabbit.jpg"

        searchScreen {
        }.loadPage(imagesTestPage.url) {
            longPressLink(fileName)
        }.clickSaveImage {
            // If permission dialog appears on devices with API<30, grant it
            if (permAllowBtn.exists()) {
                permAllowBtn.click()
            }
            verifyDownloadConfirmationMessage(fileName)
            openDownloadedFile()
            assertNativeAppOpens(StringsHelper.GOOGLE_PHOTOS)
        }
        deleteFileUsingDisplayName(
            getTargetContext.applicationContext,
            fileName,
        )
    }

    @Test
    fun shareImageTest() {
        val imagesTestPage = webServerRule.server.imageTestAsset

        searchScreen {
        }.loadPage(imagesTestPage.url) {
            longPressLink("rabbit.jpg")
            clickShareImage()
            verifyShareAppsListOpened()
        }
    }
}
