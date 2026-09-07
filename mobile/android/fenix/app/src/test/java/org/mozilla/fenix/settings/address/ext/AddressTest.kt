/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.address.ext

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mozilla.fenix.settings.address.utils.generateAddress

class AddressTest {

    @Test
    fun `WHEN all properties are present THEN all properties present in description`() {
        val addr = generateAddress()

        val description = addr.getAddressLabel()

        val expected = "${addr.streetAddress}, ${addr.addressLevel3}, ${addr.addressLevel2}, " +
            "${addr.organization}, ${addr.addressLevel1}, ${addr.country}, " +
            "${addr.postalCode}, ${addr.tel}, ${addr.email}"

        assertEquals(expected, description)
    }

    @Test
    fun `WHEN any properties are missing THEN description includes only present`() {
        val addr = generateAddress(
            addressLevel3 = "",
            organization = "",
            email = "",
        )

        val description = addr.getAddressLabel()

        val expected = "${addr.streetAddress}, ${addr.addressLevel2}, ${addr.addressLevel1}, " +
            "${addr.country}, ${addr.postalCode}, ${addr.tel}"
        assertEquals(expected, description)
    }

    @Test
    fun `WHEN everything is missing THEN description is empty`() {
        val addr = generateAddress(
            name = "",
            organization = "",
            streetAddress = "",
            addressLevel3 = "",
            addressLevel2 = "",
            addressLevel1 = "",
            postalCode = "",
            country = "",
            tel = "",
            email = "",
        )

        val description = addr.getAddressLabel()

        assertEquals("", description)
    }

    @Test
    fun `GIVEN multiline street address THEN joined as single line`() {
        val streetAddress = """
            line1
            line2
            line3
        """.trimIndent()

        val result = streetAddress.toOneLineAddress()

        assertEquals("line1 line2 line3", result)
    }
}
