/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.helpers

import android.net.InetAddresses
import org.robolectric.Robolectric
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements
import java.util.regex.Pattern

/**
 * Custom [InetAddresses] shadow to use with [Robolectric] tests to reduce their flakiness.
 */
@Implements(InetAddresses::class)
class ShadowInetAddresses {
    companion object {
        // Strict IPv4 regex to ensure domains like "example.com" fail immediately
        private val IPV4_PATTERN = Pattern.compile(
            "^((25[0-5]|(2[0-4]|1\\d|[1-9]|)\\d)\\.?\\b){4}$",
        )

        @JvmStatic
        @Implementation
        fun isNumericAddress(address: String?): Boolean {
            if (address.isNullOrEmpty()) {
                return false
            }

            // Strict IPv4 format check.
            if (IPV4_PATTERN.matcher(address).matches()) {
                return true
            }

            // IPv6 check. Must contain colons. This safely excludes punycode and domains.
            if (address.contains(":") && !address.contains(".")) {
                return true
            }

            // Dual-stack IPv4-mapped IPv6 addresses (e.g., ::ffff:192.0.2.128) check.
            if (address.contains(":") && address.contains(".")) {
                return true
            }

            return false
        }
    }
}
