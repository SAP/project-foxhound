/*
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  * License, v. 2.0. If a copy of the MPL was not distributed with this
 *  * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.components.metrics.fake

import org.mozilla.fenix.components.metrics.GleanProfileIdStore

class FakeGleanProfileIdStore : GleanProfileIdStore {
    var appStoredProfileId: String? = null
    override var profileId: String?
        get() = appStoredProfileId
        set(value) { appStoredProfileId = value }

    override fun clear() {
        appStoredProfileId = null
    }
}
