/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers.ext

import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput

/**
 * Clears the text in the node and then sets the given text.
 *
 * This is a convenience function that combines [performTextClearance] and [performTextInput].
 *
 * @param text The text to be input.
 * @return The [SemanticsNodeInteraction] for chaining.
 */
fun SemanticsNodeInteraction.clearAndSetText(text: String): SemanticsNodeInteraction {
    performTextClearance()
    performTextInput(text)
    return this
}
