/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.addresses

import android.content.Context
import android.content.Context.MODE_PRIVATE
import android.content.SharedPreferences
import androidx.core.content.edit

private const val SHARED_PREFS_FILENAME = "ADDRESSES_DEBUG_REGION"

/**
 * List of regions that can be enabled for debugging purposes only.
 */
enum class DebugRegion(val country: String) {
    AU("AU"),
}

/**
 * Type declaring methods for interacting with a storage layer relating to debug regions.
 */
interface AddressesDebugRegionRepository {
    /**
     * Get all the enabled debug region.
     */
    fun getAllEnabledRegions(): List<DebugRegion>

    /**
     * Check whether a debug region is enabled.
     */
    fun isRegionEnabled(region: DebugRegion): Boolean

    /**
     * Set whether a debug region is enabled.
     */
    fun setRegionEnabled(region: DebugRegion, enabled: Boolean)
}

/**
 * A [AddressesDebugRegionRepository] that uses shared prefs as its storage mechanism. This was chosen
 * for easy interop with utils/Settings.kt but could be updated to DataStore down the road.
 */
class SharedPrefsAddressesDebugRegionRepository(
    context: Context,
) : AddressesDebugRegionRepository {

    private val prefs: SharedPreferences = context.getSharedPreferences(SHARED_PREFS_FILENAME, MODE_PRIVATE)

    override fun getAllEnabledRegions(): List<DebugRegion> =
        DebugRegion.entries.filter { region ->
            prefs.getBoolean(region.country, false)
        }

    override fun isRegionEnabled(region: DebugRegion): Boolean =
        prefs.getBoolean(region.country, false)

    override fun setRegionEnabled(region: DebugRegion, enabled: Boolean) =
        prefs.edit { putBoolean(region.country, enabled) }
}

/**
 * An empty [AddressesDebugRegionRepository] that is a no-op for release.
 */
class EmptyAddressesDebugRegionRepository : AddressesDebugRegionRepository {
    override fun getAllEnabledRegions() = listOf<DebugRegion>()

    override fun isRegionEnabled(region: DebugRegion) = false

    override fun setRegionEnabled(
        region: DebugRegion,
        enabled: Boolean,
    ) { /* noop */ }
}

/**
 * A fake [AddressesDebugRegionRepository].
 */
class FakeAddressesDebugRegionRepository : AddressesDebugRegionRepository {
    private val debugRegions = DebugRegion.entries.associateWith {
        false
    }.toMutableMap()

    override fun getAllEnabledRegions(): List<DebugRegion> {
        return debugRegions.filter { it.value }.keys.toList()
    }

    override fun isRegionEnabled(region: DebugRegion): Boolean =
        debugRegions[region] ?: false

    override fun setRegionEnabled(region: DebugRegion, enabled: Boolean) {
        debugRegions[region] = enabled
    }
}
