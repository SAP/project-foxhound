/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.termsofuse.store

import io.mockk.mockk
import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertNull
import mozilla.components.lib.state.Store
import mozilla.components.support.test.robolectric.testContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.PrivacyNoticeBanner
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PrivacyNoticeBannerTelemetryMiddlewareTest {

    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val store =
        mockk<Store<PrivacyNoticeBannerState, PrivacyNoticeBannerAction>>(
            relaxed = true,
        )

    @Test
    fun `WHEN the OnBannerDisplayed action is received THEN telemetry is recorded`() {
        assertNull(PrivacyNoticeBanner.displayed.testGetValue())
        assertNull(PrivacyNoticeBanner.displayedDate.testGetValue())

        invokeMiddlewareWith(PrivacyNoticeBannerAction.OnBannerDisplayed)

        assertNotNull(PrivacyNoticeBanner.displayed.testGetValue())
        assertNotNull(PrivacyNoticeBanner.displayedDate.testGetValue())
    }

    @Test
    fun `WHEN the OnPrivacyNoticeClicked action is received THEN telemetry is recorded`() {
        assertNull(PrivacyNoticeBanner.privacyNoticeLinkClicked.testGetValue())

        invokeMiddlewareWith(PrivacyNoticeBannerAction.OnPrivacyNoticeClicked)

        assertNotNull(PrivacyNoticeBanner.privacyNoticeLinkClicked.testGetValue())
    }

    @Test
    fun `WHEN the OnLearnMoreClicked action is received THEN telemetry is recorded`() {
        assertNull(PrivacyNoticeBanner.learnMoreLinkClicked.testGetValue())

        invokeMiddlewareWith(PrivacyNoticeBannerAction.OnLearnMoreClicked)

        assertNotNull(PrivacyNoticeBanner.learnMoreLinkClicked.testGetValue())
    }

    @Test
    fun `WHEN the OnCloseClicked action is received THEN telemetry is recorded`() {
        assertNull(PrivacyNoticeBanner.closeClicked.testGetValue())

        invokeMiddlewareWith(PrivacyNoticeBannerAction.OnCloseClicked)

        assertNotNull(PrivacyNoticeBanner.closeClicked.testGetValue())
    }

    private fun invokeMiddlewareWith(action: PrivacyNoticeBannerAction) {
        PrivacyNoticeBannerTelemetryMiddleware()(
            store = store,
            next = {},
            action = action,
        )
    }
}
