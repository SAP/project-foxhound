/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.prompts.ext

/**
 * Handles text truncation limit
 */
object Truncation {
    /**
     * Maximum length for dialog message text to prevent ANR during text measurement.
     * Very long strings can cause Android's text layout engine to timeout on the main thread.
     */
    const val MAX_MESSAGE_LENGTH = 1200
}
