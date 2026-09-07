/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.ipprotection

import kotlinx.coroutines.flow.Flow
import mozilla.components.feature.ipprotection.store.state.EligibilityStatus

/**
 * Storage exposing the eligibility of the IP Protection feature.
 */
interface IPProtectionEligibilityStorage {
    /**
     * Emits the user's current [EligibilityStatus] for IP Protection.
     */
    val eligibilityStatus: Flow<EligibilityStatus>

    /**
     * Initializes the storage.
     */
    fun init()
}
