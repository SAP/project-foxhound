/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import androidx.annotation.DrawableRes

/**
 * A participating team in the sports tournament.
 *
 * @property key Abbreviation named for a given name (e.g. "ENG").
 * @property flagResId Local fallback drawable for the flag.
 * @property globalTeamId Unique numeric identifier for this team.
 * @property name Long display name (e.g. "England"). This is not localized.
 * @property region ISO3 region code This may differ from [key] (e.g. "ENG").
 * @property iconUrl Optional URL for the team logo.
 * @property group [Group] name (e.g. "Group A"). This will be null after the knockout stage starts.
 * @property eliminated True once the team is out of the tournament.
 * @property standing The [TeamStanding] record in the tournament.
 */
data class Team(
    val key: String,
    @param:DrawableRes val flagResId: Int,
    val globalTeamId: Long = 0L,
    val name: String = "",
    val region: String = "",
    val iconUrl: String? = null,
    val group: Group? = null,
    val eliminated: Boolean = false,
    val standing: TeamStanding = TeamStanding(),
)

/**
 * Represents the Group stage within the tournament.
 */
enum class Group { A, B, C, D, E, F, G, H, I, J, K, L }

/**
 * The team's record within the tournament.
 */
data class TeamStanding(
    val wins: Int = 0,
    val losses: Int = 0,
    val draws: Int = 0,
    val points: Int = 0,
)

/**
 * Game status of a match.
 */
sealed class MatchStatus {
    /**
     * Match has not started yet.
     */
    data object Scheduled : MatchStatus()

    /**
     * Match is currently in progress.
     *
     * @property period Period description string ("1", "2", "Extra", etc.)
     * @property clock Minutes of elapsed play time, with extra time denoted as a "+"
     * (e.g. "42", "90+3" (indicating 3 minutes extra time)). Null when the feed omits it.
     * @property isHalftime True when play is paused for halftime (feed detail status "Break").
     */
    data class Live(val period: String, val clock: String?, val isHalftime: Boolean = false) : MatchStatus()

    /**
     * Match is in a penalty shootout.
     *
     * @property homePenalty Home team penalty score.
     * @property awayPenalty Away team penalty score.
     */
    data class Penalties(val homePenalty: Int? = null, val awayPenalty: Int? = null) : MatchStatus()

    /**
     * Match has ended.
     */
    data object Final : MatchStatus()

    /**
     * Match has ended with penalities.
     *
     * @property homePenalty Home team penalty score.
     * @property awayPenalty Away team penalty score.
     */
    data class FinalAfterPenalties(val homePenalty: Int? = null, val awayPenalty: Int? = null) : MatchStatus()

    /**
     * API returned an unrecognized status string.
     */
    data object Unknown : MatchStatus()
}

/**
 * True when the match is currently being played (regulation or penalty shootout).
 */
internal fun MatchStatus.isLive(): Boolean =
    this is MatchStatus.Live || this is MatchStatus.Penalties

/**
 * True when the match has finished (regulation or after a shootout).
 */
internal fun MatchStatus.isPast(): Boolean =
    this is MatchStatus.Final || this is MatchStatus.FinalAfterPenalties

/**
 * True when this period description denotes extra time — the feed uses both "ET" and
 * "Extra" (case-insensitively), so match either form.
 */
internal val String.isExtraTime: Boolean
    get() = contains("ET", ignoreCase = true) || contains("Extra", ignoreCase = true)

/**
 * Information related to a given sport event (game/match).
 *
 * @property globalEventId Stable upstream identifier; the natural cache key.
 * @property date Date string for start of match e.g. Jun 13.
 * @property time Time string for start of match e.g. 5:00 PM.
 * @property home Home [Team]. Null if the match has not been scheduled.
 * @property away Away [Team]. Null if the match has not been scheduled.
 * @property matchStatus Current [MatchStatus].
 * @property homeScore Home team score. Null if the match has not started.
 * @property awayScore Away team score. Null if the match has not started.
 * @property homePenalty Home penalty shootout score. Null if no shootout occurred.
 * @property awayPenalty Away penalty shootout score. Null if no shootout occurred.
 * @property clock Minutes of elapsed play time, with extra time denoted as a "+".
 * (e.g. "42", "90+3" (indicating 3 minutes extra time))
 * @property period Period description string ("1", "2", "Extra", etc.)
 * @property updated UTC timestamp when this event record was last updated.
 */
data class Match(
    val globalEventId: Long = 0L,
    val date: String,
    val time: String,
    val home: Team?,
    val away: Team?,
    val matchStatus: MatchStatus = MatchStatus.Scheduled,
    val homeScore: Int? = null,
    val awayScore: Int? = null,
    val homePenalty: Int? = null,
    val awayPenalty: Int? = null,
    val clock: String? = null,
    val period: String? = null,
    val updated: Int? = null,
)

/**
 * Outcome of a match from the viewpoint of a followed team.
 */
sealed class FollowedTeamOutcome {
    /**
     * Followed team is not playing in this match.
     */
    data object NotInvolved : FollowedTeamOutcome()

    /**
     * Match has not concluded yet.
     */
    data object Pending : FollowedTeamOutcome()

    /**
     * Followed team won this match.
     */
    data object Won : FollowedTeamOutcome()

    /**
     * Followed team lost or drew but advanced.
     */
    data object Advanced : FollowedTeamOutcome()

    /**
     * Followed team was eliminated by this match.
     */
    data object Eliminated : FollowedTeamOutcome()

    /**
     * Tournament has been decided. [winner] is the team that won the final, regardless of
     * whether any team is followed. The celebration card uses this directly.
     */
    data class TournamentWinner(val winner: Team) : FollowedTeamOutcome()

    /**
     * Third-place playoff has been decided. [winner] is the team that won the playoff,
     * regardless of whether any team is followed. The celebration card uses this directly.
     */
    data class ThirdPlace(val winner: Team) : FollowedTeamOutcome()
}

/**
 * Round/stage of the soccer tournament.
 */
enum class TournamentRound {
    GROUP_STAGE,
    ROUND_OF_32,
    ROUND_OF_16,
    QUARTER_FINAL,
    SEMI_FINAL,

    // Third-place playoff is played before the final in the World Cup schedule, so
    // FINAL is the last entry — keeps `ordinal` aligned with actual progression so
    // SportsWidgetMiddleware.activeRound's max-ordinal-by-played picks the climactic
    // round correctly.
    THIRD_PLACE_PLAYOFF,
    FINAL,
}

/**
 * UI state for a match card.
 *
 * @property matches The underlying data for each match.
 * @property round Which round of the tournament this match belongs to.
 * @property viewerOutcome Outcome of this match from the perspective of the followed team(s).
 * @property relatedMatches Related [Match]es to display.
 */
data class MatchCard(
    val matches: List<Match>,
    val round: TournamentRound = TournamentRound.GROUP_STAGE,
    val viewerOutcome: FollowedTeamOutcome = FollowedTeamOutcome.NotInvolved,
    val relatedMatches: List<Match>,
)

/**
 * UI state for the champion celebration card shown when a followed team wins.
 *
 * @property finalMatch The final (or third-place playoff) [Match] whose result determined
 * the celebrated team.
 * @property winner The team being celebrated.
 * @property thirdPlace Whether this card celebrates a third-place finish rather than the
 * tournament winner.
 */
data class ChampionCard(
    val finalMatch: Match,
    val winner: Team,
    val thirdPlace: Boolean = false,
)

/**
 * Represents the source of the Country Selector BottomSheet impressions.
 */
enum class CountrySelectorSource(val value: String) {
    COUNTDOWN_CARD_FOLLOW_TEAM_BUTTON("countdown_card_follow_team_button"),
    KEEP_TABS_CARD_FOLLOW_TEAM_BUTTON("keep_tabs_card_follow_team_button"),
    SPORTS_WIDGET_MENU("sports_widget_menu"),
    SPORTS_LOGO("sports_logo"),
}

/**
 * Represents the source of the Live Match Refresh button clicks.
 */
enum class LiveMatchRefreshSource(val value: String) {
    LIVE_MATCH_HEADER("live_match_header"),
    LIVE_MATCH_CARD_ERROR_BUTTON("live_match_card_error_button"),
    SPORTS_WIDGET_CARD_ERROR_BUTTON("sports_widget_card_error_button"),
}

/**
 * Identifies which card variant is displayed in the sports widget. Used as a Glean extra to
 * distinguish error/promo/match cards and — for match cards — the tournament stage.
 */
enum class SportsCardType(val value: String) {
    ERROR_LOAD_FAILED("error_load_failed"),
    ERROR_CONNECTION_INTERRUPTED("error_connection_interrupted"),
    COUNTDOWN_PROMO("countdown_promo"),
    FOLLOW_TEAM_PROMO("follow_team_promo"),
    FOLLOWING_PROMO("following_promo"),
    CHAMPIONS_WINNER("champions_winner"),
    CHAMPIONS_THIRD_PLACE("champions_third_place"),
    MATCH_GROUP_STAGE("match_group_stage"),
    MATCH_ROUND_OF_32("match_round_of_32"),
    MATCH_ROUND_OF_16("match_round_of_16"),
    MATCH_QUARTER_FINAL("match_quarter_final"),
    MATCH_SEMI_FINAL("match_semi_final"),
    MATCH_THIRD_PLACE_PLAYOFF("match_third_place_playoff"),
    MATCH_FINAL("match_final"),
    ;

    companion object {
        /**
         * Maps a tournament [round] to its corresponding match-card [SportsCardType].
         */
        fun fromRound(round: TournamentRound): SportsCardType = when (round) {
            TournamentRound.GROUP_STAGE -> MATCH_GROUP_STAGE
            TournamentRound.ROUND_OF_32 -> MATCH_ROUND_OF_32
            TournamentRound.ROUND_OF_16 -> MATCH_ROUND_OF_16
            TournamentRound.QUARTER_FINAL -> MATCH_QUARTER_FINAL
            TournamentRound.SEMI_FINAL -> MATCH_SEMI_FINAL
            TournamentRound.THIRD_PLACE_PLAYOFF -> MATCH_THIRD_PLACE_PLAYOFF
            TournamentRound.FINAL -> MATCH_FINAL
        }

        /**
         * Maps an [error] state to its corresponding error-card [SportsCardType].
         */
        fun fromError(error: SportCardErrorState): SportsCardType = when (error) {
            SportCardErrorState.LoadFailed -> ERROR_LOAD_FAILED
            SportCardErrorState.ConnectionInterrupted -> ERROR_CONNECTION_INTERRUPTED
        }
    }
}

/**
 * Distinguishes the first card seen on widget mount from cards reached by swiping the pager.
 */
enum class SportsCardImpressionSource(val value: String) {
    IMPRESSION("impression"),
    SWIPE("swipe"),
}
