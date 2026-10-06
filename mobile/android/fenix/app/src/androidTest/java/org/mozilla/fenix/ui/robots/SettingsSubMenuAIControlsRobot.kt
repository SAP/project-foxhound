/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui.robots

import android.util.Log
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText
import org.mozilla.fenix.R
import org.mozilla.fenix.helpers.Constants.TAG

/**
 * Implementation of Robot Pattern for the settings AI Controls sub menu.
 */
class SettingsSubMenuAIControlsRobot {

    fun verifyAIControlsToolbarTitle() {
        Log.i(TAG, "verifyAIControlsToolbarTitle: Trying to verify the \"AI controls\" toolbar title is displayed")
        onView(withText(R.string.preferences_ai_controls)).check(matches(isDisplayed()))
        Log.i(TAG, "verifyAIControlsToolbarTitle: Verified the \"AI controls\" toolbar title is displayed")
    }

    class Transition
}

fun settingsSubMenuAIControls(
    interact: SettingsSubMenuAIControlsRobot.() -> Unit,
): SettingsSubMenuAIControlsRobot.Transition {
    SettingsSubMenuAIControlsRobot().interact()
    return SettingsSubMenuAIControlsRobot.Transition()
}
