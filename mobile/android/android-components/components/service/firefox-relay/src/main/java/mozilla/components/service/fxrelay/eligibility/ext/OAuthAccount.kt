/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility.ext

import mozilla.components.concept.sync.AttachedClient
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.service.fxrelay.eligibility.ServiceClientId

/**
 * Retrieves the Firefox Relay client from the list of attached clients.
 *
 * @return The attached relay client if found, null otherwise.
 */
internal suspend fun OAuthAccount.relayClient(): AttachedClient? {
    val serviceIds = ServiceClientId.entries.map { it.id }.toSet()
    return getAttachedClient()
        .firstOrNull { client ->
            serviceIds.contains(client.clientId)
        }
}
