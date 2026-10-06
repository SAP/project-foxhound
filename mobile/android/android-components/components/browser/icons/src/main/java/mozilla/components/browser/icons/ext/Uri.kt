/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.icons.ext

import android.net.Uri

// Make sure domain added here have the corresponding image_url in icons-top200.json
private val commonDomain = listOf("wikipedia.org")

/**
 * Returns the host's common domain if found, else null is returned
 */
internal val Uri.hostWithCommonDomain: String?
    get() {
        val host = host ?: return null
        for (domain in commonDomain) {
            if (host.endsWith(domain)) return domain
        }
        return null
    }
