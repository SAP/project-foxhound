/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests sports suggestions.

ChromeUtils.defineESModuleGetters(this, {
  SportsSuggestions:
    "moz-src:///browser/components/urlbar/private/SportsSuggestions.sys.mjs",
});

// Trying to avoid timeouts in TV mode, especially on debug Mac.
requestLongerTimeout(3);

// 2025-10-30 - game status is "past", without icon
const SUGGESTION_VALUE_PAST = {
  sport: "Sport 1",
  query: "query 1",
  date: "2025-10-30T17:00:00Z",
  home_team: {
    name: "Team 1 Home",
    score: 5,
  },
  away_team: {
    name: "Team 1 Away",
    score: 4,
  },
  status_type: "past",
};

// 2025-10-30 - game status is "past", with icon
const SUGGESTION_VALUE_PAST_ICON = {
  ...SUGGESTION_VALUE_PAST,
  icon: "https://example.com/sports-icon",
};

// 2025-10-30 - game status is "past", without scores
const SUGGESTION_VALUE_PAST_NO_SCORES = {
  ...SUGGESTION_VALUE_PAST,
  home_team: {
    name: "Team 1 Home",
  },
  away_team: {
    name: "Team 1 Away",
  },
};

// 2025-10-31 - game status is "live", without icon
const SUGGESTION_VALUE_LIVE = {
  sport: "Sport 2",
  query: "query 2",
  date: "2025-10-31T17:00:00Z",
  home_team: {
    name: "Team 2 Home",
    score: 1,
  },
  away_team: {
    name: "Team 2 Away",
    score: 0,
  },
  status_type: "live",
};

// 2025-10-31 - game status is "live", with icon
const SUGGESTION_VALUE_LIVE_ICON = {
  ...SUGGESTION_VALUE_LIVE,
  icon: "https://example.com/sports-icon",
};

// 2025-10-31 - game status is "live", without scores
const SUGGESTION_VALUE_LIVE_NO_SCORES = {
  ...SUGGESTION_VALUE_LIVE,
  home_team: {
    name: "Team 2 Home",
  },
  away_team: {
    name: "Team 2 Away",
  },
};

// 2025-11-01 - game status is "scheduled", without icon
const SUGGESTION_VALUE_SCHEDULED = {
  sport: "Sport 3",
  query: "query 3",
  date: "2025-11-01T17:00:00Z",
  home_team: {
    name: "Team 3 Home",
    score: null,
  },
  away_team: {
    name: "Team 3 Away",
    score: null,
  },
  status_type: "scheduled",
};

// 2025-11-01 - game status is "scheduled", with icon
const SUGGESTION_VALUE_SCHEDULED_ICON = {
  ...SUGGESTION_VALUE_SCHEDULED,
  icon: "https://example.com/sports-icon",
};

// 2025-11-01 - game status is "scheduled", with icons in the team objects
const SUGGESTION_VALUE_SCHEDULED_ICONS_IN_TEAMS = {
  ...SUGGESTION_VALUE_SCHEDULED,
  home_team: {
    name: "Team 3 Home",
    score: null,
    icon: "https://example.com/sports-icon-home",
  },
  away_team: {
    name: "Team 3 Away",
    score: null,
    icon: "https://example.com/sports-icon-away",
  },
};

// NBA game (basketball), live
const SUGGESTION_VALUE_NBA_LIVE = {
  ...SUGGESTION_VALUE_LIVE,
  sport: "NBA",
};

// NBA game (basketball), scheduled
const SUGGESTION_VALUE_NBA_SCHEDULED = {
  ...SUGGESTION_VALUE_SCHEDULED,
  sport: "NBA",
};

// NFL game (American football), live
const SUGGESTION_VALUE_NFL_LIVE = {
  ...SUGGESTION_VALUE_LIVE,
  sport: "NFL",
};

// NFL game (American football), scheduled
const SUGGESTION_VALUE_NFL_SCHEDULED = {
  ...SUGGESTION_VALUE_SCHEDULED,
  sport: "NFL",
};

// NHL game (hockey), live
const SUGGESTION_VALUE_NHL_LIVE = {
  ...SUGGESTION_VALUE_LIVE,
  sport: "NHL",
};

// NHL game (hockey), scheduled
const SUGGESTION_VALUE_NHL_SCHEDULED = {
  ...SUGGESTION_VALUE_SCHEDULED,
  sport: "NHL",
};

add_setup(async function () {
  await SearchTestUtils.installSearchExtension({}, { setAsDefault: true });
  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });

  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    merinoSuggestions: merinoSuggestions([SUGGESTION_VALUE_PAST]),
    prefs: [
      ["sports.featureGate", true],
      ["suggest.sports", true],
      ["suggest.quicksuggest.all", true],
    ],
  });

  registerCleanupFunction(() => {
    setNow(null);
  });
});

add_task(async function manyItems() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([
      // games with unknown sports -- should use date chiclet
      SUGGESTION_VALUE_PAST,
      SUGGESTION_VALUE_LIVE,
      SUGGESTION_VALUE_SCHEDULED,
      // live games with known sports -- should use generic sports icons
      SUGGESTION_VALUE_NBA_LIVE,
      SUGGESTION_VALUE_NFL_LIVE,
      SUGGESTION_VALUE_NHL_LIVE,
      // scheduled games with known sports -- should use date chiclet
      SUGGESTION_VALUE_NBA_SCHEDULED,
      SUGGESTION_VALUE_NFL_SCHEDULED,
      SUGGESTION_VALUE_NHL_SCHEDULED,
    ]),
    expectedItems: [
      // games with unknown sports -- should use date chiclet
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Yesterday",
        status: "",
      },
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },

      // live games with known sports -- should use generic sports icons
      {
        item: {
          attributes: {
            sport: "NBA",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
          backgroundImage:
            'url("chrome://browser/skin/urlbar/sports-basketball.svg")',
        },
        "scheduled-date-chiclet-day": {
          isHidden: true,
        },
        "scheduled-date-chiclet-month": {
          isHidden: true,
        },
        "sport-name": "NBA",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
      {
        item: {
          attributes: {
            sport: "NFL",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
          backgroundImage:
            'url("chrome://browser/skin/urlbar/sports-american-football.svg")',
        },
        "scheduled-date-chiclet-day": {
          isHidden: true,
        },
        "scheduled-date-chiclet-month": {
          isHidden: true,
        },
        "sport-name": "NFL",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
      {
        item: {
          attributes: {
            sport: "NHL",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
          backgroundImage:
            'url("chrome://browser/skin/urlbar/sports-hockey.svg")',
        },
        "scheduled-date-chiclet-day": {
          isHidden: true,
        },
        "scheduled-date-chiclet-month": {
          isHidden: true,
        },
        "sport-name": "NHL",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },

      // scheduled games with known sports -- should use date chiclet
      {
        item: {
          attributes: {
            sport: "NBA",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "NBA",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
      {
        item: {
          attributes: {
            sport: "NFL",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "NFL",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
      {
        item: {
          attributes: {
            sport: "NHL",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "NHL",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

add_task(async function past_noScores() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST_NO_SCORES]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        // should use "team-names" UI, not scores
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 1 Home",
              awayTeam: "Team 1 Away",
            },
          },
        },
        date: "Yesterday",
        status: "",
      },
    ],
  });
});

add_task(async function live_noScores() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_NO_SCORES]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        // should use "team-names" UI, not scores
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 2 Home",
              awayTeam: "Team 2 Away",
            },
          },
        },
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

add_task(async function scheduled_iconsInTeams() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICONS_IN_TEAMS]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        // home team icon should be used
        image: {
          attributes: {
            src: "https://example.com/sports-icon-home",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

///////////////////////////////////////////////////////////////////////////////
//
// Games with "past" status

add_task(async function past_lastYear_noIcon() {
  await doTest({
    now: "2026-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Oct 30, 2025",
        status: "",
      },
    ],
  });
});

add_task(async function past_lastYear_icon() {
  await doTest({
    now: "2026-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Oct 30, 2025",
        status: "",
      },
    ],
  });
});

add_task(async function past_beforeYesterday_noIcon() {
  await doTest({
    now: "2025-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Oct 30",
        status: "",
      },
    ],
  });
});

add_task(async function past_beforeYesterday_icon() {
  await doTest({
    now: "2025-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Oct 30",
        status: "",
      },
    ],
  });
});

add_task(async function past_yesterday_noIcon() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Yesterday",
        status: "",
      },
    ],
  });
});

add_task(async function past_yesterday_icon() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Yesterday",
        status: "",
      },
    ],
  });
});

add_task(async function past_todayPast_noIcon() {
  await doTest({
    now: "2025-10-30T22:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-final",
          },
        },
      },
    ],
  });
});

add_task(async function past_todayPast_icon() {
  await doTest({
    now: "2025-10-30T22:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-final",
          },
        },
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function past_todayFuture_noIcon() {
  await doTest({
    now: "2025-10-30T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "30",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-final",
          },
        },
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function past_todayFuture_icon() {
  await doTest({
    now: "2025-10-30T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_PAST_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 1",
            status: "past",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 1",
        "home-team-name": "Team 1 Home",
        "home-team-score": "5",
        "away-team-name": "Team 1 Away",
        "away-team-score": "4",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-final",
          },
        },
      },
    ],
  });
});

///////////////////////////////////////////////////////////////////////////////
//
// Games with "live" status

// This probably shouldn't happen but it could, especially if the game is in a
// different time zone from the user and/or happening around the new year.
add_task(async function live_lastYear_noIcon() {
  await doTest({
    now: "2026-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Oct 31, 2025",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This probably shouldn't happen but it could, especially if the game is in a
// different time zone from the user and/or happening around the new year.
add_task(async function live_lastYear_icon() {
  await doTest({
    now: "2026-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Oct 31, 2025",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This probably shouldn't happen but technically it could.
add_task(async function live_beforeYesterday_noIcon() {
  await doTest({
    now: "2025-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Oct 31",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This probably shouldn't happen but technically it could.
add_task(async function live_beforeYesterday_icon() {
  await doTest({
    now: "2025-12-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Oct 31",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This probably shouldn't happen but it could, especially if the game is in a
// different time zone from the user.
add_task(async function live_yesterday_noIcon() {
  await doTest({
    now: "2025-11-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Yesterday",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This probably shouldn't happen but it could, especially if the game is in a
// different time zone from the user.
add_task(async function live_yesterday_icon() {
  await doTest({
    now: "2025-11-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Yesterday",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

add_task(async function live_todayPast_noIcon() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

add_task(async function live_todayPast_icon() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function live_todayFuture_noIcon() {
  await doTest({
    now: "2025-10-31T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function live_todayFuture_icon() {
  await doTest({
    now: "2025-10-31T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Today",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function live_tomorrow_noIcon() {
  await doTest({
    now: "2025-10-30T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "31",
        "scheduled-date-chiclet-month": "Oct",
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Tomorrow",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function live_tomorrow_icon() {
  await doTest({
    now: "2025-10-30T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_LIVE_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 2",
            status: "live",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 2",
        "home-team-name": "Team 2 Home",
        "home-team-score": "1",
        "away-team-name": "Team 2 Away",
        "away-team-score": "0",
        date: "Tomorrow",
        status: {
          l10n: {
            id: "urlbar-result-sports-status-live",
          },
        },
      },
    ],
  });
});

///////////////////////////////

// Games with "scheduled" status

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_lastYear_noIcon() {
  await doTest({
    now: "2026-12-01T12:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Nov 1, 2025",
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_lastYear_icon() {
  await doTest({
    now: "2026-12-01T12:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Nov 1, 2025",
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_beforeYesterday_noIcon() {
  await doTest({
    now: "2025-12-01T12:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Nov 1",
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_beforeYesterday_icon() {
  await doTest({
    now: "2025-12-01T12:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Nov 1",
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_yesterday_noIcon() {
  await doTest({
    now: "2025-11-02T12:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Yesterday",
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_yesterday_icon() {
  await doTest({
    now: "2025-11-02T12:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Yesterday",
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_todayPast_noIcon() {
  await doTest({
    now: "2025-11-01T22:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Today",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

// This shouldn't normally happen but technically it could.
add_task(async function scheduled_todayPast_icon() {
  await doTest({
    now: "2025-11-01T22:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Today",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_todayFuture_noIcon() {
  await doTest({
    now: "2025-11-01T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Today",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_todayFuture_icon() {
  await doTest({
    now: "2025-11-01T09:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Today",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_tomorrow_noIcon() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_tomorrow_icon() {
  await doTest({
    now: "2025-10-31T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: {
          l10n: {
            id: "urlbar-result-sports-game-date-with-time",
            args: {
              date: "Tomorrow",
              time: "1:00 PM GMT-4",
            },
          },
        },
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_afterTomorrow_noIcon() {
  await doTest({
    now: [
      // date is same year
      "2025-10-01T14:00:00-04:00[-04:00]",
      // date is next year, UI should be the same
      "2024-10-01T14:00:00-04:00[-04:00]",
    ],
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image: null,
        image_container: {
          attributes: {
            "is-fallback": "",
          },
        },
        "scheduled-date-chiclet-day": "1",
        "scheduled-date-chiclet-month": "Nov",
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        date: "Sat at 1:00 PM GMT-4",
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_afterTomorrow_icon_thisYear() {
  await doTest({
    // date and `now` are the same year
    now: "2025-10-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        // should not include year
        date: "Sat, Nov 1 at 1:00 PM GMT-4",
        status: "",
      },
    ],
  });
});

add_task(async function scheduled_afterTomorrow_icon_nextYear() {
  await doTest({
    // date is the year after `now`
    now: "2024-10-01T14:00:00-04:00[-04:00]",
    suggestions: merinoSuggestions([SUGGESTION_VALUE_SCHEDULED_ICON]),
    expectedItems: [
      {
        item: {
          attributes: {
            sport: "Sport 3",
            status: "scheduled",
          },
        },
        image_container: {
          attributes: {
            "is-fallback": null,
          },
        },
        "scheduled-date-chiclet-day": null,
        "scheduled-date-chiclet-month": null,
        image: {
          attributes: {
            src: "https://example.com/sports-icon",
          },
        },
        "sport-name": "Sport 3",
        "team-names": {
          l10n: {
            id: "urlbar-result-sports-team-names",
            args: {
              homeTeam: "Team 3 Home",
              awayTeam: "Team 3 Away",
            },
          },
        },
        // should include year
        date: "Sat, Nov 1, 2025 at 1:00 PM GMT-4",
        status: "",
      },
    ],
  });
});

async function doTest({ now, suggestions, expectedItems }) {
  let nows = Array.isArray(now) ? now : [now];

  MerinoTestUtils.server.response.body.suggestions = suggestions;

  for (let n of nows) {
    info("Testing with `now`: " + n);
    setNow(n);
    await doOneTest({ expectedItems });
  }
}

async function doOneTest({ expectedItems }) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "only match the Merino suggestion",
  });

  let {
    result,
    element: { row },
  } = await UrlbarTestUtils.getDetailsOfResultAt(window, 1);

  // Make sure the row is a sports suggestion.
  Assert.equal(
    result.providerName,
    "UrlbarProviderQuickSuggest",
    "Row should be a Suggest result"
  );
  Assert.equal(
    result.payload.provider,
    "sports",
    "Row should be a sports result"
  );

  if (expectedItems.length > 1) {
    Assert.deepEqual(
      document.l10n.getAttributes(row._content),
      {
        id: "urlbar-result-aria-group-sports",
        args: null,
      },
      "ARIA group label should be set on the row inner"
    );
  } else {
    Assert.deepEqual(
      document.l10n.getAttributes(row._content),
      {
        id: null,
        args: null,
      },
      "ARIA group label should not be set on the row inner"
    );
  }

  // Check each realtime item in the row.
  for (let i = 0; i < expectedItems.length; i++) {
    let expectedItem = expectedItems[i];

    // Check each expected child element in the item.
    for (let [childNamePrefix, expectedValue] of Object.entries(expectedItem)) {
      let sep = ["item", "image", "image_container"].includes(childNamePrefix)
        ? "_"
        : "-";
      let childName = `${childNamePrefix}${sep}${i}`;
      let child = row.querySelector(`[name=${childName}]`);

      if (expectedValue === null) {
        Assert.ok(!child, "Child element should not exist: " + childName);
        continue;
      }

      Assert.ok(child, "Expected child element should exist: " + childName);

      let backgroundImage = "none";
      let isHidden = false;
      let attributes = {};
      if (typeof expectedValue == "object") {
        backgroundImage = expectedValue.backgroundImage || backgroundImage;
        isHidden = !!expectedValue.isHidden || isHidden;
        attributes = expectedValue.attributes || attributes;
      }

      // background image
      Assert.equal(
        window.getComputedStyle(child).backgroundImage,
        backgroundImage,
        "Child element should have expected background-image: " + childName
      );

      // is hidden
      Assert.equal(
        BrowserTestUtils.isVisible(child),
        !isHidden,
        "Child element should be visible as expected: " + childName
      );

      // attributes
      for (let [attr, value] of Object.entries(attributes)) {
        if (value === null) {
          Assert.ok(
            !child.hasAttribute(attr),
            "Child element should not have attribute: " +
              JSON.stringify({ childName, attr })
          );
        } else {
          Assert.ok(
            child.hasAttribute(attr),
            "Child element should have expected attribute: " +
              JSON.stringify({ childName, attr })
          );
          Assert.equal(
            child.getAttribute(attr),
            value,
            "Child element attribute should have expected value: " +
              JSON.stringify({ childName, attr })
          );
        }
      }

      // textContent or l10n
      if (typeof expectedValue == "string") {
        Assert.equal(
          child.textContent,
          expectedValue,
          "Child element should have expected textContent: " + childName
        );
      } else if (expectedValue.l10n) {
        Assert.equal(
          child.dataset.l10nId,
          expectedValue.l10n.id,
          "Child element should have expected l10nId: " + childName
        );
        if (expectedValue.l10n.args) {
          Assert.deepEqual(
            JSON.parse(child.dataset.l10nArgs),
            expectedValue.l10n.args,
            "Child element should have expected l10nArgs: " + childName
          );
        } else {
          Assert.ok(
            !child.dataset.l10nArgs,
            "Child element shouldn't have any l10nArgs: " + childName
          );
        }
      }
    }
  }

  await UrlbarTestUtils.promisePopupClose(window);
  gURLBar.handleRevert();
}

let gSandbox;
let gDateStub;

function setNow(dateStr) {
  if (!dateStr) {
    gSandbox?.restore();
    return;
  }

  let global = Cu.getGlobalForObject(SportsSuggestions);
  if (!gSandbox) {
    gSandbox = sinon.createSandbox();
    gDateStub = gSandbox.stub(SportsSuggestions, "_zonedDateTimeISO");
  }
  gDateStub.returns(global.Temporal.ZonedDateTime.from(dateStr));
}

function merinoSuggestions(values) {
  return [
    {
      provider: "sports",
      is_sponsored: false,
      score: 0.2,
      title: "",
      custom_details: {
        sports: {
          values,
        },
      },
    },
  ];
}
