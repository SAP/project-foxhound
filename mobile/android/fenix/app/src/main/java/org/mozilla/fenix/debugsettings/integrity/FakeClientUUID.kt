/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.debugsettings.integrity

import mozilla.components.concept.integrity.IntegrityClient
import mozilla.components.lib.llm.mlpa.service.UserId
import org.mozilla.fenix.components.ClientUUID

/**
 * A Fake [IntegrityClient] to be used in the debug drawer preview.
 */
class FakeClientUUID : ClientUUID {
    override fun getUserId() = UserId("fake-userid")
    override fun generateHash() = "generated-hash"
}
