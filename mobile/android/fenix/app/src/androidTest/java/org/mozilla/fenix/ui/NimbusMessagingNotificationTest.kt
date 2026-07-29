/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.ui

import android.content.Context
import mozilla.components.service.nimbus.messaging.FxNimbusMessaging
import org.json.JSONObject
import org.junit.Before
import org.junit.Ignore
import org.junit.Rule
import org.junit.Test
import org.mozilla.experiments.nimbus.HardcodedNimbusFeatures
import org.mozilla.fenix.helpers.FenixTestRule
import org.mozilla.fenix.helpers.HomeActivityIntentTestRule
import org.mozilla.fenix.helpers.TestHelper
import org.mozilla.fenix.helpers.TestHelper.mDevice
import org.mozilla.fenix.nimbus.FxNimbus
import org.mozilla.fenix.ui.robots.notificationShade
import androidx.compose.ui.test.junit4.v2.AndroidComposeTestRule as AndroidComposeTestRuleV2

/**
 * A UI test for testing the notification surface for Nimbus Messaging.
 */
class NimbusMessagingNotificationTest {
    private lateinit var context: Context
    private lateinit var hardcodedNimbus: HardcodedNimbusFeatures

    @get:Rule(order = 0)
    val fenixTestRule: FenixTestRule = FenixTestRule()

    @get:Rule(order = 1)
    val composeTestRule =
        AndroidComposeTestRuleV2(
            HomeActivityIntentTestRule.withDefaultSettingsOverrides(),
        ) { it.activity }

    @Before
    fun setUp() {
        context = TestHelper.appContext
    }

    @Test
    fun testShowingNotificationMessage() {
        hardcodedNimbus = HardcodedNimbusFeatures(
            context,
            "messaging" to JSONObject(
                """
                {
                  "message-under-experiment": "test-default-browser-notification",
                  "messages": {
                    "test-default-browser-notification": {
                      "title": "preferences_set_as_default_browser",
                      "text": "default_browser_experiment_card_text",
                      "surface": "notification",
                      "style": "NOTIFICATION",
                      "action": "MAKE_DEFAULT_BROWSER",
                      "trigger": [
                        "ALWAYS"
                      ]
                    }
                  }
                }
                """.trimIndent(),
            ),
        )
        // The scheduling of the Messaging Notification Worker happens in the HomeActivity
        // onResume().
        // We need to have connected FxNimbus to hardcodedNimbus by the time it is scheduled, so
        // we finishActivity, connect, _then_ re-launch the activity so that the worker has
        // hardcodedNimbus by the time its re-scheduled.
        // Because the scheduling happens for a second time, the work request needs to replace the
        // existing one.
        composeTestRule.activityRule.finishActivity()
        hardcodedNimbus.connectWith(FxNimbus)
        composeTestRule.activityRule.launchActivity(null)

        mDevice.openNotification()
        notificationShade {
            val data =
                FxNimbusMessaging.features.messaging.value().messages["test-default-browser-notification"]
            verifySystemNotificationExists(data!!.title!!)
            verifySystemNotificationExists(data.text)
        }
    }
}
