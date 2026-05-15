/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.experiments

import android.os.Build
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.experiments.nimbus.internal.validateEventQueries
import org.mozilla.fenix.GleanMetrics.Pings
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner
import org.mozilla.fenix.GleanMetrics.NimbusSystem as GleanNimbus

@RunWith(RobolectricTestRunner::class)
class RecordedNimbusContextTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    @Test
    fun `GIVEN a nimbusApi object WHEN recorded context with eventQueries is supplied THEN the event queries must be valid`() {
        val context = RecordedNimbusContext.createForTest()
        validateEventQueries(context)
    }

    @Test
    fun `GIVEN an instance of RecordedNimbusContext WHEN serialized to JSON THEN its JSON structure matches the expected value`() {
        val recordedContext = RecordedNimbusContext.createForTest(
            eventQueryValues = mapOf(
                "TEST" to 1.0,
            ),
        )

        // RecordedNimbusContext.toJson() returns
        // org.mozilla.experiments.nimbus.internal.JsonObject, which is a
        // different type.
        val contextAsJson = Json.decodeFromString<JsonObject>(recordedContext.toJson().toString())

        assertEquals(
            buildJsonObject {
                put("is_first_run", false)
                putJsonObject("events") {
                    put("TEST", 1)
                }
                put("install_referrer_response_utm_source", "")
                put("install_referrer_response_utm_medium", "")
                put("install_referrer_response_utm_campaign", "")
                put("install_referrer_response_utm_term", "")
                put("install_referrer_response_utm_content", "")
                put("android_sdk_version", Build.VERSION.SDK_INT.toString())
                put("app_version", "")
                put("locale", "")
                put("days_since_install", 5)
                put("days_since_update", 0)
                put("language", "en")
                put("region", "US")
                put("device_manufacturer", Build.MANUFACTURER)
                put("device_model", Build.MODEL)
                put("user_accepted_tou", true)
                put("no_shortcuts_or_stories_opt_outs", true)
                putJsonArray("addon_ids") {}
                put("tou_points", 3)
            },
            contextAsJson,
        )
    }

    @Test
    fun `GIVEN an instance of RecordedNimbusContext WHEN record called THEN the value recorded to Glean should match the expected value`() {
        var recordedValue: JsonElement? = null
        val job = Pings.nimbus.testBeforeNextSubmit {
            recordedValue = GleanNimbus.recordedNimbusContext.testGetValue()
        }

        val recordedContext = RecordedNimbusContext.createForTest()
        recordedContext.setEventQueryValues(
            mapOf(
                DAYS_OPENED_IN_LAST_28 to 1.5,
            ),
        )
        recordedContext.record()

        job.join()
        assertNotNull(recordedValue)
        assertEquals(
            buildJsonObject {
                put("android_sdk_version", Build.VERSION.SDK_INT.toString())
                put("app_version", "")
                put("days_since_install", 5)
                put("days_since_update", 0)
                put("device_manufacturer", Build.MANUFACTURER)
                put("device_model", Build.MODEL)
                putJsonObject("event_query_values") {
                    put("days_opened_in_last_28", 1)
                }
                put("install_referrer_response_utm_source", "")
                put("install_referrer_response_utm_medium", "")
                put("install_referrer_response_utm_campaign", "")
                put("install_referrer_response_utm_term", "")
                put("install_referrer_response_utm_content", "")
                put("is_first_run", false)
                put("language", "en")
                put("locale", "")
                put("region", "US")
                put("user_accepted_tou", true)
                put("no_shortcuts_or_stories_opt_outs", true)
                put("tou_points", 3)
            },
            recordedValue?.jsonObject,
        )
    }

    @Test
    fun `GIVEN an instance of RecordedNimbusContext WHEN eventQueries have been supplied THEN getEventQueries should return a JSON object with the eventQueries`() {
        val query = "'event'|eventSum('Years', 1, 0)"
        val context = RecordedNimbusContext.createForTest(
            eventQueries = mutableMapOf(
                "TEST" to query,
            ),
        )

        assertEquals(query, context.getEventQueries()["TEST"])
    }

    @Test
    fun `GIVEN an instance of RecordedNimbusContext WHEN eventQueries have been supplied THEN setEventQueryValues should set the values for the eventQueries`() {
        val context = RecordedNimbusContext.createForTest(
            eventQueries = mapOf(
                "TEST" to "'event'|eventSum('Years', 1, 0)",
            ),
        )

        context.setEventQueryValues(mapOf("TEST" to 1.0))

        assertEquals(1.0, context.toJson().getJSONObject("events").get("TEST"))
    }

    @Test
    fun `WHEN addonIds has values THEN the json object should reflect those values`() {
        val context = RecordedNimbusContext.createForTest(
            addonIds = listOf(
                "addon@example.com",
                "d10d0bf8-f5b5-c8b4-a8b2-2b9879e08c5d",
            ),
        )

        assertEquals("addon@example.com", context.toJson().getJSONArray("addon_ids")[0])
        assertEquals("d10d0bf8-f5b5-c8b4-a8b2-2b9879e08c5d", context.toJson().getJSONArray("addon_ids")[1])
    }

    @Test
    fun `WHEN we fetch stored addon IDs THEN a list is returned`() {
        val settings = Settings(testContext)
        settings.installedAddonsList = "addon@example.com,d10d0bf8-f5b5-c8b4-a8b2-2b9879e08c5d"

        val addons = RecordedNimbusContext.getFormattedAddons(settings)

        assertEquals("addon@example.com", addons[0])
        assertEquals("d10d0bf8-f5b5-c8b4-a8b2-2b9879e08c5d", addons[1])
    }
}
