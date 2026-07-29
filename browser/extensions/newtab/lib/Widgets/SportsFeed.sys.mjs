/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  PersistentCache: "resource://newtab/lib/PersistentCache.sys.mjs",
  SearchUIUtils: "moz-src:///browser/components/search/SearchUIUtils.sys.mjs",
  TemporaryMerinoClientShim:
    "resource://newtab/lib/TemporaryMerinoClientShim.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

import {
  actionTypes as at,
  actionCreators as ac,
  actionUtils as au,
} from "resource://newtab/common/Actions.mjs";

const PREF_SPORTS_ENABLED = "widgets.sportsWidget.enabled";
const PREF_SYSTEM_SPORTS_ENABLED = "widgets.system.sportsWidget.enabled";
const FOLLOW_STATE = "sports-follow-state";
const CACHE_KEY = "sports_feed";
const MERINO_CLIENT_KEY = "HNT_SPORTS_FEED";
// Floor for how long a just-ended match's endedAt timestamp is retained before
// being pruned. The effective retention is max(this, the configured celebration
// window) so a window configured larger than this can't have its stamps pruned
// before it expires; this only caps unbounded growth of the persisted map.
const CELEBRATION_RETENTION_FLOOR_MS = 7 * 24 * 60 * 60 * 1000;
// Default "recently ended" window; mirrors DEFAULT_CELEBRATION_WINDOW_MS in
// SportsWidget.jsx (the content side owns the celebration-firing decision).
const DEFAULT_CELEBRATION_WINDOW_MS = 24 * 60 * 60 * 1000;
// Cap the persisted `celebrated` id list so it can't grow without bound over a
// long tournament; only the most recent ids matter (the window is hours, not
// the whole list). FIFO-trim the oldest.
const MAX_CELEBRATED_IDS = 100;
// SAP source string passed to BrowserSearchTelemetry — must be a key in
// BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES. Today this widget reports under
// the generic newtab source; the search team may ask us to switch to a
// widget-specific source later.
const SEARCH_SAP_SOURCE = "about_newtab";
// Status types that count as in-progress for the Now tab. Mirrors the keys in
// LIVE_STATUS_L10N_MAP in SportsMatchRow.jsx plus the catch-all "live"; keep
// the two in sync when new live sub-statuses are added.
const LIVE_STATUS_TYPES = new Set(["live", "halftime", "extra time"]);

// Adaptive live-polling prefs and constants
const PREF_SPORTS_LIVE_ENABLED = "widgets.sportsWidget.live.enabled";
const PREF_SPORTS_LIVE_ENDPOINT = "sports.worldCup.liveEndpoint";
const PREF_POLL_IDLE_MS = "widgets.sportsWidget.pollIdleMs";
const PREF_POLL_MATCH_DAY_MS = "widgets.sportsWidget.pollMatchDayMs";
const PREF_POLL_LIVE_MS = "widgets.sportsWidget.pollLiveMs";
const PREF_POLL_PREGAME_LEAD_MS = "widgets.sportsWidget.pollPregameLeadMs";
const PREF_CELEBRATIONS_WINDOW_MS =
  "widgets.sportsWidget.celebrations.windowMs";

const POLLING_STATE_IDLE = "IDLE";
const POLLING_STATE_MATCH_DAY = "MATCH_DAY";
const POLLING_STATE_LIVE = "LIVE";

// Exponential-backoff retry cap for failed live fetches.
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes
// Floor for any poll interval, to prevent a 0/negative pref or trainhopConfig
// value from producing a tight network loop. Pregame lead allows 0 (= disabled)
// but no negatives.
const MIN_POLL_INTERVAL_MS = 10000; // 10 seconds
// Capping the time between /live refreshes to 15 seconds.
// The button will also be disabled for this duration on the client side
// but enforcing the cap here keeps a user from spamming from the endpoint regardless of UI state.
const MIN_MANUAL_REFRESH_MS = 15000; // 15 seconds
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Manages persistent state for the Sports widget (selected teams and widget
 * state), syncing with PersistentCache so state survives page refreshes.
 * Also fetches teams and match data from the Merino WCS endpoints.
 */
export class SportsFeed {
  constructor() {
    this.initialized = false;
    this.cache = this.PersistentCache(CACHE_KEY, true);
    this.merino = this.MerinoClient(MERINO_CLIENT_KEY);

    // Adaptive live-polling state. visibleTabs is the set of port IDs that
    // currently have the widget on-screen in an active (foreground) tab.
    // Visibility is the sole driver of polling: the loop runs iff this set
    // is non-empty. Tracked per-port so one tab going hidden doesn't pause
    // polling while another still has the widget visible.
    this.pollTimer = null;
    this.retryTimer = null;
    this.retryCount = 0;
    this.pollingState = POLLING_STATE_IDLE;
    this.visibleTabs = new Set();
    this.lastLiveUpdated = null;
    this.nextKickoffDeltaMs = null;
    // Reentrancy guard: stops a second tick() from racing the first when
    // fetchNow() is called back-to-back (e.g. a WIDGETS_SPORTS_LIVE_VISIBLE
    // arriving while the resume tick is still awaiting its fetch).
    this.ticking = false;
  }

  // Resolve the Sports widget's trainhop overrides into a flat object keyed by
  // bare dimension. The canonical source is `trainhopConfig.widgets`, where
  // every widget's overrides live as flat keys prefixed with the widget id
  // (e.g. `sportsWidgetLiveEnabled`) — the same convention used by enabled/size
  // in WidgetsRegistry. `trainhopConfig.sports.*` is the legacy nested alias
  // kept for backwards-compat with in-flight Nimbus enrollments. Canonical wins
  // per-key, legacy fills the gaps.
  _trainhopSports(prefs) {
    const widgets = prefs?.trainhopConfig?.widgets ?? {};
    const legacy = prefs?.trainhopConfig?.sports ?? {};
    return {
      enabled: widgets.sportsWidgetEnabled ?? legacy.enabled,
      liveEnabled: widgets.sportsWidgetLiveEnabled ?? legacy.liveEnabled,
      teamsEndpoint: widgets.sportsWidgetTeamsEndpoint ?? legacy.teamsEndpoint,
      matchesEndpoint:
        widgets.sportsWidgetMatchesEndpoint ?? legacy.matchesEndpoint,
      liveEndpoint: widgets.sportsWidgetLiveEndpoint ?? legacy.liveEndpoint,
      watchLiveEndpoint:
        widgets.sportsWidgetWatchLiveEndpoint ?? legacy.watchLiveEndpoint,
      pollLiveMs: widgets.sportsWidgetPollLiveMs ?? legacy.pollLiveMs,
      pollMatchDayMs:
        widgets.sportsWidgetPollMatchDayMs ?? legacy.pollMatchDayMs,
      pollIdleMs: widgets.sportsWidgetPollIdleMs ?? legacy.pollIdleMs,
      pollPregameLeadMs:
        widgets.sportsWidgetPollPregameLeadMs ?? legacy.pollPregameLeadMs,
      celebrationsWindowMs:
        widgets.sportsWidgetCelebrationsWindowMs ?? legacy.celebrationsWindowMs,
    };
  }

  // Effective "recently ended" celebration window (trainhop > pref > default),
  // mirroring SportsWidget.jsx; the dedicated sportsCelebrations namespace wins.
  // Used as a floor for endedAt retention so a configured window longer than the
  // default retention floor doesn't get its stamps pruned before it expires.
  resolveCelebrationWindowMs() {
    const prefs = this.store.getState()?.Prefs.values ?? {};
    return (
      prefs.trainhopConfig?.sportsCelebrations?.windowMs ??
      this._trainhopSports(prefs).celebrationsWindowMs ??
      prefs[PREF_CELEBRATIONS_WINDOW_MS] ??
      DEFAULT_CELEBRATION_WINDOW_MS
    );
  }

  get enabled() {
    const prefs = this.store.getState()?.Prefs.values;
    const userValue = !!prefs?.[PREF_SPORTS_ENABLED];
    const systemValue = !!prefs?.[PREF_SYSTEM_SPORTS_ENABLED];
    const experimentValue = !!this._trainhopSports(prefs).enabled;
    return userValue && (systemValue || experimentValue);
  }

  // Live polling is a sub-feature of the Sports widget — the widget itself
  // must be enabled first. Tunable independently via raw pref or
  // trainhopConfig.widgets.sportsWidgetLiveEnabled (Nimbus rollout; legacy
  // trainhopConfig.sports.liveEnabled still honored).
  get liveEnabled() {
    if (!this.enabled) {
      return false;
    }
    const prefs = this.store.getState()?.Prefs.values;
    const userValue = !!prefs?.[PREF_SPORTS_LIVE_ENABLED];
    const experimentValue = !!this._trainhopSports(prefs).liveEnabled;
    return userValue || experimentValue;
  }

  async init() {
    this.initialized = true;
    await this.syncState();
    await this.fetchSportsData();
    if (this.liveEnabled) {
      // Compute the initial polling state from the data we just fetched
      // (the /live array tells us whether a game is in progress), but do NOT
      // arm a timer here. Polling always starts from the visibility path
      // (WIDGETS_SPORTS_LIVE_VISIBLE). Arming a timer here would make the
      // first VISIBLE see a pending pollTimer and skip its fetchNow, so the
      // first live update wouldn't land until a full interval later.
      this.updatePollingStateFromMatches();
    }
  }

  // Handle a click on a match row. Resolves the user's default search engine
  // (or default-private in a private window), builds a submission via
  // SearchUIUtils.loadSearch, navigates to it, and records SAP telemetry.
  // Using loadSearch (rather than a pre-computed href) handles POST-based
  // engines, private windows, and `BrowserSearchTelemetry.recordSearch` all
  // in one call.
  async openMatchSearch(action) {
    const { query, eventInfo } = action.data || {};
    const window = action._target?.window;
    if (!query || !window) {
      return;
    }
    try {
      await lazy.SearchUIUtils.loadSearch({
        window,
        searchText: query,
        // eventInfo is a plain object carrying the click modifiers/button so
        // whereToOpenLink can decide current-tab vs new-tab vs new-window.
        where: lazy.BrowserUtils.whereToOpenLink(eventInfo || null),
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
        sapSource: SEARCH_SAP_SOURCE,
      });
    } catch (e) {
      console.error("Sports widget failed to open match search", e);
    }
  }

  // On startup, read whatever was saved to disk and send it to the UI.
  async syncState() {
    const cachedData = (await this.cache.get()) || {};
    const {
      widgetState,
      selectedTeams,
      sportsData,
      matchesTab,
      followedOnly,
      liveIndex,
      celebrations,
    } = cachedData;
    const { teams, matches, live } = sportsData || {};

    if (celebrations) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_CELEBRATIONS,
          data: {
            endedAt: celebrations.endedAt || {},
            celebrated: celebrations.celebrated || [],
          },
        })
      );
    }

    if (widgetState) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_WIDGET_STATE,
          data: widgetState,
        })
      );
    }

    if (selectedTeams) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_SELECTED_TEAMS,
          data: selectedTeams,
        })
      );
    }

    if (matchesTab) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_MATCHES_TAB,
          data: matchesTab,
        })
      );
    }

    if (followedOnly) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_FOLLOWED_ONLY,
          data: followedOnly,
        })
      );
    }

    // Restore the live-pager position. Clamp against the cached live list so a
    // stale persisted index can't outlive its match — if the cached list has
    // shrunk or is empty, reset to 0.
    if (Number.isInteger(liveIndex)) {
      const liveCount = Array.isArray(live) ? live.length : 0;
      const clampedLiveIndex = liveCount
        ? Math.min(Math.max(liveIndex, 0), liveCount - 1)
        : 0;
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_LIVE_INDEX,
          data: clampedLiveIndex,
        })
      );
    }

    if (teams || matches || live) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_WIDGET_SET,
          data: {
            teams: teams ?? [],
            matches: matches ?? { previous: [], current: [], next: [] },
            live: live ?? [],
          },
        })
      );
    }
  }

  /**
   * Returns the first error_type for an endpoint that isn't allowlisted, or
   * null. Always checks teams first, then matches, then live.
   */
  getAllowlistError({
    teamsEndpoint,
    matchesEndpoint,
    liveEndpoint,
    allowedEndpoints,
  }) {
    const isAllowed = url =>
      allowedEndpoints.some(prefix => url.startsWith(prefix));
    if (teamsEndpoint && !isAllowed(teamsEndpoint)) {
      console.error(`Sports teams endpoint not in allowlist: ${teamsEndpoint}`);
      return "teams_endpoint_not_allowlisted";
    }
    if (matchesEndpoint && !isAllowed(matchesEndpoint)) {
      console.error(
        `Sports matches endpoint not in allowlist: ${matchesEndpoint}`
      );
      return "matches_endpoint_not_allowlisted";
    }
    if (liveEndpoint && !isAllowed(liveEndpoint)) {
      console.error(`Sports live endpoint not in allowlist: ${liveEndpoint}`);
      return "live_endpoint_not_allowlisted";
    }
    return null;
  }

  /**
   * Sends WIDGETS_SPORTS_WIDGET_SET. Error paths can report a fetchError
   * without having to repeat the empty teams/matches/live defaults.
   */
  broadcastSportsData({
    teams = [],
    matches = { previous: [], current: [], next: [] },
    live = [],
    fetchError = null,
  }) {
    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WIDGETS_SPORTS_WIDGET_SET,
        data: { teams, matches, live, fetchError },
      })
    );
  }

  // `live` lets a caller that already has a fresh /live payload (e.g. the
  // post-match resync from fetchAndDispatch) reuse it instead of triggering
  // a redundant /live fetch.
  async fetchSportsData({ live: prefetchedLive } = {}) {
    const prefs = this.store.getState()?.Prefs.values;
    const trainhop = this._trainhopSports(prefs);
    const teamsEndpoint =
      trainhop.teamsEndpoint || prefs?.["sports.worldCup.teamsEndpoint"];
    const matchesEndpoint =
      trainhop.matchesEndpoint || prefs?.["sports.worldCup.matchesEndpoint"];
    const liveEndpoint =
      trainhop.liveEndpoint || prefs?.["sports.worldCup.liveEndpoint"];

    const allowedEndpoints = (prefs?.["discoverystream.endpoints"] ?? "")
      .split(",")
      .map(item => item.trim())
      .filter(item => item);

    const allowlistError = this.getAllowlistError({
      teamsEndpoint,
      matchesEndpoint,
      liveEndpoint: prefetchedLive === undefined ? liveEndpoint : undefined,
      allowedEndpoints,
    });
    if (allowlistError) {
      this.broadcastSportsData({ fetchError: { error_type: allowlistError } });
      return;
    }

    const [teamsResult, matchesResult, liveResult] = await Promise.all([
      this.merino.fetchSportsTeams({
        source: "newtab",
        endpointUrl: teamsEndpoint,
      }),
      this.merino.fetchSportsMatches({
        source: "newtab",
        endpointUrl: matchesEndpoint,
      }),
      prefetchedLive !== undefined
        ? Promise.resolve({ data: prefetchedLive, error: null })
        : this.merino.fetchSportsLive({
            source: "newtab",
            endpointUrl: liveEndpoint,
          }),
    ]);

    const liveData = liveResult.data;
    const liveMatchesValid = Array.isArray(liveData?.matches);
    // The /live endpoint is meant to be pre-filtered to in-progress games,
    // but we re-filter against LIVE_STATUS_TYPES as a defensive guard so the
    // Now tab only ever surfaces actually-live matches. Keep the set in sync
    // with LIVE_STATUS_L10N_MAP in SportsMatchRow.jsx when new live
    // sub-statuses are introduced.
    const liveMatches = liveMatchesValid
      ? liveData.matches.filter(match =>
          LIVE_STATUS_TYPES.has(match?.status_type?.toLowerCase())
        )
      : [];

    // Report the first failure only. Order: teams, then matches, then live,
    // then a malformed live response.
    const fetchErrorType =
      (teamsResult.error && `teams_${teamsResult.error}`) ||
      (matchesResult.error && `matches_${matchesResult.error}`) ||
      (liveResult.error && `live_${liveResult.error}`) ||
      (liveData !== null && !liveMatchesValid && "live_malformed_response") ||
      null;

    const teams = teamsResult.data?.teams;
    const matches = matchesResult.data;

    if (teams || matches || liveData) {
      await this.cache.set("sportsData", {
        teams,
        matches,
        live: liveMatches,
      });
    }

    this.broadcastSportsData({
      teams: teams ?? [],
      matches: matches ?? { previous: [], current: [], next: [] },
      live: liveMatches,
      fetchError: fetchErrorType ? { error_type: fetchErrorType } : null,
    });

    // Re-clamp the persisted live-pager index against the freshly fetched
    // list. Live games come and go between fetches, so an index that was
    // valid against the previous list may now point past the end.
    const cached = (await this.cache.get()) || {};
    const cachedLiveIndex = Number.isInteger(cached.liveIndex)
      ? cached.liveIndex
      : 0;
    const clampedLiveIndex = liveMatches.length
      ? Math.min(Math.max(cachedLiveIndex, 0), liveMatches.length - 1)
      : 0;
    if (clampedLiveIndex !== cachedLiveIndex) {
      await this.cache.set("liveIndex", clampedLiveIndex);
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WIDGETS_SPORTS_SET_LIVE_INDEX,
          data: clampedLiveIndex,
        })
      );
    }
  }

  // End-of-match celebration bookkeeping, persisted so a celebration fires at
  // most once per match even across reloads. `endedAt` maps a just-ended
  // match's global_event_id to the ms it dropped out of /live; `celebrated`
  // lists ids that have already been shown.
  async getCelebrations() {
    const cached = (await this.cache.get()) || {};
    const celebrations = cached.celebrations || {};
    return {
      endedAt: celebrations.endedAt || {},
      celebrated: celebrations.celebrated || [],
    };
  }

  async setCelebrations(celebrations) {
    await this.cache.set("celebrations", celebrations);
    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WIDGETS_SPORTS_SET_CELEBRATIONS,
        data: celebrations,
      })
    );
  }

  // Stamps newly-ended matches with the current time (unless already recorded
  // or already celebrated) and prunes stale entries. Called when the live poll
  // shows matches that just dropped out of /live.
  async recordEndedMatches(endedIds) {
    if (!endedIds.length) {
      return;
    }
    const { endedAt, celebrated } = await this.getCelebrations();
    const celebratedSet = new Set(celebrated);
    const now = Date.now();
    // Never prune a stamp before its celebration window expires.
    const retentionMs = Math.max(
      this.resolveCelebrationWindowMs(),
      CELEBRATION_RETENTION_FLOOR_MS
    );
    const nextEndedAt = { ...endedAt };
    let changed = false;
    for (const id of endedIds) {
      if (
        id === null ||
        id === undefined ||
        celebratedSet.has(id) ||
        nextEndedAt[id] !== undefined
      ) {
        continue;
      }
      nextEndedAt[id] = now;
      changed = true;
    }
    for (const [id, ts] of Object.entries(nextEndedAt)) {
      if (now - ts > retentionMs) {
        delete nextEndedAt[id];
        changed = true;
      }
    }
    if (changed) {
      await this.setCelebrations({ endedAt: nextEndedAt, celebrated });
    }
  }

  async fetchWatchLive() {
    const prefs = this.store.getState()?.Prefs.values;
    const watchLiveEndpoint =
      this._trainhopSports(prefs).watchLiveEndpoint ||
      prefs?.["sports.worldCup.watchLiveEndpoint"];

    const allowedEndpoints = (prefs?.["discoverystream.endpoints"] ?? "")
      .split(",")
      .map(item => item.trim())
      .filter(item => item);

    if (
      watchLiveEndpoint &&
      !allowedEndpoints.some(prefix => watchLiveEndpoint.startsWith(prefix))
    ) {
      console.error(
        `Sports watch-live endpoint not in allowlist: ${watchLiveEndpoint}`
      );
      return;
    }

    const data = await this.merino.fetchWatchLive({
      source: "newtab",
      endpointUrl: watchLiveEndpoint,
      acceptLanguage: Services.locale.appLocaleAsBCP47,
    });

    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WIDGETS_SPORTS_WATCH_LIVE_SET,
        data,
      })
    );
  }

  // Write the current SportsWidget state to PersistentCache. Used by the
  // LIVE-tick path so live scores survive browser shutdown; fetchSportsData
  // caches directly from the fetched payload before dispatching.
  async persistSportsData() {
    const data = this.store.getState()?.SportsWidget?.data;
    if (data?.teams?.length || data?.matches || data?.live) {
      await this.cache.set("sportsData", {
        teams: data.teams,
        matches: data.matches,
        live: data.live,
      });
    }
  }

  // Resolve the next poll interval from trainhopConfig, then the raw pref
  // (whose PREFS_CONFIG default normally supplies the value), then a hard-coded
  // per-state default as a safety net if the pref is ever unset. Lets Nimbus
  // retune intervals without a ship. `raw` is always numeric here, so the
  // Math.max floor below can never produce NaN.
  resolvePollIntervalMs() {
    const prefs = this.store.getState()?.Prefs.values ?? {};
    const trainhop = this._trainhopSports(prefs);
    let raw;
    switch (this.pollingState) {
      case POLLING_STATE_LIVE:
        raw = trainhop.pollLiveMs ?? prefs[PREF_POLL_LIVE_MS] ?? 180000;
        break;
      case POLLING_STATE_MATCH_DAY:
        raw =
          trainhop.pollMatchDayMs ?? prefs[PREF_POLL_MATCH_DAY_MS] ?? 1800000;
        break;
      default:
        raw = trainhop.pollIdleMs ?? prefs[PREF_POLL_IDLE_MS] ?? 21600000;
    }
    return Math.max(MIN_POLL_INTERVAL_MS, raw);
  }

  resolvePregameLeadMs() {
    const prefs = this.store.getState()?.Prefs.values ?? {};
    const raw =
      this._trainhopSports(prefs).pollPregameLeadMs ??
      prefs[PREF_POLL_PREGAME_LEAD_MS] ??
      600000;
    return Math.max(0, raw);
  }

  // Fetch the /wcs/live endpoint. Returns the parsed response, or null on
  // disallowed endpoint / fetch error so the caller can arm a retry.
  async fetchLive() {
    const prefs = this.store.getState()?.Prefs.values;
    const liveEndpoint =
      this._trainhopSports(prefs).liveEndpoint ||
      prefs?.[PREF_SPORTS_LIVE_ENDPOINT];

    if (!liveEndpoint) {
      return null;
    }

    const allowedEndpoints = (prefs?.["discoverystream.endpoints"] ?? "")
      .split(",")
      .map(item => item.trim())
      .filter(item => item);

    if (!allowedEndpoints.some(prefix => liveEndpoint.startsWith(prefix))) {
      console.error(`Sports live endpoint not in allowlist: ${liveEndpoint}`);
      return null;
    }

    const result = await this.merino.fetchSportsLive({
      source: "newtab",
      endpointUrl: liveEndpoint,
    });
    return result.error ? null : result.data;
  }

  // Drive one polling step. In LIVE state hit /wcs/live and merge updates
  // into the current array. In IDLE / MATCH_DAY hit the matches endpoint
  // via fetchSportsData. On empty-live (post-match), do an immediate matches
  // resync to capture finals and the next kickoff.
  // Returns true on success, false if a retry is armed.
  async fetchAndDispatch() {
    if (this.pollingState === POLLING_STATE_LIVE) {
      const response = await this.fetchLive();
      if (response === null) {
        this.scheduleRetry();
        return false;
      }
      const liveEvents = Array.isArray(response.matches)
        ? response.matches
        : [];
      this.lastLiveUpdated = Date.now();

      // Detect matches that crossed the live boundary in EITHER direction
      // since the last poll:
      // - someEnded: was in data.live, no longer in /wcs/live → needs a
      //   matches resync to pull the final into matches.previous.
      // - someStarted: appears in /wcs/live but wasn't in data.live → its
      //   scheduled copy still sits in matches.next[] and needs to be removed.
      // Either case triggers a wholesale matches resync.
      const prevLive = this.store.getState()?.SportsWidget?.data?.live ?? [];
      const prevLiveIds = new Set(prevLive.map(ev => ev.global_event_id));
      const newLiveIds = new Set(liveEvents.map(ev => ev.global_event_id));
      const endedIds = [...prevLiveIds].filter(id => !newLiveIds.has(id));
      const someEnded = !!endedIds.length;
      const someStarted = [...newLiveIds].some(id => !prevLiveIds.has(id));

      // Stamp the just-ended matches so the content side can celebrate them
      // once, within the celebration window.
      await this.recordEndedMatches(endedIds);

      this.dispatchLive(liveEvents);
      if (!liveEvents.length || someEnded || someStarted) {
        // Resync: pulls definitive finals, removes new-live events from
        // next[], and refreshes the next kickoff. fetchSportsData persists
        // afterwards, so the cache write here would be redundant. Pass the
        // /live response we just fetched so fetchSportsData skips a second
        // /live call.
        await this.fetchSportsData({ live: response });
      } else {
        // Persist the merged live snapshot so a browser shutdown mid-game
        // doesn't lose the latest scores.
        await this.persistSportsData();
      }
      this.updatePollingStateFromMatches();
      this.retryCount = 0;
      return true;
    }
    // IDLE or MATCH_DAY — a missed tick here is harmless because of the
    // long intervals, so no retry/backoff on this branch.
    await this.fetchSportsData();
    this.updatePollingStateFromMatches();
    this.retryCount = 0;
    return true;
  }

  // Examine the schedule data in Redux state to choose the next polling
  // state. Called after a successful fetch (live or matches). Stashes the
  // delta to the next future kickoff on `this.nextKickoffDeltaMs` so
  // scheduleNext can clamp MATCH_DAY intervals against it.
  updatePollingStateFromMatches() {
    this.nextKickoffDeltaMs = null;
    const data = this.store.getState()?.SportsWidget?.data;
    if ((data?.live ?? []).length) {
      this.pollingState = POLLING_STATE_LIVE;
      return;
    }
    const matches = data?.matches;
    if (!matches) {
      this.pollingState = POLLING_STATE_IDLE;
      return;
    }
    // Backend ordering of matches.next is not guaranteed — pick the earliest
    // future kickoff rather than trusting next[0].
    const now = Date.now();
    const futureDeltas = (matches.next ?? [])
      .map(ev => (ev?.date ? new Date(ev.date).getTime() - now : NaN))
      .filter(delta => Number.isFinite(delta) && delta > 0);
    if (futureDeltas.length) {
      const delta = Math.min(...futureDeltas);
      this.nextKickoffDeltaMs = delta;
      if (delta <= this.resolvePregameLeadMs()) {
        this.pollingState = POLLING_STATE_LIVE;
        return;
      }
      if (delta <= MS_PER_DAY) {
        this.pollingState = POLLING_STATE_MATCH_DAY;
        return;
      }
    }
    this.pollingState = POLLING_STATE_IDLE;
  }

  // Periodic tick. Bails entirely (no rearm) when polling is paused —
  // live disabled, or no tab has the widget visible. Polling resumes from
  // WIDGETS_SPORTS_LIVE_VISIBLE or PREF_CHANGED. Rearming with nobody
  // observing would orphan a background wakeup loop with no way to recompute
  // state out of LIVE.
  async tick() {
    // Reentrancy: a second tick() while the first is still awaiting would
    // double-dispatch and race two scheduleNext writes.
    if (this.ticking) {
      return;
    }
    if (!this.liveEnabled || this.visibleTabs.size === 0) {
      return;
    }
    this.ticking = true;
    try {
      let ok;
      try {
        ok = await this.fetchAndDispatch();
      } catch (e) {
        // A throw from fetchSportsData (e.g. `new URL(matchesEndpoint)` with
        // a malformed URL) would otherwise kill the IDLE/MATCH_DAY branch
        // forever — that branch has no retry path of its own.
        console.error("Sports widget poll tick failed", e);
        this.scheduleRetry();
        return;
      }
      if (!ok) {
        // scheduleRetry already armed the retry timer; do not also arm a
        // normal poll timer or we'd double-fire.
        return;
      }
      // Re-check post-await: a PREF_CHANGED → stopLive() or a HIDDEN event
      // that ran during the fetch cleared liveEnabled/visibility, and we
      // must not resurrect polling by re-arming through scheduleNext().
      if (!this.liveEnabled || this.visibleTabs.size === 0) {
        return;
      }
      this.scheduleNext();
    } finally {
      this.ticking = false;
    }
  }

  scheduleNext() {
    this.clearTimeout(this.pollTimer);
    this.clearTimeout(this.retryTimer);
    this.retryTimer = null;
    // Null the ID inside the callback so `this.pollTimer` is a reliable
    // "a poll is still scheduled" signal — visibility resume logic depends
    // on this to avoid preempting an already-armed timer.
    this.pollTimer = this.setTimeout(() => {
      this.pollTimer = null;
      this.tick();
    }, this.computeNextDelayMs());
  }

  // Pick the actual setTimeout delay. In MATCH_DAY we'd otherwise miss the
  // LIVE-pregame transition by up to one full MATCH_DAY interval (default
  // 30 min) when the kickoff is closer than that; clamp to the moment
  // pregame escalation should kick in.
  computeNextDelayMs() {
    const base = this.resolvePollIntervalMs();
    if (
      this.pollingState === POLLING_STATE_MATCH_DAY &&
      this.nextKickoffDeltaMs !== null
    ) {
      const timeToPregame =
        this.nextKickoffDeltaMs - this.resolvePregameLeadMs();
      if (timeToPregame > 0) {
        return Math.max(MIN_POLL_INTERVAL_MS, Math.min(base, timeToPregame));
      }
    }
    return base;
  }

  scheduleRetry() {
    this.clearTimeout(this.pollTimer);
    this.clearTimeout(this.retryTimer);
    this.pollTimer = null;
    const delay = Math.min(1000 * 2 ** this.retryCount, MAX_RETRY_DELAY_MS);
    this.retryCount++;
    this.retryTimer = this.setTimeout(() => {
      this.retryTimer = null;
      this.tick();
    }, delay);
  }

  // Fetch immediately, cancelling any pending timers. Used when visibility
  // is restored mid-LIVE so users don't have to wait for the next tick.
  // Returns the tick promise so callers (and tests) can await completion.
  fetchNow() {
    this.clearTimeout(this.pollTimer);
    this.clearTimeout(this.retryTimer);
    this.pollTimer = null;
    this.retryTimer = null;
    return this.tick();
  }

  // Tear down live polling without affecting persistent-state behavior.
  stopLive() {
    this.clearTimeout(this.pollTimer);
    this.clearTimeout(this.retryTimer);
    this.pollTimer = null;
    this.retryTimer = null;
    this.retryCount = 0;
    this.pollingState = POLLING_STATE_IDLE;
  }

  dispatchLive(live) {
    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WIDGETS_SPORTS_LIVE_UPDATE,
        data: {
          live,
          lastLiveUpdated: this.lastLiveUpdated,
        },
      })
    );
  }

  async onPrefChangedAction(action) {
    const { name } = action.data;
    // First-time init when the widget turns on. init() itself will arm the
    // poll timer if liveEnabled, so we return early to avoid double-scheduling.
    if (
      (name === PREF_SPORTS_ENABLED ||
        name === PREF_SYSTEM_SPORTS_ENABLED ||
        name === "trainhopConfig") &&
      this.enabled &&
      !this.initialized
    ) {
      await this.init();
      return;
    }
    // Any pref that can affect liveEnabled or the next poll interval should
    // re-evaluate polling. This includes the parent widget prefs — toggling
    // the widget off then back on must restart polling, not leave it stopped.
    const POLL_RELATED_PREFS = [
      PREF_SPORTS_ENABLED,
      PREF_SYSTEM_SPORTS_ENABLED,
      PREF_SPORTS_LIVE_ENABLED,
      PREF_SPORTS_LIVE_ENDPOINT,
      PREF_POLL_IDLE_MS,
      PREF_POLL_MATCH_DAY_MS,
      PREF_POLL_LIVE_MS,
      PREF_POLL_PREGAME_LEAD_MS,
      "discoverystream.endpoints",
      "trainhopConfig",
    ];
    if (this.initialized && POLL_RELATED_PREFS.includes(name)) {
      if (this.liveEnabled) {
        // fetchNow (rather than just scheduleNext) so the resume path
        // recomputes the time-based polling state from fresh data —
        // stopLive() hard-set pollingState to IDLE, so a bare scheduleNext
        // here would arm a 6h timer even if a match is currently live.
        await this.fetchNow();
      } else {
        this.stopLive();
      }
    }
  }

  async onAction(action) {
    switch (action.type) {
      case at.INIT:
        if (this.enabled) {
          await this.init();
        }
        break;
      case at.PREF_CHANGED:
        await this.onPrefChangedAction(action);
        break;
      // ---------------------------------------------------------------------
      // How live polling decides when to fetch /live (during a live game)
      //
      // The rule is simple: we poll only while the widget is actually being
      // looked at. A tab counts as "looking" when the widget is on-screen in
      // the foreground tab. The content side already enforces this — it only
      // reports a tab visible when the widget is scrolled into view and the
      // tab is in front (isIntersecting && !document.hidden). We keep the set
      // of those tabs in `visibleTabs`. If the set is empty, we stop polling.
      // There is no timestamp or "last fetched" tracking — just this set and
      // the poll timer.
      //
      // What that means in practice:
      //  1. You open New Tab on a live game: the widget shows up, we fetch
      //     /live right away, and start the timer.
      //  2. The timer runs out while you're looking at it: we fetch /live
      //     again and restart the timer.
      //  3. You scroll the widget off-screen: we stop, but we leave the timer
      //     running. If it runs out while it's off-screen, we just skip that
      //     fetch. When you scroll back, we fetch again only if the timer
      //     already ran out; if it hasn't, we wait for it. (This is why
      //     quickly scrolling away and back does NOT fire extra requests.)
      //  4. Two tabs are open and a background tab has the widget on-screen:
      //     it does not count, because it isn't the active tab. Only the tab
      //     you're actually looking at drives a fetch.
      //  5. You open a new tab while the timer is still running: the new tab
      //     does not fetch on its own — it waits for the timer that's already
      //     going.
      // ---------------------------------------------------------------------

      // A tab going hidden, or closing, just drops its port. NEW_TAB_UNLOAD is
      // kept as a backstop because a closing tab won't reliably fire HIDDEN
      // before its content process tears down — without it the port would
      // linger in visibleTabs and tick() would keep fetching for a tab that no
      // longer exists.
      case at.NEW_TAB_UNLOAD:
      case at.WIDGETS_SPORTS_LIVE_HIDDEN: {
        const portId = au.getPortIdOfSender(action);
        if (portId) {
          this.visibleTabs.delete(portId);
        }
        // Deliberately do NOT clear pollTimer/retryTimer here. A pending
        // timer represents the remaining poll interval; keeping it alive is
        // what makes a quick scroll-off-and-back a no-op instead of an extra
        // /live fetch. When the timer fires with an empty visibleTabs, tick()
        // bails without rearming and the scheduleNext/scheduleRetry callbacks
        // null the handle, so a later VISIBLE resumes cleanly.
        break;
      }
      case at.WIDGETS_SPORTS_LIVE_VISIBLE: {
        const portId = au.getPortIdOfSender(action);
        if (portId) {
          this.visibleTabs.add(portId);
          // Resume polling only when it is actually paused. A pending timer
          // (or in-flight tick) means the current interval has not elapsed,
          // so we wait for it rather than firing an immediate /live — this
          // is what keeps scroll-off-and-back, and opening new tabs, from
          // issuing extra requests. The null-in-callback bookkeeping in
          // scheduleNext/scheduleRetry makes these handle checks reliable
          // after a timer has fired.
          if (
            this.liveEnabled &&
            !this.ticking &&
            !this.pollTimer &&
            !this.retryTimer
          ) {
            this.fetchNow();
          }
        }
        break;
      }
      // User clicked the refresh button on a live match row, this will pull data from the /live endpoint
      // while enforcing a hard-coded MIN_MANUAL_REFRESH_MS cap between successive manual fetches.
      case at.WIDGETS_SPORTS_LIVE_REFRESH: {
        if (
          !this.liveEnabled ||
          this.pollingState !== POLLING_STATE_LIVE ||
          this.ticking
        ) {
          break;
        }
        if (
          this.lastLiveUpdated !== null &&
          Date.now() - this.lastLiveUpdated < MIN_MANUAL_REFRESH_MS
        ) {
          break;
        }
        this.fetchNow();
        break;
      }
      // User clicked a match row — run a search for the match's `query` using
      // their default search engine via SearchUIUtils.loadSearch.
      case at.WIDGETS_SPORTS_OPEN_MATCH_SEARCH:
        await this.openMatchSearch(action);
        break;
      // User changed the widget state — save it and send the updated state to the UI.
      case at.WIDGETS_SPORTS_CHANGE_WIDGET_STATE:
        if (action.data !== FOLLOW_STATE) {
          await this.cache.set("widgetState", action.data);
        }
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.WIDGETS_SPORTS_SET_WIDGET_STATE,
            data: action.data,
          })
        );
        break;
      // User changed their team selection — save it and send the updated list to the UI.
      case at.WIDGETS_SPORTS_CHANGE_SELECTED_TEAMS:
        await this.cache.set("selectedTeams", action.data);
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.WIDGETS_SPORTS_SET_SELECTED_TEAMS,
            data: action.data,
          })
        );
        break;
      // User changed the matches tab — save it and broadcast to the UI.
      case at.WIDGETS_SPORTS_CHANGE_MATCHES_TAB:
        await this.cache.set("matchesTab", action.data);
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.WIDGETS_SPORTS_SET_MATCHES_TAB,
            data: action.data,
          })
        );
        break;
      // User paged to a different live match in the Now tab — clamp the
      // index against the current live list, persist it, and broadcast.
      case at.WIDGETS_SPORTS_CHANGE_LIVE_INDEX: {
        const state = this.store.getState()?.SportsWidget;
        const liveCount = Array.isArray(state?.data?.live)
          ? state.data.live.length
          : 0;
        const requested = Number.isInteger(action.data) ? action.data : 0;
        const nextIndex = liveCount
          ? Math.min(Math.max(requested, 0), liveCount - 1)
          : 0;
        await this.cache.set("liveIndex", nextIndex);
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.WIDGETS_SPORTS_SET_LIVE_INDEX,
            data: nextIndex,
          })
        );
        break;
      }
      // User toggled the "Only followed teams" filter for a tab — merge into
      // the existing followedOnly object and persist.
      case at.WIDGETS_SPORTS_CHANGE_FOLLOWED_ONLY: {
        const cached = (await this.cache.get()) || {};
        const merged = { ...(cached.followedOnly || {}), ...action.data };
        await this.cache.set("followedOnly", merged);
        this.store.dispatch(
          ac.BroadcastToContent({
            type: at.WIDGETS_SPORTS_SET_FOLLOWED_ONLY,
            data: action.data,
          })
        );
        break;
      }
      // Content fired a celebration for a match — record it so it never fires
      // again (across reloads/tabs) and drop its pending endedAt stamp.
      case at.WIDGETS_SPORTS_MARK_CELEBRATED: {
        const id = action.data;
        const { endedAt, celebrated } = await this.getCelebrations();
        if (id === null || id === undefined || celebrated.includes(id)) {
          break;
        }
        const nextEndedAt = { ...endedAt };
        delete nextEndedAt[id];
        await this.setCelebrations({
          endedAt: nextEndedAt,
          celebrated: [...celebrated, id].slice(-MAX_CELEBRATED_IDS),
        });
        break;
      }
      case at.WIDGETS_SPORTS_WATCH_LIVE_REQUEST:
        await this.fetchWatchLive();
        break;
    }
  }
}

SportsFeed.prototype.PersistentCache = (...args) => {
  return new lazy.PersistentCache(...args);
};

SportsFeed.prototype.MerinoClient = name => {
  return new lazy.TemporaryMerinoClientShim(name);
};

// Attached to the prototype so tests can stub them.
SportsFeed.prototype.setTimeout = (...args) => lazy.setTimeout(...args);
SportsFeed.prototype.clearTimeout = (...args) => lazy.clearTimeout(...args);
