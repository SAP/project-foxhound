/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.components

import mozilla.components.browser.engine.gecko.fetch.GeckoViewFetchClient
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.EngineSession.TrackingProtectionPolicy.CookiePolicy
import mozilla.components.support.test.robolectric.testContext
import mozilla.components.support.test.whenever
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mozilla.focus.utils.Settings
import org.mozilla.geckoview.GeckoRuntime
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class EngineProviderTest {
    private var settings: Settings = mock()

    @Test
    fun `getOrCreateRuntime should return the same instance`() {
        val runTimeMock = mock<GeckoRuntime>()

        val runtime1 = EngineProvider.getOrCreateRuntime(testContext, { runTimeMock })
        val runtime2 = EngineProvider.getOrCreateRuntime(testContext) { mock() }

        // getOrCreateRuntime should return the existing instance for the same context, not a new one
        assertEquals(runtime1, runtime2)
        assertEquals(runTimeMock, runtime1)
    }

    @Test
    fun `createClient should return a GeckoViewFetchClient`() {
        val client = EngineProvider.createClient(testContext, mock())
        assertNotNull(client)
        assertTrue(client is GeckoViewFetchClient)
    }

    @Test
    fun `createTrackingProtectionPolicy should block social trackers when setting is true`() {
        whenever(settings.shouldBlockSocialTrackers()).thenReturn(true)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.SOCIAL))
    }

    @Test
    fun `createTrackingProtectionPolicy should not block social trackers when setting is false`() {
        whenever(settings.shouldBlockSocialTrackers()).thenReturn(false)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(!policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.SOCIAL))
    }

    @Test
    fun `createTrackingProtectionPolicy should block ad trackers when setting is true`() {
        whenever(settings.shouldBlockAdTrackers()).thenReturn(true)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.AD))
    }

    @Test
    fun `createTrackingProtectionPolicy should not block ad trackers when setting is false`() {
        whenever(settings.shouldBlockAdTrackers()).thenReturn(false)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(!policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.AD))
    }

    @Test
    fun `createTrackingProtectionPolicy should block analytics trackers when setting is true`() {
        whenever(settings.shouldBlockAnalyticTrackers()).thenReturn(true)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.ANALYTICS))
    }

    @Test
    fun `createTrackingProtectionPolicy should not block analytics trackers when setting is false`() {
        whenever(settings.shouldBlockAnalyticTrackers()).thenReturn(false)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(!policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.ANALYTICS))
    }

    @Test
    fun `createTrackingProtectionPolicy should block other trackers when setting is true`() {
        whenever(settings.shouldBlockOtherTrackers()).thenReturn(true)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.CONTENT))
    }

    @Test
    fun `createTrackingProtectionPolicy should not block other trackers when setting is false`() {
        whenever(settings.shouldBlockOtherTrackers()).thenReturn(false)
        val policy = EngineProvider.createTrackingProtectionPolicy(testContext, settings)
        assertTrue(!policy.trackingCategories.contains(EngineSession.TrackingProtectionPolicy.TrackingCategory.CONTENT))
    }

    @Test
    fun `getCookiePolicy should return ACCEPT_NONE when setting is yes`() {
        whenever(settings.shouldBlockCookiesValue).thenReturn("yes")
        val cookiePolicy = EngineProvider.getCookiePolicy(testContext, settings)
        assertEquals(CookiePolicy.ACCEPT_NONE, cookiePolicy)
    }

    @Test
    fun `getCookiePolicy should return ACCEPT_ALL when setting is no`() {
        whenever(settings.shouldBlockCookiesValue).thenReturn("no")
        val cookiePolicy = EngineProvider.getCookiePolicy(testContext, settings)
        assertEquals(CookiePolicy.ACCEPT_ALL, cookiePolicy)
    }
}
