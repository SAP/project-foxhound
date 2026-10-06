/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.autofill

/**
 * Error that is returned if we got a success value out of a [GeckoResult] that is null.
 */
class UnexpectedNullError : IllegalStateException("Expected address structure, got null")

/**
 * Runtime interface for address metadata
 */
interface AddressStructureRuntime {

    /**
     * Gets the supported address fields for a country. This is useful when constructing the
     * address input or edit functionality.
     *
     * @param countryCode Country code (2 letter variant) for the current country selection.
     * @param onSuccess Callback invoked when the address structure has been retreived.
     * @param onError Callback invoked in event of an error.
     */
    fun getAddressStructure(
        countryCode: String,
        onSuccess: (AddressStructure) -> Unit,
        onError: (Throwable) -> Unit,
    ): Unit = onError(UnsupportedOperationException("getAddressFormLayout is not yet supported"))
}
