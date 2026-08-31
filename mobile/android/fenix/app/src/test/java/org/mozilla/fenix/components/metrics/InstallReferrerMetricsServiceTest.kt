/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.ext.components
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
internal class InstallReferrerMetricsServiceTest {
    val context: Context = ApplicationProvider.getApplicationContext()

    @Test
    fun `WHEN Install referrer metrics service should track is called THEN it should always return false`() {
        val service = InstallReferrerMetricsService(context, context.components.settings)
        assertFalse(service.shouldTrack(Event.GrowthData.ConversionEvent2))
    }

    @Test
    fun `WHEN Install referrer metrics service starts THEN then the service type should be data`() {
        val service = InstallReferrerMetricsService(context, context.components.settings)
        assertEquals(MetricServiceType.Data, service.type)
    }
}
