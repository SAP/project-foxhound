/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.store

import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.browser.state.search.RegionState
import mozilla.components.concept.storage.Address
import mozilla.components.concept.storage.UpdatableAddressFields
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AddressStateTest {
    @Test
    fun `GIVEN a null Address and null RegionState WHEN an AddressState is constructed THEN the country should be US`() {
        val actual = AddressState.initial()
        val expected = AddressState(
            guidToUpdate = null,
            address = emptyUpdatableAddress.copy(country = "US"),
        )

        assertEquals(expected, actual)
    }

    @Test
    fun `GIVEN a null Address and RegionState WHEN an AddressState is constructed THEN the country should be the RegionState home value`() {
        val actual = AddressState.initial(
            region = RegionState("CA", "CA"),
        )
        val expected = AddressState(
            guidToUpdate = null,
            address = emptyUpdatableAddress.copy(country = "CA"),
        )

        assertEquals(expected, actual)
    }

    @Test
    fun `GIVEN an Address WHEN an AddressState is constructed THEN the address should match`() {
        val actualAddress = emptyAddress.copy(
            guid = "BEEF",
            name = "Mozilla",
            country = "CA",
        )
        val actual = AddressState.initial(address = actualAddress)

        val expected = AddressState(
            guidToUpdate = "BEEF",
            address = emptyUpdatableAddress.copy(name = "Mozilla", country = "CA"),
        )

        assertEquals(expected, actual)
    }
}
private val emptyAddress = Address("", "", "", "", "", "", "", "", "", "", "")
private val emptyUpdatableAddress = UpdatableAddressFields("", "", "", "", "", "", "", "US", "", "")
