/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.home.logo

import android.content.Context
import mozilla.components.support.test.fakes.android.FakeContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.longfox.LongFoxFeatureApi

class LogoControllerTest {

    class FakeLongFoxFeature : LongFoxFeatureApi {
        var started = false
        var entryPointShownCount = 0
        override fun start(context: Context) {
            started = true
        }
        override fun onEntryPointShown() {
            entryPointShownCount++
        }
    }

    val fakeLongFoxFeature = FakeLongFoxFeature()

    @Test
    fun `if longfox is disabled, do nothing when entry point clicked`() {
        val logoController = LogoController(
            longFoxFeature = fakeLongFoxFeature,
            context = FakeContext(),
            longFoxEnabled = false,
        )
        logoController.handleLongfoxEntryPointClicked()
        assertFalse(fakeLongFoxFeature.started)
    }

    @Test
    fun `if longfox is enabled, launch game when entry point clicked`() {
        val logoController = LogoController(
            longFoxFeature = fakeLongFoxFeature,
            context = FakeContext(),
            longFoxEnabled = true,
        )
        logoController.handleLongfoxEntryPointClicked()
        assertTrue(fakeLongFoxFeature.started)
    }

    @Test
    fun `record telemetry when entry point shown`() {
        val logoController = LogoController(
            longFoxFeature = fakeLongFoxFeature,
            context = FakeContext(),
            longFoxEnabled = true,
        )
        logoController.handleLongfoxEntryPointShown()
        assertEquals(1, fakeLongFoxFeature.entryPointShownCount)
    }
}
