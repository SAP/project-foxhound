/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import androidx.compose.ui.test.junit4.AndroidComposeTestRule
import org.junit.Rule
import org.junit.Test
import org.mozilla.fenix.helpers.AppAndSystemHelper.assertNativeAppOpens
import org.mozilla.fenix.helpers.Constants
import org.mozilla.fenix.helpers.HomeActivityTestRule
import org.mozilla.fenix.helpers.MatcherHelper.itemContainingText
import org.mozilla.fenix.helpers.MatcherHelper.itemWithDescription
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResIdAndText
import org.mozilla.fenix.helpers.TestAssetHelper.externalLinksAsset
import org.mozilla.fenix.helpers.TestAssetHelper.htmlControlsFormAsset
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.TestSetup
import org.mozilla.fenix.helpers.perf.DetectMemoryLeaksRule
import org.mozilla.fenix.ui.robots.clickPageObject
import org.mozilla.fenix.ui.robots.navigationToolbar
import java.time.LocalDate

/**
 *  Tests for verifying basic interactions with web control elements
 *
 */

class WebControlsTest : TestSetup() {
    private val hour = 10
    private val minute = 10
    private val colorHexValue = "#5b2067"
    private val emailLink = "mailto://example@example.com"
    private val phoneLink = "tel://1234567890"

    @get:Rule
    val composeTestRule = AndroidComposeTestRule(
        HomeActivityTestRule(
        shouldUseBottomToolbar = true,
        isOpenInAppBannerEnabled = false,
        ),
    ) { it.activity }

    @get:Rule
    val memoryLeaksRule = DetectMemoryLeaksRule()

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2316067
    @Test
    fun verifyCalendarFormInteractionsTest() {
        val currentDate = LocalDate.now()
        val currentDay = currentDate.dayOfMonth
        val currentMonth = currentDate.month
        val currentYear = currentDate.year
        val htmlControlsPage = mockWebServer.htmlControlsFormAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(htmlControlsPage.url) {
            clickPageObject(composeTestRule, itemWithResId("calendar"))
            clickPageObject(composeTestRule, itemContainingText("CANCEL"))
            clickPageObject(composeTestRule, itemWithResId("submitDate"))
            verifyNoDateIsSelected()
            clickPageObject(composeTestRule, itemWithResId("calendar"))
            clickPageObject(composeTestRule, itemWithDescription("$currentMonth $currentDay"))
            clickPageObject(composeTestRule, itemContainingText("Set"))
            clickPageObject(composeTestRule, itemWithResId("submitDate"))
            verifySelectedDate()
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2316069
    @Test
    fun verifyClockFormInteractionsTest() {
        val htmlControlsPage = mockWebServer.htmlControlsFormAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(htmlControlsPage.url) {
            clickPageObject(composeTestRule, itemWithResId("clock"))
            clickPageObject(composeTestRule, itemContainingText("Cancel"))
            clickPageObject(composeTestRule, itemWithResId("submitTime"))
            verifyNoTimeIsSelected(hour, minute)
            clickPageObject(composeTestRule, itemWithResId("clock"))
            selectTime(hour, minute)
            clickPageObject(composeTestRule, itemContainingText("OK"))
            clickPageObject(composeTestRule, itemWithResId("submitTime"))
            verifySelectedTime(hour, minute)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2316068
    @Test
    fun verifyColorPickerInteractionsTest() {
        val htmlControlsPage = mockWebServer.htmlControlsFormAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(htmlControlsPage.url) {
            clickPageObject(composeTestRule, itemWithResId("colorPicker"))
            clickPageObject(composeTestRule, itemWithDescription(colorHexValue))
            clickPageObject(composeTestRule, itemContainingText("CANCEL"))
            clickPageObject(composeTestRule, itemWithResId("submitColor"))
            verifyColorIsNotSelected(colorHexValue)
            clickPageObject(composeTestRule, itemWithResId("colorPicker"))
            clickPageObject(composeTestRule, itemWithDescription(colorHexValue))
            clickPageObject(composeTestRule, itemContainingText("SET"))
            clickPageObject(composeTestRule, itemWithResId("submitColor"))
            verifySelectedColor(colorHexValue)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2316070
    @Test
    fun verifyDropdownMenuInteractionsTest() {
        val htmlControlsPage = mockWebServer.htmlControlsFormAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(htmlControlsPage.url) {
            clickPageObject(composeTestRule, itemWithResId("dropDown"))
            clickPageObject(composeTestRule, itemContainingText("The National"))
            clickPageObject(composeTestRule, itemWithResId("submitOption"))
            verifySelectedDropDownOption("The National")
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/2316071
    @Test
    fun verifyEmailLinkTest() {
        val externalLinksPage = mockWebServer.externalLinksAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, itemContainingText("Email link"))
            waitForAppWindowToBeUpdated()
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button1", "Open"))
            assertNativeAppOpens(composeTestRule, Constants.PackageName.GMAIL_APP, emailLink)
        }
    }

    // TestRail link: https://mozilla.testrail.io/index.php?/cases/view/834205
    @Test
    fun verifyTelephoneLinkTest() {
        val externalLinksPage = mockWebServer.externalLinksAsset

        navigationToolbar(composeTestRule) {
        }.enterURLAndEnterToBrowser(externalLinksPage.url) {
            clickPageObject(composeTestRule, itemContainingText("Telephone link"))
            waitForAppWindowToBeUpdated()
            clickPageObject(composeTestRule, itemWithResIdAndText("android:id/button1", "Open"))
            assertNativeAppOpens(composeTestRule, Constants.PackageName.PHONE_APP, phoneLink)
        }
    }
}
