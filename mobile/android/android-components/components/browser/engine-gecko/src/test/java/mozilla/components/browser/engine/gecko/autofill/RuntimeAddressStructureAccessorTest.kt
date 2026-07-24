/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package mozilla.components.browser.engine.gecko.autofill

import mozilla.components.concept.engine.autofill.AddressStructure
import mozilla.components.concept.engine.autofill.UnexpectedNullError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.Autocomplete
import org.mozilla.geckoview.GeckoResult
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
class RuntimeAddressStructureAccessorTest {
    @Test
    fun `GIVEN a RuntimeAddressStructureAccessor WHEN we get a valid GeckoResult THEN map the values to concept-engine fields `() {
        val addressStructureAccessor = DefaultRuntimeAddressStructureAccessor {
            GeckoResult.fromValue(
                listOf(
                    Autocomplete.AddressStructure.Field.TextField("name", "autofill-address-name"),
                    Autocomplete.AddressStructure.Field.TextField("organization", "autofill-address-organization"),
                    Autocomplete.AddressStructure.Field.TextField("street-address", "autofill-address-street-address"),
                    Autocomplete.AddressStructure.Field.TextField("address-level1", "autofill-address-state"),
                    Autocomplete.AddressStructure.Field.TextField("address-level2", "autofill-address-city"),
                    Autocomplete.AddressStructure.Field.TextField("address-level3", "autofill-address-prefecture"),
                    Autocomplete.AddressStructure.Field.TextField("postal-code", "autofill-address-postal-code"),
                    Autocomplete.AddressStructure.Field.TextField("tel", "autofill-address-tel"),
                    Autocomplete.AddressStructure.Field.TextField("email", "autofill-address-email"),
                    Autocomplete.AddressStructure.Field.TextField("unknown", "unknown-localization"),
                    Autocomplete.AddressStructure.Field.SelectField(
                        "country",
                        "autofill-address-country",
                        "key-1",
                        listOf(Autocomplete.AddressStructure.Field.SelectField.Option("key-1", "value-1")),
                    ),
                ),
            )
        }

        var structure: AddressStructure? = null
        addressStructureAccessor.getAddressStructure(
            "US",
            { structure = it },
            { throwable -> },
        )

        val expectedStructure = AddressStructure(
            listOf(
                AddressStructure.Field.TextField(AddressStructure.Field.ID.Name, AddressStructure.Field.LocalizationKey.Name),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.Organization, AddressStructure.Field.LocalizationKey.Organization),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.StreetAddress, AddressStructure.Field.LocalizationKey.StreetAddress),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.AddressLevel1, AddressStructure.Field.LocalizationKey.State),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.AddressLevel2, AddressStructure.Field.LocalizationKey.City),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.AddressLevel3, AddressStructure.Field.LocalizationKey.Prefecture),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.PostalCode, AddressStructure.Field.LocalizationKey.PostalCode),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.Tel, AddressStructure.Field.LocalizationKey.Tel),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.Email, AddressStructure.Field.LocalizationKey.Email),
                AddressStructure.Field.TextField(AddressStructure.Field.ID.Unknown("unknown"), AddressStructure.Field.LocalizationKey.Unknown("unknown-localization")),
                AddressStructure.Field.SelectField(
                    AddressStructure.Field.ID.Country,
                    AddressStructure.Field.LocalizationKey.Country,
                    "key-1",
                    listOf(AddressStructure.Field.SelectField.Option("key-1", "value-1")),
                ),
            ),
        )

        ShadowLooper.idleMainLooper()
        assertEquals(expectedStructure, structure)
    }

    @Test
    fun `GIVEN a RuntimeAddressStructureAccessor WHEN we get a valid GeckoResult containing null THEN call onError`() {
        val addressStructureAccessor = DefaultRuntimeAddressStructureAccessor {
            GeckoResult.fromValue(null)
        }

        var throwable: Throwable? = null
        addressStructureAccessor.getAddressStructure(
            "US",
            { _ -> },
            { throwable = it },
        )

        ShadowLooper.idleMainLooper()
        assertTrue("Throwable should be UnexpectedNullError", throwable is UnexpectedNullError)
    }

    @Test
    fun `GIVEN a RuntimeAddressStructureAccessor WHEN we get a valid GeckoResult containing a throwable THEN call onError`() {
        val addressStructureAccessor = DefaultRuntimeAddressStructureAccessor {
            GeckoResult.fromException(IllegalStateException())
        }

        var throwable: Throwable? = null
        addressStructureAccessor.getAddressStructure(
            "US",
            { _ -> },
            { throwable = it },
        )

        ShadowLooper.idleMainLooper()
        assertTrue("Throwable should be IllegalStateException", throwable is IllegalStateException)
    }
}
