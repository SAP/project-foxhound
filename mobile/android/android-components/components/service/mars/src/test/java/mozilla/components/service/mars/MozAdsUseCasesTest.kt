/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.mars

import kotlinx.coroutines.test.runTest
import mozilla.appservices.adsclient.MozAdsClient
import mozilla.appservices.adsclient.MozAdsClientApiException
import mozilla.components.concept.base.crash.CrashReporting
import mozilla.components.support.test.any
import mozilla.components.support.test.mock
import mozilla.components.support.test.whenever
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.verify

class MozAdsUseCasesTest {

    private lateinit var client: MozAdsClient
    private lateinit var useCases: MozAdsUseCases
    private lateinit var crashReporter: CrashReporting

    @Before
    fun setUp() {
        client = mock()
        crashReporter = mock()

        val clientField = MozAdsClientProvider::class.java.getDeclaredField("client")
        clientField.isAccessible = true
        clientField.set(MozAdsClientProvider, client)

        useCases = MozAdsUseCases(
            adsClientProvider = lazy { MozAdsClientProvider },
            crashReporter = crashReporter,
        )
    }

    @After
    fun tearDown() {
        MozAdsClientProvider.reset()
    }

    @Test
    fun `WHEN recording a click interaction THEN true is returned`() = runTest {
        val clickUrl = "https://firefox.com/click"

        assertTrue(useCases.recordClickInteraction(clickUrl = clickUrl))
        verify(client).recordClick(clickUrl = clickUrl)
    }

    @Test
    fun `GIVEN Ads client API exception WHEN recording a click interaction THEN log error and return false`() = runTest {
        val clickUrl = "https://firefox.com/click"
        val exception = MozAdsClientApiException.Other("test error")

        whenever(client.recordClick(clickUrl = any())).thenThrow(exception)

        assertFalse(useCases.recordClickInteraction(clickUrl = clickUrl))
        verify(client).recordClick(clickUrl = clickUrl)
        verify(crashReporter).recordCrashBreadcrumb(breadcrumb = any())
        verify(crashReporter).submitCaughtException(exception)
    }

    @Test
    fun `WHEN recording an impression interaction THEN true is returned`() = runTest {
        val impressionUrl = "https://firefox.com/impression"

        assertTrue(useCases.recordImpressionInteraction(impressionUrl = impressionUrl))
        verify(client).recordImpression(impressionUrl = impressionUrl)
    }

    @Test
    fun `GIVEN Ads client API exception WHEN recording an impression interaction THEN log error and return false`() = runTest {
        val impressionUrl = "https://firefox.com/click"
        val exception = MozAdsClientApiException.Other("test error")

        whenever(client.recordImpression(impressionUrl = any())).thenThrow(exception)

        assertFalse(useCases.recordImpressionInteraction(impressionUrl = impressionUrl))
        verify(client).recordImpression(impressionUrl = impressionUrl)
        verify(crashReporter).recordCrashBreadcrumb(breadcrumb = any())
        verify(crashReporter).submitCaughtException(exception)
    }
}
