/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.conventions

/**
 * Returns true if the value is considered "truthy" (non-null, non-false, non-zero, non-empty).
 */
@Suppress("NOTHING_TO_INLINE")
inline fun Any?.isTruthy(): Boolean {
    return when (this) {
        null -> false
        false -> false
        0 -> false
        "" -> false
        else -> true
    }
}
