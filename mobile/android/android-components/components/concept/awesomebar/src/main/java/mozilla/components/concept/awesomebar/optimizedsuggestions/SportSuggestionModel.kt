/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.awesomebar.optimizedsuggestions

import android.graphics.Bitmap

/**
 * Represents the sports status type used by the Sports Suggestion.
 */
enum class SportSuggestionStatusType { PAST, LIVE, SCHEDULED, NONE }

/**
 * Represents the sports category used by the Sports Suggestion.
 */
enum class SportSuggestionCategory { BASEBALL, BASKETBALL, HOCKEY, SOCCER, FOOTBALL, GOLF, RACING, MISC }

/**
 * Represents the sports date used by the Sports Suggestion.
 */
sealed class SportSuggestionDate {
    /**
     * Represents a date either in the past or in the future, but not including tomorrow e.g. 28 Oct 2025.
     */
    class General(val date: String) : SportSuggestionDate()

    /**
     * Represents today's date.
     */
    object Today : SportSuggestionDate()

    /**
     * Represents tomorrow's date.
     */
    class Tomorrow(val time: String) : SportSuggestionDate()
}

/**
 * Represents a team in a sport suggestion.
 *
 * @param name The name of the team.
 * @param score The score of the team.
 * @param icon The icon of the team.
 */
data class SportSuggestionTeam(
    val name: String,
    val score: Int?,
    val icon: Bitmap?,
)

/**
 * Represents the various statuses a sport's game can have.
 */
sealed class SportSuggestionStatus {
    /**
     * Represents the game status when the game is scheduled to take place.
     */
    data object Scheduled : SportSuggestionStatus()

    /**
     * Represents the game status when the game has been delayed.
     */
    data object Delayed : SportSuggestionStatus()

    /**
     * Represents the game status when the game has been postponed.
     */
    data object Postponed : SportSuggestionStatus()

    /**
     * Represents the game status when the game is currently in progress.
     */
    data object InProgress : SportSuggestionStatus()

    /**
     * Represents the game status when the game has been suspended.
     */
    data object Suspended : SportSuggestionStatus()

    /**
     * Represents the game status when the game has been canceled.
     */
    data object Canceled : SportSuggestionStatus()

    /**
     * Represents the game status when the game has finished.
     */
    data object Final : SportSuggestionStatus()

    /**
     * Represents the game status when the game has been forfeited.
     */
    data object Forfeit : SportSuggestionStatus()

    /**
     * Represents the game status when the status is not necessary.
     */
    data object NotNecessary : SportSuggestionStatus()

    /**
     * Represents the game status when the status is unknown.
     */
    data object Unknown : SportSuggestionStatus()
}

/**
 * Represents the state of a sport suggestion.
 */
data class SportSuggestionState(
    val sport: String,
    val sportCategory: SportSuggestionCategory,
    val status: SportSuggestionStatus,
    val statusType: SportSuggestionStatusType,
    val date: SportSuggestionDate,
    val homeTeam: SportSuggestionTeam,
    val awayTeam: SportSuggestionTeam,
)
