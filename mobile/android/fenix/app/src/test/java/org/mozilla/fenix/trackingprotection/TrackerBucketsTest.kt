/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.TrackingCategory.CRYPTOMINING
import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.TrackingCategory.EMAIL
import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.TrackingCategory.FINGERPRINTING
import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.TrackingCategory.MOZILLA_SOCIAL
import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.TrackingCategory.SCRIPTS_AND_SUB_RESOURCES
import mozilla.components.concept.engine.content.blocking.TrackerLog
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.CROSS_SITE_TRACKING_COOKIES
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.CRYPTOMINERS
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.FINGERPRINTERS
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.SOCIAL_MEDIA_TRACKERS
import org.mozilla.fenix.trackingprotection.TrackingProtectionCategory.TRACKING_CONTENT

class TrackerBucketsTest {

    @Test
    fun `initializes with empty map`() {
        assertTrue(TrackerBuckets().buckets.blockedBucketMap.isEmpty())
        assertTrue(TrackerBuckets().buckets.loadedBucketMap.isEmpty())
    }

    @Test
    fun `getter accesses corresponding bucket`() {
        val buckets = TrackerBuckets()
        val google = TrackerLog("https://google.com", listOf(), listOf(FINGERPRINTING))
        val facebook = TrackerLog("http://facebook.com", listOf(MOZILLA_SOCIAL))

        buckets.updateIfNeeded(
            listOf(
                google,
                facebook,
                TrackerLog("https://mozilla.com"),
            ),
        )

        assertEquals(google, buckets.buckets.blockedBucketMap[FINGERPRINTERS]!!.first())
        assertEquals(
            facebook,
            buckets.buckets.loadedBucketMap[SOCIAL_MEDIA_TRACKERS]!!.first(),
        )
        assertTrue(buckets.buckets.blockedBucketMap[CRYPTOMINERS].isNullOrEmpty())
        assertTrue(buckets.buckets.loadedBucketMap[CRYPTOMINERS].isNullOrEmpty())
    }

    @Test
    fun `sorts trackers into bucket`() {
        val buckets = TrackerBuckets()
        val google = TrackerLog("https://google.com", listOf(), listOf(FINGERPRINTING))
        val facebook = TrackerLog("http://facebook.com", listOf(MOZILLA_SOCIAL))
        val mozilla = TrackerLog("https://mozilla.com")
        buckets.updateIfNeeded(
            listOf(
                facebook,
                google,
                mozilla,
            ),
        )

        assertEquals(
            mapOf(
                SOCIAL_MEDIA_TRACKERS to listOf(facebook),
            ),
            buckets.buckets.loadedBucketMap,
        )

        assertEquals(
            mapOf(
                FINGERPRINTERS to listOf(google),
            ),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker matches multiple blocked categories WHEN sorted into buckets THEN only the highest priority blocked bucket gets it`() {
        val buckets = TrackerBuckets()
        val acCategories = listOf(
            CRYPTOMINING,
            MOZILLA_SOCIAL,
            FINGERPRINTING,
            SCRIPTS_AND_SUB_RESOURCES,
        )

        val trackerLog = TrackerLog(
            url = "http://facebook.com",
            cookiesHasBeenBlocked = true,
            blockedCategories = acCategories,
            loadedCategories = acCategories,
        )
        buckets.updateIfNeeded(listOf(trackerLog))

        // Even though several blocked categories match, only the highest-priority
        // blocked bucket receives the tracker so per-category counts don't double up.
        assertEquals(
            mapOf(FINGERPRINTERS to listOf(trackerLog)),
            buckets.buckets.blockedBucketMap,
        )

        // The priority routing is blocked-only; the loaded map keeps the
        // per-category indexing so each loaded category retains its members.
        assertEquals(
            mapOf(
                SOCIAL_MEDIA_TRACKERS to listOf(trackerLog),
                TRACKING_CONTENT to listOf(trackerLog),
                FINGERPRINTERS to listOf(trackerLog),
                CRYPTOMINERS to listOf(trackerLog),
            ),
            buckets.buckets.loadedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker with no blocked categories and no blocked cookies WHEN sorted into buckets THEN it is not added to any blocked bucket`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://mozilla.org",
            loadedCategories = listOf(SCRIPTS_AND_SUB_RESOURCES),
            cookiesHasBeenBlocked = false,
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertTrue(buckets.buckets.blockedBucketMap.isEmpty())
        assertEquals(
            mapOf(TRACKING_CONTENT to listOf(tracker)),
            buckets.buckets.loadedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker only has blocked cookies WHEN sorted into buckets THEN it is added to cross-site tracking cookies`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://cookie-only.example",
            cookiesHasBeenBlocked = true,
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(CROSS_SITE_TRACKING_COOKIES to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker only has email blocked WHEN sorted into buckets THEN it is added to tracking content`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://email-tracker.example",
            blockedCategories = listOf(EMAIL),
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(TRACKING_CONTENT to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker has fingerprinting alongside other blocked categories WHEN sorted into buckets THEN it is added to fingerprinters`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://fp.example",
            cookiesHasBeenBlocked = true,
            blockedCategories = listOf(
                SCRIPTS_AND_SUB_RESOURCES,
                EMAIL,
                FINGERPRINTING,
                CRYPTOMINING,
                MOZILLA_SOCIAL,
            ),
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(FINGERPRINTERS to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker has cryptomining but no fingerprinting WHEN sorted into buckets THEN it is added to cryptominers`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://cm.example",
            cookiesHasBeenBlocked = true,
            blockedCategories = listOf(
                SCRIPTS_AND_SUB_RESOURCES,
                EMAIL,
                CRYPTOMINING,
                MOZILLA_SOCIAL,
            ),
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(CRYPTOMINERS to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker has social but no fingerprinting or cryptomining WHEN sorted into buckets THEN it is added to social media trackers`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://social.example",
            cookiesHasBeenBlocked = true,
            blockedCategories = listOf(
                SCRIPTS_AND_SUB_RESOURCES,
                EMAIL,
                MOZILLA_SOCIAL,
            ),
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(SOCIAL_MEDIA_TRACKERS to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker has scripts and email and cookies but no higher priority WHEN sorted into buckets THEN it is added to tracking content`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://content.example",
            cookiesHasBeenBlocked = true,
            blockedCategories = listOf(
                SCRIPTS_AND_SUB_RESOURCES,
                EMAIL,
            ),
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(TRACKING_CONTENT to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN a tracker has email and cookies but no other blocked categories WHEN sorted into buckets THEN it is added to tracking content`() {
        val buckets = TrackerBuckets()
        val tracker = TrackerLog(
            url = "https://email-cookies.example",
            cookiesHasBeenBlocked = true,
            blockedCategories = listOf(EMAIL),
        )
        buckets.updateIfNeeded(listOf(tracker))

        assertEquals(
            mapOf(TRACKING_CONTENT to listOf(tracker)),
            buckets.buckets.blockedBucketMap,
        )
    }

    @Test
    fun `GIVEN multiple trackers each matching a different priority level WHEN sorted into buckets THEN per-category sum equals total distinctly blocked trackers`() {
        val buckets = TrackerBuckets()
        val fp = TrackerLog(
            url = "https://fp.example",
            blockedCategories = listOf(FINGERPRINTING, SCRIPTS_AND_SUB_RESOURCES),
            cookiesHasBeenBlocked = true,
        )
        val cm = TrackerLog(
            url = "https://cm.example",
            blockedCategories = listOf(CRYPTOMINING, SCRIPTS_AND_SUB_RESOURCES),
            cookiesHasBeenBlocked = true,
        )
        val social = TrackerLog(
            url = "https://social.example",
            blockedCategories = listOf(MOZILLA_SOCIAL),
            cookiesHasBeenBlocked = true,
        )
        val content = TrackerLog(
            url = "https://content.example",
            blockedCategories = listOf(SCRIPTS_AND_SUB_RESOURCES),
            cookiesHasBeenBlocked = true,
        )
        val email = TrackerLog(
            url = "https://email.example",
            blockedCategories = listOf(EMAIL),
        )
        val cookiesOnly = TrackerLog(
            url = "https://cookies.example",
            cookiesHasBeenBlocked = true,
        )
        val onlyLoaded = TrackerLog(
            url = "https://allowed.example",
            loadedCategories = listOf(SCRIPTS_AND_SUB_RESOURCES),
        )

        buckets.updateIfNeeded(
            listOf(fp, cm, social, content, email, cookiesOnly, onlyLoaded),
        )

        // Each blocked tracker lands in exactly one bucket — onlyLoaded does not add to the blocked map.
        assertEquals(listOf(fp), buckets.get(FINGERPRINTERS, blocked = true))
        assertEquals(listOf(cm), buckets.get(CRYPTOMINERS, blocked = true))
        assertEquals(listOf(social), buckets.get(SOCIAL_MEDIA_TRACKERS, blocked = true))
        assertEquals(listOf(content, email), buckets.get(TRACKING_CONTENT, blocked = true))
        assertEquals(listOf(cookiesOnly), buckets.get(CROSS_SITE_TRACKING_COOKIES, blocked = true))

        // Summing per-category ensures no double counting across buckets.
        val perCategorySum = TrackingProtectionCategory.entries
            .sumOf { buckets.get(it, blocked = true).size }
        assertEquals(6, perCategorySum)
    }
}
