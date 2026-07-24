/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.optimizedsuggestions

/**
 * Represents the change percent used by the Stocks Suggestion.
 */
internal sealed class ChangePercent(val value: String) {
    class Positive(value: String) : ChangePercent(value)
    class Negative(value: String) : ChangePercent(value)
    object Neutral : ChangePercent(value = "0")
}
