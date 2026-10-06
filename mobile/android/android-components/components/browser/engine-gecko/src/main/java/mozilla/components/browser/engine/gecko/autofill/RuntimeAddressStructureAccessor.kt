/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.engine.gecko.autofill

import mozilla.components.concept.engine.autofill.AddressStructure
import mozilla.components.concept.engine.autofill.UnexpectedNullError
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.Autocomplete.AddressStructure as GeckoAddressStructure

/**
 * Interface for fetching the address structure for a given country.
 */
fun interface RuntimeAddressStructureAccessor {
    /**
     * Fetch the address structure for a given country.
     *
     * @param countryCode the country code used when fetching an address structure.
     * @param onSuccess Callback invoked with a list of [AddressField]'s
     * @param onError Callback invoked if the check fails or an error occurs.
     */
    fun getAddressStructure(
        countryCode: String,
        onSuccess: (AddressStructure) -> Unit,
        onError: (Throwable) -> Unit,
    )
}

internal class DefaultRuntimeAddressStructureAccessor(
    private val getGeckoAddressStructure: (String) -> GeckoResult<List<GeckoAddressStructure.Field>> = {
        GeckoAddressStructure.getAddressStructure(it)
    },
) : RuntimeAddressStructureAccessor {
    override fun getAddressStructure(
        countryCode: String,
        onSuccess: (AddressStructure) -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        handleGeckoResult(
            geckoResult = getGeckoAddressStructure(countryCode).toConceptAddressStructure(),
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    private fun <T : Any> handleGeckoResult(
        geckoResult: GeckoResult<T>,
        onSuccess: (T) -> Unit,
        onError: (Throwable) -> Unit,
    ) {
        geckoResult.then(
            { res: T? ->
                if (res != null) {
                    onSuccess(res)
                } else {
                    onError(UnexpectedNullError())
                }
                GeckoResult<Void>()
            },
            { throwable ->
                onError(throwable)
                GeckoResult<Void>()
            },
        )
    }

    private fun GeckoResult<List<GeckoAddressStructure.Field>>.toConceptAddressStructure() = map { results ->
        if (results == null) {
            return@map null
        }

        val fields = results.mapNotNull { result ->
            val id = AddressStructure.Field.ID.from(result.id)
            val localizationKey = AddressStructure.Field.LocalizationKey.from(result.localizationKey)
            when (result) {
                is GeckoAddressStructure.Field.SelectField -> AddressStructure.Field.SelectField(
                    id = id,
                    localizationKey = localizationKey,
                    defaultSelectionKey = result.defaultValue,
                    options = result.options.map { option ->
                        AddressStructure.Field.SelectField.Option(
                            key = option.key,
                            value = option.value,
                        )
                    },
                )

                is GeckoAddressStructure.Field.TextField -> AddressStructure.Field.TextField(
                    id = id,
                    localizationKey = localizationKey,
                )

                else -> null
            }
        }

        return@map AddressStructure(fields)
    }
}
