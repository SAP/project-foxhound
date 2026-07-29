/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.robots

import android.util.Log
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withParent
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.uiautomator.UiSelector
import org.hamcrest.CoreMatchers
import org.hamcrest.Matchers.allOf
import org.junit.Assert.assertTrue
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.Constants.RETRY_COUNT
import org.mozilla.fenix.helpers.Constants.TAG
import org.mozilla.fenix.helpers.MatcherHelper.assertUIObjectExists
import org.mozilla.fenix.helpers.MatcherHelper.itemWithResId
import org.mozilla.fenix.helpers.TestAssetHelper.waitingTime
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.helpers.TestHelper.packageName
import org.mozilla.fenix.helpers.click

/**
 * Implementation of Robot Pattern for the settings turn on sync option.
 */
class SettingsSignInToSyncRobot {

    fun verifyTurnOnSyncMenu() {
        Log.i(TAG, "verifyTurnOnSyncMenu: Waiting for $waitingTime ms for sign in to sync menu to exist")
        mDevice.findObject(UiSelector().resourceId("$packageName:id/container")).waitForExists(waitingTime)
        Log.i(TAG, "verifyTurnOnSyncMenu: Waited for $waitingTime ms for sign in to sync menu to exist")
        assertUIObjectExists(
            itemWithResId("$packageName:id/signInScanButton"),
            itemWithResId("$packageName:id/signInEmailButton"),
        )
    }

    fun verifyUseEmailOption() {
        Log.i(TAG, "verifyUseEmailOption: Trying to verify that the \"Use email instead\" button is visible")
        onView(withText("Use email instead"))
            .check(matches(ViewMatchers.withEffectiveVisibility(ViewMatchers.Visibility.VISIBLE)))
        Log.i(TAG, "verifyUseEmailOption: Verified that the \"Use email instead\" button is visible")
    }

    fun verifyReadyToScanOption() {
        Log.i(TAG, "verifyReadyToScanOption: Trying to verify that the \"Ready to scan\" button is visible")
        onView(withText("Ready to scan"))
            .check(matches(ViewMatchers.withEffectiveVisibility(ViewMatchers.Visibility.VISIBLE)))
        Log.i(TAG, "verifyReadyToScanOption: Verified that the \"Ready to scan\" button is visible")
    }

    fun tapOnUseEmailToSignIn() {
        Log.i(TAG, "tapOnUseEmailToSignIn: Trying to click the \"Use email instead\" button")
        useEmailButton().click()
        Log.i(TAG, "tapOnUseEmailToSignIn: Clicked the \"Use email instead\" button")
    }

    fun verifyTurnOnSyncToolbarTitle() {
        Log.i(TAG, "verifyTurnOnSyncToolbarTitle: Trying to verify that the \"Sync and save your data\" toolbar title is displayed")
        onView(
            allOf(
                withParent(withId(R.id.navigationToolbar)),
                withText(R.string.preferences_sign_in),
            ),
        ).check(matches(isDisplayed()))
        Log.i(TAG, "verifyTurnOnSyncToolbarTitle: Verified that the \"Sync and save your data\" toolbar title is displayed")
    }

    fun clickReadyToScanButton() {
        for (i in 1..RETRY_COUNT) {
            try {
                assertUIObjectExists(itemWithResId("$packageName:id/signInScanButton"))
                Log.i(TAG, "clickReadyToScanButton: Trying to click the \"Ready to scan\" button")
                itemWithResId("$packageName:id/signInScanButton").click()
                Log.i(TAG, "clickReadyToScanButton: Clicked the \"Ready to scan\" button")
                assertUIObjectExists(itemWithResId("$packageName:id/signInScanButton"), exists = false)

                break
            } catch (e: AssertionError) {
                Log.i(TAG, "clickReadyToScanButton: AssertionError caught, executing fallback methods")
                if (i == RETRY_COUNT) {
                    throw e
                }
            }
        }
    }

    fun clickDismissPermissionRequiredDialog() {
        Log.i(TAG, "clickDismissPermissionRequiredDialog: Waiting for $waitingTime ms for the \"Dismiss\" permission button to exist")
        dismissPermissionButton().waitForExists(waitingTime)
        Log.i(TAG, "clickDismissPermissionRequiredDialog: Waited for $waitingTime ms for the \"Dismiss\" permission button to exist")
        Log.i(TAG, "clickDismissPermissionRequiredDialog: Trying to click the \"Dismiss\" permission button")
        dismissPermissionButton().click()
        Log.i(TAG, "clickDismissPermissionRequiredDialog: Clicked the \"Dismiss\" permission button")
    }

    fun verifyQRScannerIsOpen() {
        Log.i(TAG, "verifyScannerOpen: Trying to verify that the device camera is opened or that the camera app error message exist")
        assertTrue(
            "$TAG: Neither the device camera was opened nor the camera app error message was displayed",
            mDevice.findObject(UiSelector().resourceId("$packageName:id/view_finder"))
                .waitForExists(waitingTime) ||
                // In case there is no camera available, an error will be shown.
                mDevice.findObject(UiSelector().resourceId("$packageName:id/camera_error"))
                    .exists(),
        )
        Log.i(TAG, "verifyScannerOpen: Verified that the device camera is opened or that the camera app error message exist")
    }

    class Transition(private val composeTestRule: ComposeTestRule) {
        fun goBack(interact: BrowserRobot.() -> Unit): BrowserRobot.Transition {
            Log.i(TAG, "goBack: Trying to click the navigate up button")
            goBackButton().click()
            Log.i(TAG, "goBack: Clicked the navigate up button")

            BrowserRobot(composeTestRule).interact()
            return BrowserRobot.Transition(composeTestRule)
        }

        fun goBackToHomeScreen(interact: HomeScreenRobot.() -> Unit): HomeScreenRobot.Transition {
            Log.i(TAG, "goBackToHomeScreen: Trying to click the navigate up button")
            goBackButton().click()
            Log.i(TAG, "goBackToHomeScreen: Clicked the navigate up button")

            HomeScreenRobot(composeTestRule).interact()
            return HomeScreenRobot.Transition(composeTestRule)
        }

        fun clickGoToPermissionsSettings(interact: SettingsSubMenuSitePermissionsCommonRobot.() -> Unit): SettingsSubMenuSitePermissionsCommonRobot.Transition {
            Log.i(TAG, "clickGoToPermissionsSettings: Waiting for $waitingTime ms for the Go To \"Settings\" permission button to exist")
            goToPermissionsSettingsButton().waitForExists(waitingTime)
            Log.i(TAG, "clickGoToPermissionsSettings: Waited for $waitingTime ms for the Go To \"Settings\" permission button to exist")
            Log.i(TAG, "clickGoToPermissionsSettings: Trying to click the \"Go To Settings\" permission button")
            goToPermissionsSettingsButton().click()
            Log.i(TAG, "clickGoToPermissionsSettings: Clicked the \"Go To Settings\" permission button")

            SettingsSubMenuSitePermissionsCommonRobot().interact()
            return SettingsSubMenuSitePermissionsCommonRobot.Transition()
        }
    }
}

private fun goBackButton() =
    onView(CoreMatchers.allOf(ViewMatchers.withContentDescription("Navigate up")))

private fun useEmailButton() = onView(withText("Use email instead"))

fun settingsTurnOnSyncScreen(composeTestRule: ComposeTestRule, interact: SettingsSignInToSyncRobot.() -> Unit): SettingsSignInToSyncRobot.Transition {
    SettingsSignInToSyncRobot().interact()
    return SettingsSignInToSyncRobot.Transition(composeTestRule)
}

private fun dismissPermissionButton() =
    mDevice.findObject(UiSelector().text("Dismiss"))

private fun goToPermissionsSettingsButton() =
    mDevice.findObject(UiSelector().text("Go to settings"))
