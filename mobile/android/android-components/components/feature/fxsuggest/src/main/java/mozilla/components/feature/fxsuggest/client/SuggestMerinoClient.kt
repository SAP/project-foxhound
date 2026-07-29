/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.fxsuggest.client

import mozilla.appservices.merino.MerinoSuggestApiException
import mozilla.appservices.merino.SuggestClient
import mozilla.appservices.merino.SuggestConfig
import mozilla.appservices.merino.SuggestOptions
import mozilla.appservices.viaduct.OhttpConfig
import mozilla.appservices.viaduct.configureOhttpChannel
import mozilla.components.support.base.log.logger.Logger

/**
 * A client for fetching suggestions from the Merino suggest endpoint.
 * This interface allows for swapping out the underlying implementation for testing.
 */
interface MerinoClient {
    /**
     * Makes a network request to the suggest endpoint.
     *
     * @param query The search query to send.
     * @return The raw JSON response body as a [String], or `null` if the request fails or returns an error.
     */
    fun makeRequest(query: String): String?
}

/**
 * An implementation of [MerinoClient] that uses the Application Services [SuggestClient]
 * to fetch suggestions. This client configures the OHTTP channel and handles potential
 * [MerinoSuggestApiException]s, logging them appropriately.
 */
class SuggestMerinoClient : MerinoClient {
    private val logger = Logger("SuggestMerinoClient")
    private val suggestClient = SuggestClient(SuggestConfig(baseHost = null))

    init {
        configureOhttpChannel(
            channel = MERINO,
            config = OhttpConfig(relayUrl = RELAY_URL, gatewayHost = GATEWAY_HOST),
        )
    }

    override fun makeRequest(query: String): String? = try {
        suggestClient.getSuggestions(
            query = query,
            options = SuggestOptions(
                providers = listOf(PROVIDERS),
                source = null,
                country = null,
                region = null,
                city = null,
                clientVariants = null,
                requestType = null,
                acceptLanguage = null,
            ),
        )
    } catch (e: MerinoSuggestApiException) {
        when (e) {
            is MerinoSuggestApiException.Network -> logger.error(message = "$NETWORK_ERROR_MESSAGE - ${e.message}")
            is MerinoSuggestApiException.Other -> logger.error(message = "$UNEXPECTED_ERROR_MESSAGE - ${e.message}")
        }
        null
    }

    companion object {
        private const val NETWORK_ERROR_MESSAGE = "Network error when fetching Online Suggestions"
        private const val UNEXPECTED_ERROR_MESSAGE =
            "Unexpected error when fetching Online Suggestions"
        private const val PROVIDERS = "flightaware,polygon,sports"
        private const val MERINO = "merino"
        private const val RELAY_URL = "https://ohttp-merino.mozilla.fastly-edge.com"
        private const val GATEWAY_HOST = "ohttp-gateway-merino.services.mozilla.com"
    }
}
