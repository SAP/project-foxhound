/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.mars

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.components.concept.fetch.Client
import mozilla.components.concept.fetch.Request
import mozilla.components.concept.fetch.Request.Method
import mozilla.components.concept.fetch.isSuccess
import mozilla.components.support.base.log.logger.Logger
import java.io.IOException

/**
 * Use cases for handling the Mozilla Ad Routing Service (MARS) API click and impression callbacks.
 * The use cases performs a request for the provided click or impression callback URL.
 *
 * @param client [Client] used for making HTTP API calls.
 * @param ioDispatcher [CoroutineDispatcher] used for the IO operations.
 */
class MARSUseCases(
    private val client: Client,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    private val logger = Logger("MarsCallbackUseCases")

    /**
     * Performs a request to the provided click or impression callback [url] for a MARS top sites or
     * sponsored content to record the interaction.
     *
     * @param url The click or impression URL to request.
     * @return Whether the response is successful or not.
     */
    suspend fun recordInteraction(url: String): Boolean = withContext(ioDispatcher) {
        val request = Request(
            url = url,
            method = Method.GET,
            conservative = true,
        )

        val response = try {
            client.fetch(request)
        } catch (e: IOException) {
            logger.debug("Network error", e)
            null
        }

        response?.close()
        response?.isSuccess ?: false
    }
}
