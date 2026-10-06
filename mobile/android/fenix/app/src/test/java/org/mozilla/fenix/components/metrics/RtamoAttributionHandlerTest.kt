/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.content.Context
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import mozilla.components.feature.addons.Addon
import mozilla.components.feature.addons.AddonsProvider
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.Addons
import org.mozilla.fenix.helpers.FenixGleanTestRule
import org.mozilla.fenix.utils.Settings
import org.robolectric.RobolectricTestRunner
import java.io.IOException

private const val ADDON_GUID_BASE64 = "ezU4YzMyYWM0LTBkNmMtNGQ2Zi1hZTJjLTk2YWFmOGZmY2I2Nn0"
private const val ADDON_RTA_TOKEN = "rta%3A$ADDON_GUID_BASE64"
private const val ADDON_NAME = "Ublock Origin"
private const val ADDON_ICON_URL = "https://addon-image.url"
private const val ADDON_DOWNLOAD_URL =
    "https://addons.mozilla.org/firefox/downloads/file/4141256/ublock_origin-1.51.0.xpi"

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
class RtamoAttributionHandlerTest {
    @get:Rule
    val gleanTestRule = FenixGleanTestRule(testContext)

    private val settings: Settings = mockk(relaxed = true)
    private val addonsProvider: AddonsProvider = mockk(relaxed = true)

    @Before
    fun setup() {
        every { settings.isTelemetryEnabled } returns true
    }

    @Test
    fun `GIVEN a valid RTAMO referrer WHEN handleReferrer is called THEN the addon details are stored in settings`() = runTest {
        coEvery { addonsProvider.getAddonByID(ADDON_RTA_TOKEN) } returns Addon(
            id = "test",
            downloadUrl = ADDON_DOWNLOAD_URL,
            translatableName = mapOf("en" to ADDON_NAME),
            iconUrl = ADDON_ICON_URL,
        )
        val handler = buildRtamoAttributionHandler(scope = this)

        handler.handleReferrer(rtamoReferrer())
        advanceUntilIdle()

        coVerify { addonsProvider.getAddonByID(ADDON_RTA_TOKEN) }
        verify { settings.rtamoAddonDownloadUrl = ADDON_DOWNLOAD_URL }
        verify { settings.rtamoAddonName = ADDON_NAME }
        verify { settings.rtamoAddonImageUrl = ADDON_ICON_URL }
        assertEquals(
            ADDON_DOWNLOAD_URL,
            Addons.rtamoIdentified.testGetValue()?.last()?.extra?.get("addon_download_url"),
        )
    }

    @Test
    fun `GIVEN a null referrer WHEN handleReferrer is called THEN settings are not modified`() = runTest {
        val handler = buildRtamoAttributionHandler(scope = this)

        handler.handleReferrer(null)
        advanceUntilIdle()

        coVerify(exactly = 0) { addonsProvider.getAddonByID(any()) }
        verify(exactly = 0) { settings.rtamoAddonDownloadUrl = any() }
        verify(exactly = 0) { settings.rtamoAddonName = any() }
        verify(exactly = 0) { settings.rtamoAddonImageUrl = any() }
        assertNull(Addons.rtamoFailed.testGetValue())
        assertNull(Addons.rtamoIdentified.testGetValue())
    }

    @Test
    fun `GIVEN a referrer without AMO source WHEN handleReferrer is called THEN settings are not modified`() = runTest {
        val handler = buildRtamoAttributionHandler(scope = this)

        handler.handleReferrer(rtamoReferrer(amoUTM = ""))
        advanceUntilIdle()

        coVerify(exactly = 0) { addonsProvider.getAddonByID(any()) }
        verify(exactly = 0) { settings.rtamoAddonDownloadUrl = any() }
        assertNull(Addons.rtamoFailed.testGetValue())
        assertNull(Addons.rtamoIdentified.testGetValue())
    }

    @Test
    fun `GIVEN a referrer with AMO source but no rta content WHEN handleReferrer is called THEN settings are not modified`() = runTest {
        val handler = buildRtamoAttributionHandler(scope = this)

        handler.handleReferrer(rtamoReferrer(rtaUTM = ""))
        advanceUntilIdle()

        coVerify(exactly = 0) { addonsProvider.getAddonByID(any()) }
        verify(exactly = 0) { settings.rtamoAddonDownloadUrl = any() }
        verify(exactly = 0) { settings.rtamoAddonName = any() }
        verify(exactly = 0) { settings.rtamoAddonImageUrl = any() }
        assertEquals("invalid_id", Addons.rtamoFailed.testGetValue()?.last()?.extra?.get("reason"))
        assertNull(Addons.rtamoIdentified.testGetValue())
    }

    @Test
    fun `GIVEN AMO returns null WHEN handleReferrer is called THEN settings are not modified`() = runTest {
        coEvery { addonsProvider.getAddonByID(ADDON_RTA_TOKEN) } returns null
        val handler = buildRtamoAttributionHandler(scope = this)

        handler.handleReferrer(rtamoReferrer())
        advanceUntilIdle()

        coVerify { addonsProvider.getAddonByID(ADDON_RTA_TOKEN) }
        verify(exactly = 0) { settings.rtamoAddonDownloadUrl = any() }
        verify(exactly = 0) { settings.rtamoAddonName = any() }
        verify(exactly = 0) { settings.rtamoAddonImageUrl = any() }
        assertEquals("unknown_url", Addons.rtamoFailed.testGetValue()?.last()?.extra?.get("reason"))
        assertNull(Addons.rtamoIdentified.testGetValue())
    }

    @Test
    fun `GIVEN AMO throws an exception WHEN handleReferrer is called THEN settings are not modified`() = runTest {
        coEvery { addonsProvider.getAddonByID(ADDON_RTA_TOKEN) } throws IOException("network error")
        val handler = buildRtamoAttributionHandler(scope = this)

        handler.handleReferrer(rtamoReferrer())
        advanceUntilIdle()

        coVerify { addonsProvider.getAddonByID(ADDON_RTA_TOKEN) }
        verify(exactly = 0) { settings.rtamoAddonDownloadUrl = any() }
        verify(exactly = 0) { settings.rtamoAddonName = any() }
        verify(exactly = 0) { settings.rtamoAddonImageUrl = any() }
        assertEquals("unknown_url", Addons.rtamoFailed.testGetValue()?.last()?.extra?.get("reason"))
        assertNull(Addons.rtamoIdentified.testGetValue())
    }

    private fun buildRtamoAttributionHandler(
        context: Context = testContext,
        settings: Settings = this.settings,
        addonsProvider: AddonsProvider = this.addonsProvider,
        scope: CoroutineScope,
    ) = RtamoAttributionHandler(context, settings, addonsProvider, scope = scope)

    private fun rtamoReferrer(
        base64Guid: String = ADDON_GUID_BASE64,
        amoUTM: String = "utm_source=addons.mozilla.org",
        rtaUTM: String = "&utm_content=rta%3A$base64Guid",
    ) = "$amoUTM&utm_medium=referral&utm_campaign=amo-fx-cta-869140$rtaUTM&utm_term=test"
}
