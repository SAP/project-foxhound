/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.ext

import mozilla.components.concept.engine.content.blocking.TrackingProtectionEvent
import mozilla.components.test.ReflectionUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.mozilla.geckoview.ContentBlockingController
import kotlin.random.Random
import kotlin.random.nextInt

class ToTrackingProtectionEventTest {
    @Test
    fun `GIVEN a gecko tracker WHEN mapping it to a tracker blocked event THEN all properties are correctly mapped`() {
        val mapping = mapOf(
            ContentBlockingController.TrackingDbEvent.OTHER_COOKIES_BLOCKED_ID to TrackingProtectionEvent.OTHER_COOKIES_BLOCKED,
            ContentBlockingController.TrackingDbEvent.TRACKERS_ID to TrackingProtectionEvent.TRACKERS,
            ContentBlockingController.TrackingDbEvent.TRACKING_COOKIES_ID to TrackingProtectionEvent.TRACKING_COOKIES,
            ContentBlockingController.TrackingDbEvent.CRYPTOMINERS_ID to TrackingProtectionEvent.CRYPTOMINERS,
            ContentBlockingController.TrackingDbEvent.FINGERPRINTERS_ID to TrackingProtectionEvent.FINGERPRINTERS,
            ContentBlockingController.TrackingDbEvent.SOCIAL_ID to TrackingProtectionEvent.SOCIAL,
            ContentBlockingController.TrackingDbEvent.SUSPICIOUS_FINGERPRINTERS_ID to TrackingProtectionEvent.SUSPICIOUS_FINGERPRINTERS,
            ContentBlockingController.TrackingDbEvent.BOUNCETRACKERS_ID to TrackingProtectionEvent.BOUNCETRACKERS,
        )

        mapping.forEach { (geckoId, expectedType) ->
            val count = Random.nextInt(IntRange(1, 10))
            val date = "2024-05-${geckoId + 10}"
            val geckoEvent = createTrackingDbEvent(geckoId, count, date)

            val mappedEvent = geckoEvent.toTrackingProtectionEvent()

            assertEquals(expectedType, mappedEvent!!.type)
            assertEquals(count, mappedEvent.count)
            assertEquals(date, mappedEvent.date)
        }
    }

    @Test
    fun `GIVEN a gecko tracker with an unknown type WHEN mapping it to a tracker blocked event THEN return null`() {
        val geckoEvent = createTrackingDbEvent(999, 1, "2024-05-20")

        assertNull(geckoEvent.toTrackingProtectionEvent())
    }

    private fun createTrackingDbEvent(type: Int, count: Int, date: String): ContentBlockingController.TrackingDbEvent {
        val event = object : ContentBlockingController.TrackingDbEvent() {}
        // Need to set the values through reflection as the TrackingDbEvent constructor is protected.
        ReflectionUtils.setField(event, "type", type)
        ReflectionUtils.setField(event, "count", count)
        ReflectionUtils.setField(event, "date", date)
        return event
    }
}
