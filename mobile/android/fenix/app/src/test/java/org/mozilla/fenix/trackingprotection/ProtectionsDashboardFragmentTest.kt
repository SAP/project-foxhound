/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import android.os.Bundle
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.support.test.robolectric.testContext
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.fenix.GleanMetrics.TrackingProtection
import org.mozilla.fenix.helpers.FenixGleanTestRule

@RunWith(AndroidJUnit4::class)
class ProtectionsDashboardFragmentTest {

    @get:Rule
    val gleanRule = FenixGleanTestRule(testContext)

    @Test
    fun `GIVEN no source argument WHEN the privacy report tapped event is recorded THEN source defaults to home`() {
        val fragment = ProtectionsDashboardFragment()

        fragment.recordPrivacyReportTapped()

        val events = TrackingProtection.privacyReportTapped.testGetValue()!!
        assertEquals(1, events.size)
        assertEquals(ProtectionsDashboardFragment.SOURCE_HOME, events.single().extra?.get("source"))
    }

    @Test
    fun `GIVEN a tabs tray source argument WHEN the privacy report tapped event is recorded THEN source is tabs_tray`() {
        val fragment = ProtectionsDashboardFragment().apply {
            arguments = Bundle().apply {
                putString(ProtectionsDashboardFragment.ARG_SOURCE, ProtectionsDashboardFragment.SOURCE_TABS_TRAY)
            }
        }

        fragment.recordPrivacyReportTapped()

        val events = TrackingProtection.privacyReportTapped.testGetValue()!!
        assertEquals(1, events.size)
        assertEquals(ProtectionsDashboardFragment.SOURCE_TABS_TRAY, events.single().extra?.get("source"))
    }
}
