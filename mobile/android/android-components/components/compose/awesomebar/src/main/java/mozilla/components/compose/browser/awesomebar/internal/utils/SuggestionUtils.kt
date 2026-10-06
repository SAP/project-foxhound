/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.browser.awesomebar.internal.utils

import mozilla.components.compose.browser.awesomebar.R
import mozilla.components.concept.awesomebar.optimizedsuggestions.SportSuggestionStatus

/**
 * Maps a [SportSuggestionStatus] to its corresponding string resource ID for display in the UI.
 *
 * @return The string resource ID for the status, or null if the status has no display text.
 */
internal val SportSuggestionStatus.stringResId: Int?
    get() = when (this) {
        is SportSuggestionStatus.Scheduled ->
            R.string.mozac_browser_awesomebar_sport_suggestion_scheduled
        is SportSuggestionStatus.Delayed ->
            R.string.mozac_browser_awesomebar_sport_suggestion_delayed
        is SportSuggestionStatus.Postponed ->
            R.string.mozac_browser_awesomebar_sport_suggestion_postponed
        is SportSuggestionStatus.InProgress ->
            R.string.mozac_browser_awesomebar_sport_suggestion_in_progress
        is SportSuggestionStatus.Suspended ->
            R.string.mozac_browser_awesomebar_sport_suggestion_suspended
        is SportSuggestionStatus.Canceled ->
            R.string.mozac_browser_awesomebar_sport_suggestion_canceled
        is SportSuggestionStatus.Final ->
            R.string.mozac_browser_awesomebar_sport_suggestion_final
        is SportSuggestionStatus.Forfeit ->
            R.string.mozac_browser_awesomebar_sport_suggestion_forfeited
        is SportSuggestionStatus.NotNecessary,
        SportSuggestionStatus.Unknown,
        -> null
    }
