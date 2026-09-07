/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.service.fxrelay.ext

import mozilla.appservices.relay.RelayAddress
import mozilla.components.service.fxrelay.EmailMask
import mozilla.components.service.fxrelay.MaskSource

/**
 * Converts this [RelayAddress] to an [EmailMask].
 *
 * @param source Optional source indicating how the mask was created.
 * @return An [EmailMask] with the full address and optional source.
 */
internal fun RelayAddress.asEmailMask(source: MaskSource? = null): EmailMask {
    return EmailMask(fullAddress, source)
}
