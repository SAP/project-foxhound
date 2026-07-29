/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.focus.activity

import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.mozilla.focus.activity.robots.browserScreen
import org.mozilla.focus.activity.robots.notificationTray
import org.mozilla.focus.activity.robots.searchScreen
import org.mozilla.focus.helpers.FeatureSettingsHelper
import org.mozilla.focus.helpers.FocusTestRule
import org.mozilla.focus.helpers.MainActivityFirstrunTestRule
import org.mozilla.focus.helpers.TestAssetHelper.getMediaTestAsset
import org.mozilla.focus.helpers.TestHelper.mDevice
import org.mozilla.focus.testAnnotations.SmokeTest

class MediaPlaybackTest {
    private val featureSettingsHelper = FeatureSettingsHelper()

    @get:Rule(order = 0)
    val focusTestRule: FocusTestRule = FocusTestRule()

    private val webServerRule get() = focusTestRule.mockWebServerRule

    @get:Rule
    val mActivityTestRule = MainActivityFirstrunTestRule(showFirstRun = false)

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
    fun testVideoPlayback() {
        val videoPageUrl = webServerRule.server.getMediaTestAsset("videoPage").url

        searchScreen {
        }.loadPage(videoPageUrl) {
            clickPlayButton()
            waitForPlaybackToStart()
            // need this alert hack to check the video is playing,
            // currently the test cannot verify the text in the page
            clickPauseButton()
            verifyPlaybackStopped()
        }
    }

    @SmokeTest
    @Test
    fun testAudioPlayback() {
        val audioPageUrl = webServerRule.server.getMediaTestAsset("audioPage").url

        searchScreen {
        }.loadPage(audioPageUrl) {
            clickPlayButton()
            waitForPlaybackToStart()
            // need this alert hack to check the video is playing,
            // currently the test cannot verify the text in the page
            clickPauseButton()
            verifyPlaybackStopped()
        }
    }

    @SmokeTest
    @Test
    fun testMediaContentNotification() {
        val audioPageUrl = webServerRule.server.getMediaTestAsset("audioPage").url
        val notificationMessage = "A site is playing media"

        searchScreen {
        }.loadPage(audioPageUrl) {
            clickPlayButton()
            waitForPlaybackToStart()
        }
        mDevice.openNotification()
        notificationTray {
            verifyMediaNotificationExists("A site is playing media")
            clickMediaNotificationControlButton("Pause")
            verifyMediaNotificationButtonState("Play")
        }
        mDevice.pressBack()
        browserScreen {
            verifyPlaybackStopped()
        }.clearBrowsingData {}
        mDevice.openNotification()
        notificationTray {
            verifyNotificationGone(notificationMessage)
        }
    }
}
