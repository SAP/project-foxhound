/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import android.net.ConnectivityManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import mozilla.components.lib.state.Middleware
import mozilla.components.lib.state.Store
import org.mozilla.fenix.components.appstate.AppAction
import org.mozilla.fenix.components.appstate.AppAction.SportsWidgetAction
import org.mozilla.fenix.components.appstate.AppState
import org.mozilla.fenix.ext.isOnline

// The tournament's bracket-finishing matches. These are always surfaced — both for a
// followed team and in the no-team pager — so the schedule and result of the tournament's
// last matches stay visible regardless of which round is currently active. The semi-finals
// are deliberately excluded: they are surfaced by the active-round logic when current, and
// only the terminal matches warrant being pinned ahead of time.
private val BRACKET_FINISHING_STAGES = setOf(
    TournamentRound.FINAL,
    TournamentRound.THIRD_PLACE_PLAYOFF,
)

// From this round onward the remaining bracket is locked in, so the no-team pager shows the whole
// rest of the schedule the API returns — including not-yet-determined rounds (e.g. a TBD-vs-TBD
// semi-final while the quarter-finals are live). Before it, the pager only reveals the next round's
// already-decided fixtures, so earlier stages don't fill with "TBD vs TBD" placeholder cards.
private val FULL_SCHEDULE_FROM_ROUND = TournamentRound.QUARTER_FINAL

// Default minimum gap, in seconds, between consecutive attempted fetches. Used when the
// [SportsWidgetMiddleware] caller doesn't override fetchMinIntervalSeconds (e.g. tests). The
// shipping default is the Nimbus-controlled `homepage-sports-widget.fetch-throttle-seconds`,
// wired in from [org.mozilla.fenix.utils.Settings.sportsWidgetFetchThrottleSeconds].
private const val DEFAULT_FETCH_MIN_INTERVAL_SECONDS = 60
private const val MILLIS_PER_SECOND = 1000L

/**
 * [Middleware] that handles side effects for [SportsWidgetAction].
 *
 * Reacts to [SportsWidgetAction.FetchMatches] by fetching the full tournament
 * schedule from [sportsRepository] and dispatching the resulting [MatchCard]s.
 * The raw [TeamMatchesResult] is cached in memory so that a follow-up
 * [SportsWidgetAction.CountriesSelected] (the user picks/changes a followed
 * team) can re-derive cards locally without a network round-trip. On cold
 * cache the selection falls through to a fresh fetch.
 *
 * Connectivity is checked at the dispatch sites of [SportsWidgetAction.FetchMatches];
 * a [SportsWidgetAction.FetchFailed] with [SportCardErrorState.ConnectionInterrupted]
 * is dispatched instead when the device is offline, and [fetchAndBuild] is not invoked.
 *
 * @param sportsRepository [SportsRepository] used to fetch match data.
 * @param connectivityManager Used to short-circuit fetches with
 * [SportCardErrorState.ConnectionInterrupted] when the device is offline instead of
 * letting the underlying client time out into [SportCardErrorState.LoadFailed].
 * @param coroutineScope [CoroutineScope] used for async fetch operations.
 * @param clock Source of the current time in epoch milliseconds; injectable for tests.
 * @param fetchMinIntervalSeconds Minimum gap between attempted fetches, throttling in-session
 * refreshes (refresh-button spam, Home/onResume thrash). Defaults to the Nimbus-controlled value.
 * @param bypassThrottle When true, skips the min-interval throttle so QA can drive state changes
 * without waiting on the timer (e.g. while the debug drawer's mock server is active). Evaluated
 * per dispatch so a runtime toggle takes effect immediately.
 */
class SportsWidgetMiddleware(
    private val sportsRepository: SportsRepository,
    private val connectivityManager: ConnectivityManager,
    private val coroutineScope: CoroutineScope = CoroutineScope(Dispatchers.IO),
    private val clock: () -> Long = System::currentTimeMillis,
    fetchMinIntervalSeconds: Int = DEFAULT_FETCH_MIN_INTERVAL_SECONDS,
    private val bypassThrottle: () -> Boolean = { false },
) : Middleware<AppState, AppAction> {

    private val fetchMinIntervalMs: Long = fetchMinIntervalSeconds * MILLIS_PER_SECOND

    @Volatile
    private var cachedMatches: TeamMatchesResult? = null

    @Volatile
    private var inProgress: Job? = null

    // Null until the first fetch attempt. Using a nullable rather than a sentinel
    // avoids the `now - Long.MIN_VALUE` overflow, which would wrap negative and
    // wrongly throttle the very first fetch.
    @Volatile
    private var lastFetchAtMs: Long? = null

    override fun invoke(
        store: Store<AppState, AppAction>,
        next: (AppAction) -> Unit,
        action: AppAction,
    ) {
        next(action)

        when (action) {
            is SportsWidgetAction.FetchMatches -> fetchAndBuild(store)
            is SportsWidgetAction.CountriesSelected -> {
                val cached = cachedMatches
                if (cached != null) {
                    store.dispatch(
                        SportsWidgetAction.MatchCardStateUpdated(buildCards(cached, action.countryCodes)),
                    )
                } else {
                    fetchAndBuild(store)
                }
            }
            // Debug-tool overrides change which UI state should render. Trigger a fetch so the
            // pager has data without waiting for the next HomeFragment.onResume.
            is SportsWidgetAction.OneWeekToWorldCupOverrideUpdated,
            is SportsWidgetAction.WorldCupStartedOverrideUpdated,
            -> fetchAndBuild(store)
            else -> Unit
        }
    }

    private fun fetchAndBuild(store: Store<AppState, AppAction>) {
        // Drop the request if a previous fetch is still running. Prevents concurrent
        // round-trips when the user mashes the refresh button or swipes between
        // Home and another tab faster than the network can respond.
        if (inProgress?.isActive == true) return

        // Min-interval throttle, aligned with the upstream Merino cache. Stamped on
        // attempt (not on success) so failures also respect the gap — otherwise a
        // failing endpoint could be hammered by tapping retry. Bypassed entirely
        // when [bypassThrottle] is true (e.g. the debug drawer's mock server is
        // active) so QA can drive state changes without waiting on the timer.
        val now = clock()
        val last = lastFetchAtMs
        if (!bypassThrottle() && last != null && now - last < fetchMinIntervalMs) return

        // Skip the round-trip when the device is offline; surface the connectivity
        // error directly so the widget renders the "you're offline" message instead
        // of a generic load-failure once the network call times out.
        if (!connectivityManager.isOnline()) {
            store.dispatch(SportsWidgetAction.FetchFailed(SportCardErrorState.ConnectionInterrupted))
            return
        }
        lastFetchAtMs = now
        inProgress = coroutineScope.launch {
            try {
                sportsRepository.fetchMatches()
                    .onSuccess { result ->
                        cachedMatches = result
                        val countryCodes = store.state.sportsWidgetState.countriesSelected
                        // A fresh successful fetch retires any prior banner. Done explicitly here
                        // — and NOT as a side effect of MatchCardStateUpdated — so cache-hit
                        // re-derives (e.g. CountriesSelected with a cached response) don't
                        // silently dismiss a still-valid error.
                        store.dispatch(SportsWidgetAction.ErrorStateCleared)
                        store.dispatch(SportsWidgetAction.MatchCardStateUpdated(buildCards(result, countryCodes)))
                        store.dispatch(SportsWidgetAction.EliminatedCountriesUpdated(eliminatedCodes(result)))
                    }
                    .onFailure {
                        store.dispatch(SportsWidgetAction.FetchFailed(SportCardErrorState.LoadFailed))
                    }
            } finally {
                inProgress = null
            }
        }
    }

    private fun eliminatedCodes(result: TeamMatchesResult): Set<String> =
        (result.previous + result.current + result.next)
            .asSequence()
            .flatMap { sequenceOf(it.homeTeam, it.awayTeam) }
            .filterNotNull()
            .filter { it.eliminated }
            .map { it.key }
            .toSet()

    private fun buildCards(result: TeamMatchesResult, countryCodes: Set<String>): List<MatchCard> {
        // Once the followed team is out of the tournament, switch to the generic experience
        // (the bracket-wide view) rather than continuing to render an empty team-specific
        // pager. The user's selection is preserved in state — they can still see and
        // change it via the country selector — we just stop rendering as if their team
        // were still in play.
        val effectiveCodes = if (allFollowedTeamsEliminated(result, countryCodes)) {
            emptySet()
        } else {
            countryCodes
        }
        return if (effectiveCodes.isEmpty()) {
            val activeRound = result.activeRound() ?: return emptyList()
            MatchCardBuilder.buildForNoTeam(noTeamMatches(result, activeRound))
        } else {
            MatchCardBuilder.buildForTeam(filterByTeam(result, effectiveCodes))
        }
    }

    // Matches the no-team (bracket-wide) pager should show for the given [activeRound].
    //
    // Before the knockout endgame (active round earlier than [FULL_SCHEDULE_FROM_ROUND]) the pager
    // stays focused: just the active round and the next round's already-decided fixtures. The final
    // and third-place are deliberately NOT surfaced yet, and there are no "TBD vs TBD" placeholders,
    // so the group stage / early knockouts don't fill with cards for matches weeks away.
    //
    // From the quarter-finals onward the whole run-in is locked in, so we surface the active round
    // and every later round the response carries — including not-yet-determined ones (a TBD-vs-TBD
    // semi-final while the quarter-finals are live, say). [BRACKET_FINISHING_STAGES] is OR'd in so
    // the third-place card still shows alongside the final once the final itself is the active round
    // (it would otherwise be excluded by the `>= activeRound` ordinal check). Earlier rounds still
    // drop out as each new round goes live, via [activeRound].
    private fun noTeamMatches(result: TeamMatchesResult, activeRound: TournamentRound): List<SportsMatch> {
        val all = result.previous + result.current + result.next
        return if (activeRound.ordinal >= FULL_SCHEDULE_FROM_ROUND.ordinal) {
            all.filter { it.stage.ordinal >= activeRound.ordinal || it.stage in BRACKET_FINISHING_STAGES }
        } else {
            val nextRound = result.nextRound(activeRound)
            all.filter { match ->
                match.stage == activeRound ||
                    (match.stage == nextRound && !match.isFullyTbd())
            }
        }
    }

    // The "active" round is the most-advanced round that has at least one match
    // already underway. Priority:
    //   1. A live match's round wins — even if a later round has played matches,
    //      the in-progress game is what the user came to see.
    //   2. Otherwise: the highest-ordinal round with any finished match. This is what
    //      makes the widget hide group stage as soon as the first R32 game has
    //      kicked off, even when no R32 game is live at this exact moment and the
    //      ±10-day window still carries the prior round's matches.
    //   3. Pre-tournament fallback: the round of the soonest upcoming match.
    private fun TeamMatchesResult.activeRound(): TournamentRound? {
        val all = previous + current + next
        return all.firstOrNull { it.matchStatus.isLive() }?.stage
            ?: all.filter { it.matchStatus.isPast() }.maxByOrNull { it.stage.ordinal }?.stage
            ?: all.minByOrNull { it.date }?.stage
    }

    // The round immediately after [activeRound] present in the response, or null if there is
    // none. Used to surface the upcoming round's fixtures as its bracket fills in; whether any
    // fixture is actually shown is decided by the caller's TBD filter.
    private fun TeamMatchesResult.nextRound(activeRound: TournamentRound): TournamentRound? =
        (previous + current + next).asSequence()
            .map { it.stage }
            .filter { it.ordinal > activeRound.ordinal }
            .minByOrNull { it.ordinal }

    // A match with neither side decided yet — both teams still come from undetermined earlier
    // results. A fixture with one side known (the other a placeholder) is not fully TBD and is
    // worth showing.
    private fun SportsMatch.isFullyTbd(): Boolean = homeTeam == null && awayTeam == null

    // True when every followed team appears in the response with `eliminated = true`. If a
    // followed code isn't found in the response at all, we treat it as not-eliminated
    // (safe default: keep rendering the team-specific view rather than disappearing it
    // on stale or partial data).
    private fun allFollowedTeamsEliminated(
        result: TeamMatchesResult,
        codes: Set<String>,
    ): Boolean {
        if (codes.isEmpty()) return false
        val allMatches = result.previous + result.current + result.next
        return codes.all { code ->
            val snapshot = allMatches.firstNotNullOfOrNull { match ->
                when (code) {
                    match.homeTeam?.key -> match.homeTeam
                    match.awayTeam?.key -> match.awayTeam
                    else -> null
                }
            }
            snapshot?.eliminated == true
        }
    }

    private fun filterByTeam(result: TeamMatchesResult, codes: Set<String>): TeamMatchesResult {
        // The followed team's own matches PLUS the bracket-finishing matches (FINAL and
        // THIRD_PLACE_PLAYOFF) so the universal celebration card surfaces in the pager
        // even when the followed team isn't in them.
        fun List<SportsMatch>.relevantFor(codes: Set<String>): List<SportsMatch> =
            filter { match ->
                match.homeTeam?.key in codes ||
                    match.awayTeam?.key in codes ||
                    match.stage in BRACKET_FINISHING_STAGES
            }
        return TeamMatchesResult(
            previous = result.previous.relevantFor(codes),
            current = result.current.relevantFor(codes),
            next = result.next.relevantFor(codes),
        )
    }
}
