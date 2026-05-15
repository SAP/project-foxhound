/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:Suppress("TooManyFunctions")

package org.mozilla.fenix.ui.robots

import android.util.Log
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.RootMatchers
import androidx.test.espresso.matcher.ViewMatchers
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiSelector
import androidx.test.uiautomator.Until
import mozilla.components.support.ktx.kotlin.tryGetHostFromUrl
import org.hamcrest.Matchers.not
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.DataGenerationHelper.getStringResource
import org.mozilla.fenix.helpers.MatcherHelper.assertUIObjectExists
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTimeShort
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.TestHelper.waitForAppWindowToBeUpdated
import org.mozilla.fenix.helpers.click
import org.mozilla.fenix.helpers.ext.waitNotNull
import org.mozilla.fenix.helpers.isChecked
import org.mozilla.fenix.ui.robots.EnhancedTrackingProtectionRobot.Transition

/**
 * Implementation of Robot Pattern for Site Security UI.
 */
class SiteSecurityRobot {

    fun verifyQuickActionSheet(url: String = "", isConnectionSecure: Boolean) {
        Log.i(TAG, "verifyQuickActionSheet: Waiting for $waitingTime ms for quick action sheet to exist")
        quickActionSheet().waitForExists(waitingTime)
        Log.i(TAG, "verifyQuickActionSheet: Waited for $waitingTime ms for quick action sheet to exist")
        assertUIObjectExists(
            quickActionSheetUrl(url.tryGetHostFromUrl()),
            quickActionSheetSecurityInfo(isConnectionSecure),
            quickActionSheetTrackingProtectionSwitch(),
            quickActionSheetClearSiteData(),
        )
    }
    fun openSecureConnectionSubMenu(isConnectionSecure: Boolean) {
        Log.i(TAG, "openSecureConnectionSubMenu: Trying to click the security info button while connection is secure: $isConnectionSecure")
        quickActionSheetSecurityInfo(isConnectionSecure).click()
        Log.i(TAG, "openSecureConnectionSubMenu: Clicked the security info button while connection is secure: $isConnectionSecure")
        Log.i(TAG, "openSecureConnectionSubMenu: Trying to click the security info button and wait for $waitingTimeShort ms for a new window")
        mDevice.waitForWindowUpdate(packageName, waitingTimeShort)
        Log.i(TAG, "openSecureConnectionSubMenu: Clicked the security info button and waited for $waitingTimeShort ms for a new window")
    }
    fun verifySecureConnectionSubMenu(pageTitle: String = "", url: String = "", isConnectionSecure: Boolean) {
        Log.i(TAG, "verifySecureConnectionSubMenu: Waiting for $waitingTime ms for secure connection submenu to exist")
        secureConnectionSubMenu().waitForExists(waitingTime)
        Log.i(TAG, "verifySecureConnectionSubMenu: Waited for $waitingTime ms for secure connection submenu to exist")
        assertUIObjectExists(
            secureConnectionSubMenuPageTitle(pageTitle),
            secureConnectionSubMenuPageUrl(url),
            secureConnectionSubMenuSecurityInfo(isConnectionSecure),
            secureConnectionSubMenuLockIcon(),
            secureConnectionSubMenuCertificateInfo(),
        )
    }
    fun clickQuickActionSheetClearSiteData() {
        Log.i(TAG, "clickQuickActionSheetClearSiteData: Trying to click the \"Clear cookies and site data\" button")
        quickActionSheetClearSiteData().click()
        Log.i(TAG, "clickQuickActionSheetClearSiteData: Clicked the \"Clear cookies and site data\" button")
    }
    fun verifyClearSiteDataPrompt(url: String) {
        assertUIObjectExists(clearSiteDataPrompt(url))
        Log.i(TAG, "verifyClearSiteDataPrompt: Trying to verify that the \"Cancel\" dialog button is displayed")
        cancelClearSiteDataButton().check(matches(isDisplayed()))
        Log.i(TAG, "verifyClearSiteDataPrompt: Verified that the \"Cancel\" dialog button is displayed")
        Log.i(TAG, "verifyClearSiteDataPrompt: Trying to verify that the \"Delete\" dialog button is displayed")
        deleteSiteDataButton().check(matches(isDisplayed()))
        Log.i(TAG, "verifyClearSiteDataPrompt: Verified that the \"Delete\" dialog button is displayed")
    }

    fun verifyETPSwitchVisibility(visible: Boolean) {
        waitForAppWindowToBeUpdated()
        if (visible) {
            Log.i(TAG, "verifyETPSwitchVisibility: Trying to verify ETP toggle is displayed")
            enhancedTrackingProtectionSwitch()
                .check(matches(isDisplayed()))
            Log.i(TAG, "verifyETPSwitchVisibility: Verified ETP toggle is displayed")
        } else {
            Log.i(TAG, "verifyETPSwitchVisibility: Trying to verify ETP toggle is not displayed")
            enhancedTrackingProtectionSwitch()
                .check(matches(not(isDisplayed())))
            Log.i(TAG, "verifyETPSwitchVisibility: Verified ETP toggle is not displayed")
        }
    }

    fun verifyEnhancedTrackingProtectionSheetStatus(status: String, state: Boolean) {
        mDevice.waitNotNull(Until.findObjects(By.text("Protections are $status for this site")))
        Log.i(TAG, "verifyEnhancedTrackingProtectionSheetStatus: Trying to check ETP toggle is checked: $state")
        onView(ViewMatchers.withResourceName("switch_widget")).check(
            matches(
                isChecked(
                    state,
                ),
            ),
        )
        Log.i(TAG, "verifyEnhancedTrackingProtectionSheetStatus: Verified ETP toggle is checked: $state")
    }

    class Transition {
        fun closeSiteSecuritySheet(composeTestRule: ComposeTestRule, interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            // Back out of the Enhanced Tracking Protection sheet
            Log.i(TAG, "closeSiteSecuritySheet: Trying to click device back button")
            mDevice.pressBack()
            Log.i(TAG, "closeSiteSecuritySheet: Clicked device back button")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun toggleEnhancedTrackingProtectionFromSheet(interact: SiteSecurityRobot.() -> Unit): SiteSecurityRobot.Transition {
            itemWithResId("$packageName:id/trackingProtectionLayout").waitForExists(waitingTime)
            Log.i(TAG, "toggleEnhancedTrackingProtectionFromSheet: Trying to click ETP switch")
            itemWithResId("$packageName:id/trackingProtectionSwitch").click()
            Log.i(TAG, "toggleEnhancedTrackingProtectionFromSheet: Clicked ETP switch")

            SiteSecurityRobot().interact()
            return Transition()
        }

        fun openDetails(interact: EnhancedTrackingProtectionRobot.() -> Unit): EnhancedTrackingProtectionRobot.Transition {
            Log.i(TAG, "openDetails: Waiting for $waitingTime ms for ETP sheet \"Details\" button to exist")
            openEnhancedTrackingProtectionDetails().waitForExists(waitingTime)
            Log.i(TAG, "openDetails: Waited for $waitingTime ms for ETP sheet \"Details\" button to exist")
            Log.i(TAG, "openDetails: Trying to click ETP sheet \"Details\" button")
            openEnhancedTrackingProtectionDetails().click()
            Log.i(TAG, "openDetails: Clicked ETP sheet \"Details\" button")

            EnhancedTrackingProtectionRobot().interact()
            return EnhancedTrackingProtectionRobot.Transition()
        }
    }
}

private fun quickActionSheet() =
    mDevice.findObject(UiSelector().resourceId("$packageName:id/quick_action_sheet"))

private fun quickActionSheetUrl(url: String) =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/url")
            .textContains(url),
    )

private fun quickActionSheetSecurityInfo(isConnectionSecure: Boolean) =
    if (isConnectionSecure) {
        mDevice.findObject(
            UiSelector()
                .resourceId("$packageName:id/securityInfo")
                .textContains(getStringResource(R.string.quick_settings_sheet_secure_connection_2)),
        )
    } else {
        mDevice.findObject(
            UiSelector()
                .resourceId("$packageName:id/securityInfo")
                .textContains(getStringResource(R.string.quick_settings_sheet_insecure_connection_2)),
        )
    }

private fun quickActionSheetTrackingProtectionSwitch() =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/trackingProtectionSwitch"),
    )

private fun quickActionSheetClearSiteData() =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/clearSiteData"),
    )

private fun secureConnectionSubMenu() =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/design_bottom_sheet"),
    )

private fun secureConnectionSubMenuPageTitle(pageTitle: String) =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/title")
            .textContains(pageTitle),
    )

private fun secureConnectionSubMenuPageUrl(url: String) =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/url")
            .textContains(url),
    )

private fun secureConnectionSubMenuLockIcon() =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/securityInfoIcon"),
    )

private fun secureConnectionSubMenuSecurityInfo(isConnectionSecure: Boolean) =
    if (isConnectionSecure) {
        mDevice.findObject(
            UiSelector()
                .resourceId("$packageName:id/securityInfo")
                .textContains(getStringResource(R.string.quick_settings_sheet_secure_connection_2)),
        )
    } else {
        mDevice.findObject(
            UiSelector()
                .resourceId("$packageName:id/securityInfo")
                .textContains(getStringResource(R.string.quick_settings_sheet_insecure_connection_2)),
        )
    }

private fun secureConnectionSubMenuCertificateInfo() =
    mDevice.findObject(
        UiSelector()
            .resourceId("$packageName:id/securityInfo"),
    )

private fun clearSiteDataPrompt(url: String) =
    mDevice.findObject(
        UiSelector()
            .resourceId("android:id/message")
            .textContains(url),
    )

private fun cancelClearSiteDataButton() = onView(withId(android.R.id.button2)).inRoot(RootMatchers.isDialog())
private fun deleteSiteDataButton() = onView(withId(android.R.id.button1)).inRoot(RootMatchers.isDialog())

private fun enhancedTrackingProtectionSwitch() =
    onView(withId(R.id.trackingProtectionSwitch))

private fun openEnhancedTrackingProtectionDetails() =
    mDevice.findObject(UiSelector().resourceId("$packageName:id/trackingProtectionDetails"))
