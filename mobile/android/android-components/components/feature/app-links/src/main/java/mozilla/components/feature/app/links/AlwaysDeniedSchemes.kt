/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.app.links

import java.util.Locale

/**
 * Utility class whether scheme is allowed or denied.
 */
class AlwaysDeniedSchemes(private val schemes: Set<String>) {
    /**
     * Whether or not we should deny given URI scheme by dangerous etc.
     *
     * @param scheme A scheme of URI
     * @return `true` If scheme should be denied
     */
    fun shouldDeny(scheme: String?): Boolean {
         return schemes.contains(scheme?.lowercase(Locale.ROOT))
    }
}
