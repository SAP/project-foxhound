/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import android.app.Instrumentation
import android.content.Intent
import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import androidx.test.espresso.intent.Intents.intended
import androidx.test.espresso.intent.Intents.intending
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.espresso.intent.matcher.IntentMatchers.hasDataString
import org.hamcrest.Matchers.equalTo
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.AppAndSystemHelper.assertNativeAppOpens
import org.mozilla.fenix.helpers.Constants
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdAndText
import org.mozilla.fenix.helpers.OpenLinksInApp
import org.mozilla.fenix.helpers.TestAssetHelper
import org.mozilla.fenix.helpers.TestAssetHelper.appLinksRedirectAsset
import org.mozilla.fenix.helpers.TestAssetHelper.getGenericAsset
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.navigationToolbar

class AppLinksTest : TestSetup() {
    private val youtubeSchemaUrlLink = itemContainingText("Youtube schema link")
    private val youtubeUrlLink = itemContainingText("Youtube link")
    private val intentSchemaUrlLink = itemContainingText("Intent schema link")
    private val phoneUrlLink = itemContainingText("Telephone link")
    private val formRedirectLink = itemContainingText("Telephone post navigation link")
    private val intentSchemeWithExampleAppLink = itemContainingText("Example app link")
    private val phoneWithFallbackLink = itemContainingText("Telephone with fallback URL")
    private val linkWithAndroidFallbackLink = itemContainingText("Link with android fallback link")
    private val linkWithFallbackLink = itemContainingText("Link with fallback link")
    private val linkWithBrowserFallbackLink = itemContainingText("Link with browser fallback link")
    private val phoneSchemaLink = "tel://1234567890"

    @get:Rule
    val composeTestRule =
        AndroidComposeTestRule(
            HomeActivityIntentTestRule(openLinksInExternalApp = OpenLinksInApp.ASK),
        ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    /**
     * User setting: Ask
     * Tests that when opening a youtube:// scheme link under “Ask”, the app prompt appears.
     * After tapping “Cancel”, the browser stays on the same page (no external app opened).
     * vnd.youtube://@Mozilla
     */
    @Test
    fun askBeforeOpeningLinkInAppYoutubeSchemeCancelTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, youtubeSchemaUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "YouTube")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
        }
    }

    /**
     * User setting: Ask
     * Clicking an intent:// link without corresponding app should not trigger the
     * external-app prompt. The user stays on the same page.
     * intent://com.example.app
     */
    @Test
    fun askBeforeOpeningLinkWithIntentSchemeTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, intentSchemaUrlLink)
            mDevice.waitForIdle()
            verifyOpenLinkInAnotherAppPromptIsNotShown()
            verifyUrl(externalLinksPage.url.toString())
        }
    }

    /**
     * User setting: Ask
     * After canceling once for youtube://, tapping the same link again in the same tab
     * should not show the prompt again. The browser remains on the test page.
     * vnd.youtube://@Mozilla
     */
    @Test
    fun askBeforeOpeningLinkInAppYoutubeSchemeCancelMultiTapTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, youtubeSchemaUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "YouTube")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
            clickPageObject(composeTestRule, youtubeSchemaUrlLink)
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
            verifyOpenLinkInAnotherAppPromptIsNotShown()
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
            verifyOpenLinkInAnotherAppPromptIsNotShown()
        }
    }

    /**
     * User setting: Ask
     * Canceling a youtube:// link prompt affects only the current tab.
     * In a new tab, the same link still shows the prompt.
     * vnd.youtube://@Mozilla
     */
    @Test
    fun askBeforeOpeningLinkInAppYoutubeSchemeCancelOnlyAffectCurrentTabTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, youtubeSchemaUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "YouTube")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
        }.openTabDrawer(composeTestRule) {
        }.openNewTab {
        }.submitQuery(externalLinksPage.url.toString()) {
            clickPageObject(composeTestRule, youtubeSchemaUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "YouTube")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
        }
    }

    /**
     * User setting: Never
     * For an https YouTube link, no external-app prompt is shown.
     * The page loads directly in-browser (verify “youtube.com”).
     * https://m.youtube.com/user/mozilla
     */
    @Test
    fun neverOpeningLinkInAppYoutubeTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        composeTestRule.activityRule.applySettingsExceptions {
            it.openLinksInExternalApp = OpenLinksInApp.NEVER
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, youtubeUrlLink)
            mDevice.waitForIdle()
            verifyOpenLinkInAnotherAppPromptIsNotShown()
            verifyUrl("youtube.com")
        }
    }

    /**
     * User setting: Never
     * For a youtube:// scheme link, the app prompt still appears.
     * After “Cancel”, the browser stays on the same page.
     * vnd.youtube://@Mozilla
     */
    @Test
    fun neverOpeningLinkInAppYoutubeSchemeCancelTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        composeTestRule.activityRule.applySettingsExceptions {
            it.openLinksInExternalApp = OpenLinksInApp.NEVER
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, youtubeSchemaUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "YouTube")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
        }
    }

    /**
     * User setting: Ask
     * When opening a normal YouTube link, the app prompt appears.
     * Tapping “Cancel” opens the YouTube website in-browser.
     * https://m.youtube.com/user/mozilla
     */
    @Test
    fun askBeforeOpeningLinkInAppYoutubeCancelTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, youtubeUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "YouTube")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl("youtube.com")
        }
    }

    /**
     * User setting: Ask
     * Verifies that the “Open in Phone” prompt appears when tapping a tel: link.
     * tel://1234567890
     */
    @Test
    fun appLinksRedirectPhoneLinkPromptTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, phoneUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "Phone")
        }
    }

    /**
     * User setting: Ask
     * Clicking a tel: link triggers the Phone prompt.
     * Tapping “Cancel” keeps the user on the same page.
     * tel://1234567890
     */
    @Test
    fun askBeforeOpeningLinkInAppPhoneCancelTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, phoneUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "Phone")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
        }
    }

    /**
     * User setting: Always
     * For tel: links, no prompt is shown.
     * The native Phone app opens automatically with the correct URI.
     * tel://1234567890
     */
    @Test
    fun alwaysOpenPhoneLinkInAppTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        composeTestRule.activityRule.applySettingsExceptions {
            it.openLinksInExternalApp = OpenLinksInApp.ALWAYS
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, phoneUrlLink)
            mDevice.waitForIdle()
            assertNativeAppOpens(composeTestRule, Constants.PackageName.PHONE_APP, phoneSchemaLink)
        }
    }

    /**
     * User setting: Ask
     * When prompted for a tel: link and user taps “Open”,
     * the Phone app launches, then control returns to the same browser page.
     * tel://1234567890
     */
    @Test
    fun askBeforeOpeningPhoneLinkInAcceptTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, phoneUrlLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "Phone")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button1", "Open"))
            mDevice.waitForIdle()
            assertNativeAppOpens(composeTestRule, Constants.PackageName.PHONE_APP, phoneSchemaLink)
            mDevice.waitForIdle()
            verifyUrl(externalLinksPage.url.toString())
        }
    }

    /**
     * User setting: Ask
     * Form redirect leading to a tel: link should trigger the Phone app prompt.
     * <form action="tel://1234567890" method="POST"></form>
     */
    @Test
    fun appLinksNewTabRedirectAskTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, formRedirectLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "Phone")
        }
    }

    /**
     * User setting: Always
     * Form redirect leading to a tel: Phone app launches directly with no prompt.
     * <form action="tel://1234567890" method="POST"></form>
     */
    @Test
    fun appLinksNewTabRedirectAlwaysTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        composeTestRule.activityRule.applySettingsExceptions {
            it.openLinksInExternalApp = OpenLinksInApp.ALWAYS
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, formRedirectLink)
            mDevice.waitForIdle()
            assertNativeAppOpens(composeTestRule, Constants.PackageName.PHONE_APP, phoneSchemaLink)
        }
    }

    /**
     * User setting: Never
     * Form redirect leading to a tel: prompt is still shown for the tel: link.
     * <form action="tel://1234567890" method="POST"></form>
     */
    @Test
    fun appLinksNewTabRedirectNeverTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        composeTestRule.activityRule.applySettingsExceptions {
            it.openLinksInExternalApp = OpenLinksInApp.NEVER
        }

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, formRedirectLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "Phone")
        }
    }

    /**
     * User setting: Ask
     * When prompted for a external application not installed: user taps “Open”,
     * a marketing intent should be used.
     * intent://com.example.app#Intent;package=com.example.app;end
     */
    @Test
    fun marketingIntentWhenOpeningLinkWithoutApp() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        // Use ACTION_DIAL as a non-ACTION_VIEW intent to verify that the marketing flow always
        // launches with ACTION_VIEW instead of reusing the original intent action.
        intending(hasAction(Intent.ACTION_DIAL)).respondWith(
            Instrumentation.ActivityResult(
                0,
                null,
            ),
        )

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, intentSchemeWithExampleAppLink)
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button1", "Open"))
            mDevice.waitForIdle()
            intended(hasAction(Intent.ACTION_VIEW))
            intended(hasDataString(equalTo("market://details?id=com.example.app")))
        }
    }

    /**
     * User setting: Ask
     * For a tel: link with a browser fallback, tapping “Cancel” navigates
     * to the fallback URL (mozilla.org).
     * intent://1234567890#Intent;scheme=tel;S.browser_fallback_url=https://www.mozilla.org;end;
     */
    @Test
    fun appLinksBrowserFallbackURLTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, phoneWithFallbackLink)
            verifyOpenLinkInAnotherAppPrompt(appName = "Phone")
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button2", "Cancel"))
            mDevice.waitForIdle()
            verifyUrl("mozilla.org")
        }
    }

    /**
     * User setting: Ask
     * Link with supported scheme will never load the "afl" fallback URL
     * https://mozilla.org/?afl=https://youtube.com
     */
    @Test
    fun linkWithAndroidFallbackLinkTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            verifyUrl(externalLinksPage.url.toString())
            clickPageObject(composeTestRule, linkWithAndroidFallbackLink)
            waitForPageToLoad()
            verifyUrl("mozilla.org")
        }
    }

    /**
     * User setting: Ask
     * Link with supported scheme will never load the "link" fallback URL
     * https://mozilla.org/?link=https://youtube.com
     */
    @Test
    fun linkWithFallbackLinkTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, linkWithFallbackLink)
            mDevice.waitForIdle()
            verifyUrl("mozilla.org")
        }
    }

    /**
     * User setting: Ask
     * Link with supported scheme will never load the "S.browser_fallback_url" fallback URL
     * https://mozilla.org/?S.browser_fallback_url=https://youtube.com
     */
    @Test
    fun linkWithBrowserFallbackLinkTest() {
        val externalLinksPage = mockWebServer.appLinksRedirectAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, linkWithBrowserFallbackLink)
            mDevice.waitForIdle()
            verifyUrl("mozilla.org")
        }
    }
}
