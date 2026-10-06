/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.awesomebar.facts

/**
 * Suggestion card types used for telemetry related to the AwesomeBar feature.
 */
enum class SuggestionCardType(val value: String) {
    STOCKS("stocks"),
    SPORTS("sports"),
    FLIGHTS("flights"),
}
