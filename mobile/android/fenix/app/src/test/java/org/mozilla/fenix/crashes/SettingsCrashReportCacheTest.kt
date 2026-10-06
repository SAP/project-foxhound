/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.crashes

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import mozilla.components.lib.crash.store.TimeInMillis
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.utils.Settings

class SettingsCrashReportCacheTest {
    private lateinit var settings: Settings

    @Before
    fun setup() {
        settings = mockk(relaxed = true)
    }

    @Test
    fun `GIVEN cache has 0 stored for crashReportCutoffDate WHEN accessed THEN returns null`() = runTest {
        every { settings.crashReportCutoffDate } returns 0

        val cache = SettingsCrashReportCache(settings)
        val result: TimeInMillis? = cache.getCutoffDate()

        assertEquals(null, result)
    }

    @Test
    fun `WHEN setting CutoffDate with null value THEN 0 is stored`() = runTest {
        val cache = SettingsCrashReportCache(settings)
        cache.setCutoffDate(null)

        verify { settings.crashReportCutoffDate = 0 }
    }

    @Test
    fun `GIVEN cache has 0 stored for DeferredUntil WHEN accessed THEN returns null`() = runTest {
        every { settings.crashReportDeferredUntil } returns 0

        val cache = SettingsCrashReportCache(settings)
        val result: TimeInMillis? = cache.getDeferredUntil()

        assertEquals(null, result)
    }

    @Test
    fun `WHEN setting DeferredUntil with null value THEN 0 is stored`() = runTest {
        val cache = SettingsCrashReportCache(settings)
        cache.setDeferredUntil(null)

        verify { settings.crashReportDeferredUntil = 0 }
    }

    @Test
    fun `WHEN retrieving CrashPullDeferUntil with never show again set THEN returns a future timestamp`() = runTest {
        every { settings.crashPullNeverShowAgain } returns true
        every { settings.crashPullDontShowBefore } returns 0

        val cache = SettingsCrashReportCache(settings)
        val result: TimeInMillis? = cache.getCrashPullDeferUntil()

        assertEquals(Long.MAX_VALUE, result)
    }
}
