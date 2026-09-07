/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.autofill.address

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.mozilla.fenix.debugsettings.addresses.DebugRegion
import org.mozilla.fenix.debugsettings.addresses.EmptyAddressesDebugRegionRepository
import org.mozilla.fenix.debugsettings.addresses.FakeAddressesDebugRegionRepository
import java.util.Locale

class RegionAddressFeatureGateTest {
    @Test
    fun `GIVEN an enabled region WHEN calling isAddressFeatureEnabled THEN return true`() {
        listOf(
            Locale.US,
            Locale.CANADA,
            Locale.GERMANY,
            Locale.JAPAN,
            Locale.UK,
            Locale.FRANCE,
            Locale.forLanguageTag("pt-BR"),
            Locale.forLanguageTag("es-ES"),
        ).forEach {
            val featureGate = RegionAddressFeatureGate(it, EmptyAddressesDebugRegionRepository())
            assertTrue(featureGate.isAddressFeatureEnabled())
        }
    }

    @Test
    fun `GIVEN an unavailable region WHEN calling isAddressFeatureEnabled THEN return false`() {
        listOf(
            Locale.forLanguageTag("en-AU"),
        ).forEach {
            val featureGate = RegionAddressFeatureGate(it, EmptyAddressesDebugRegionRepository())
            assertFalse(featureGate.isAddressFeatureEnabled())
        }
    }

    @Test
    fun `GIVEN a region enabled in the AddressDebugRegionRepository WHEN calling isAddressFeatureEnabled THEN return true`() {
        val repository = FakeAddressesDebugRegionRepository().also {
            it.setRegionEnabled(DebugRegion.AU, true)
        }

        val featureGate = RegionAddressFeatureGate(Locale.forLanguageTag("en-AU"), repository)
        assertTrue(featureGate.isAddressFeatureEnabled())
    }
}
