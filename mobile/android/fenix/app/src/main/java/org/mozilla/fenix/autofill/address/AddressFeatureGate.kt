/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.autofill.address

import org.mozilla.fenix.debugsettings.addresses.AddressesDebugRegionRepository
import java.util.Locale

/**
 * An interface to access whether or not the address feature is enabled.
 */
fun interface AddressFeatureGate {
    /**
     * @return a [Boolean] indicating if the address feature is enabled.
     */
    fun isAddressFeatureEnabled(): Boolean
}

/**
 * An implementation of [AddressFeatureGate] that uses the users [Locale] and any enabled regions
 * within a [AddressesDebugRegionRepository].
 *
 * @param locale the [Locale] to check against.
 * @param debugRepository a [AddressesDebugRegionRepository] to query any extra regions to test against.
 */
class RegionAddressFeatureGate(
    private val locale: Locale,
    private val debugRepository: AddressesDebugRegionRepository,
) : AddressFeatureGate {
    override fun isAddressFeatureEnabled(): Boolean {
        val country = locale.country
        return SUPPORTED_REGIONS.contains(country) || debugRepository.isCountryEnabled(country)
    }

    companion object {
        private val SUPPORTED_REGIONS = setOf("US", "CA", "GB", "FR", "DE", "BR", "ES", "JP")
    }
}

private fun AddressesDebugRegionRepository.isCountryEnabled(country: String): Boolean = getAllEnabledRegions()
    .map { it.country }
    .contains(country)
