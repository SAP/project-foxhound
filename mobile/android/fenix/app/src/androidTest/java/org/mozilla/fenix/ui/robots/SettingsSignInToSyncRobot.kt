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
import org.mozilla.fenix.R
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
    }
}

private fun goBackButton() =
    onView(CoreMatchers.allOf(ViewMatchers.withContentDescription("Navigate up")))

private fun useEmailButton() = onView(withText("Use email instead"))
