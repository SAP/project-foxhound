/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.utils

import io.mockk.mockk
import mozilla.components.concept.engine.EngineSession
import mozilla.components.concept.engine.request.RequestInterceptor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.utils.Stories.markAsOpenedFromHomeScreen
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PersistStoryUTMRequestInterceptorTest {

    private val engineSession: EngineSession = mockk()

    @Test
    fun `WHEN redirecting from an internally opened story THEN the UTM marker is synced to the new URL`() {
        val interceptor = PersistStoryUTMRequestInterceptor()
        val lastUri = "https://story.test".markAsOpenedFromHomeScreen()

        val result = interceptor.onLoadRequest(
            engineSession = engineSession,
            uri = "https://redirect.com",
            lastUri = lastUri,
            hasUserGesture = false,
            isSameDomain = false,
            isRedirect = true,
            isDirectNavigation = false,
            isSubframeRequest = false,
        )

        assertEquals(
            RequestInterceptor.InterceptionResponse.Url("https://redirect.com".markAsOpenedFromHomeScreen()),
            result,
        )
    }

    @Test
    fun `WHEN redirecting not from an internally opened story THEN return a null interception response`() {
        val interceptor = PersistStoryUTMRequestInterceptor()

        val result = interceptor.onLoadRequest(
            engineSession = engineSession,
            uri = "https://redirect.com",
            lastUri = "https://regular.com",
            hasUserGesture = false,
            isSameDomain = false,
            isRedirect = true,
            isDirectNavigation = false,
            isSubframeRequest = false,
        )

        assertNull(result)
    }

    @Test
    fun `WHEN loading an internally opened story THEN return a null interception response`() {
        val interceptor = PersistStoryUTMRequestInterceptor()
        val lastUri = "https://story.test".markAsOpenedFromHomeScreen()

        val result = interceptor.onLoadRequest(
            engineSession = engineSession,
            uri = "https://newpage.com",
            lastUri = lastUri,
            hasUserGesture = false,
            isSameDomain = false,
            isRedirect = false,
            isDirectNavigation = false,
            isSubframeRequest = false,
        )

        assertNull(result)
    }

    @Test
    fun `WHEN a subframe redirect happens in an internally opened story THEN return a null interception response`() {
        val interceptor = PersistStoryUTMRequestInterceptor()
        val lastUri = "https://story.test".markAsOpenedFromHomeScreen()

        val result = interceptor.onLoadRequest(
            engineSession = engineSession,
            uri = "https://redirect.com",
            lastUri = lastUri,
            hasUserGesture = false,
            isSameDomain = false,
            isRedirect = true,
            isDirectNavigation = false,
            isSubframeRequest = true,
        )

        assertNull(result)
    }

    @Test
    fun `GIVEN an unknown previous URI WHEN redirecting to a new URL THEN return a null interception response`() {
        val interceptor = PersistStoryUTMRequestInterceptor()

        val result = interceptor.onLoadRequest(
            engineSession = engineSession,
            uri = "https://redirect.com",
            lastUri = null,
            hasUserGesture = false,
            isSameDomain = false,
            isRedirect = true,
            isDirectNavigation = false,
            isSubframeRequest = false,
        )

        assertNull(result)
    }
}
