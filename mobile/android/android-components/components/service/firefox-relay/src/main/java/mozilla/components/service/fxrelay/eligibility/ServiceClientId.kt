/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.eligibility

/**
 * Firefox Relay service client identifiers for different environments.
 *
 * Source: https://github.com/mozilla/fxa/blob/35c7a999010a4ff053fc65edbc39d343b8e6f143/packages/fxa-settings/src/models/integrations/client-matching.ts#L12-L16
 */
enum class ServiceClientId(val id: String) {
    Stage("41b4363ae36440a9"),
    Dev("723aa3bce05884d8"),
    Production("9ebfe2c2f9ea3c58"),
}
