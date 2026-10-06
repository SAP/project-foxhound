/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const {
  worldCupMatches,
  worldCupLive,
  toolsConfig,
  TOOLS,
  WORLD_CUP_MATCHES,
  WORLD_CUP_LIVE,
  WORLD_CUP_PREF,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

const ENDPOINT_PREF = "browser.smartwindow.worldcup.endpointURL";
const TIMEOUT_PREF = "browser.smartwindow.worldcup.timeoutMs";

function fakeMatch(home, away, score) {
  return {
    date: "2026-06-15",
    global_event_id: 12345,
    home_team: {
      key: home,
      global_team_id: 1,
      name: home,
      region: "South America",
      colors: ["#009C3B"],
      icon_url: "https://example.com/flag.png",
      eliminated: false,
    },
    away_team: {
      key: away,
      global_team_id: 2,
      name: away,
      region: "South America",
      colors: ["#FCD116"],
      icon_url: "https://example.com/flag.png",
      eliminated: false,
    },
    period: "FT",
    home_score: score[0],
    away_score: score[1],
    home_extra: 0,
    away_extra: 0,
    home_penalty: 0,
    away_penalty: 0,
    clock: "90:00",
    updated: 1718481600,
    status: "Final",
    status_type: "final",
    query: `${home} vs ${away}`,
    sport: "soccer",
  };
}

let server;
let lastRequest;
// Test-controlled response mode for /matches: "ok" or "500".
let matchesMode = "ok";

add_setup(async function () {
  server = new HttpServer();

  server.registerPathHandler("/api/v1/wcs/matches", (request, response) => {
    lastRequest = { path: request.path, query: request.queryString };
    if (matchesMode === "500") {
      response.setStatusLine(request.httpVersion, 500, "Internal Server Error");
      response.write("kaboom");
      return;
    }
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "application/json", false);
    response.write(
      JSON.stringify({
        previous: [fakeMatch("BRA", "COL", [3, 1])],
        current: [fakeMatch("ARG", "ALG", [3, 0])],
        next: [fakeMatch("MEX", "AUS", [1, 2])],
      })
    );
  });

  server.registerPathHandler("/api/v1/wcs/live", (request, response) => {
    lastRequest = { path: request.path, query: request.queryString };
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Content-Type", "application/json", false);
    response.write(
      JSON.stringify({
        matches: [{ ...fakeMatch("BRA", "ARG", [1, 1]), status_type: "live" }],
      })
    );
  });

  server.start(-1);
  const port = server.identity.primaryPort;
  Services.prefs.setStringPref(ENDPOINT_PREF, `http://localhost:${port}`);
  Services.prefs.setIntPref(TIMEOUT_PREF, 5000);

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref(ENDPOINT_PREF);
    Services.prefs.clearUserPref(TIMEOUT_PREF);
    Services.prefs.clearUserPref(WORLD_CUP_PREF);
    await new Promise(r => server.stop(r));
  });
});

add_task(async function test_world_cup_tools_registered() {
  Assert.ok(
    TOOLS.includes(WORLD_CUP_MATCHES),
    "TOOLS array contains world_cup_matches"
  );
  Assert.ok(
    TOOLS.includes(WORLD_CUP_LIVE),
    "TOOLS array contains world_cup_live"
  );
  const names = toolsConfig.map(t => t.function.name);
  Assert.ok(names.includes(WORLD_CUP_MATCHES), "schema present");
  Assert.ok(names.includes(WORLD_CUP_LIVE), "schema present");
});

add_task(async function test_worldCupMatches_shape_and_trimming() {
  matchesMode = "ok";
  const conversation = makeConversation();
  const result = await worldCupMatches(
    { date: "2026-06-15", teams: "BRA,ARG", limit: 10 },
    conversation
  );

  Assert.ok(Array.isArray(result.previous), "previous bucket present");
  Assert.ok(Array.isArray(result.current), "current bucket present");
  Assert.ok(Array.isArray(result.next), "next bucket present");
  Assert.equal(result.current.length, 1, "one current match");

  const team = result.current[0].home_team;
  Assert.equal(team.key, "ARG", "team key preserved");
  Assert.equal(team.name, "ARG", "team name preserved");
  Assert.ok(!("icon_url" in team), "icon_url stripped from team");
  Assert.ok(!("colors" in team), "colors stripped from team");
  Assert.equal(typeof result.current[0].home_score, "number", "score kept");

  Assert.ok(
    lastRequest.query.includes("date=2026-06-15"),
    `date query param forwarded: ${lastRequest.query}`
  );
  Assert.ok(
    lastRequest.query.includes("teams=BRA%2CARG"),
    `teams query param forwarded: ${lastRequest.query}`
  );
  Assert.ok(
    lastRequest.query.includes("limit=10"),
    `limit forwarded: ${lastRequest.query}`
  );

  conversation.securityProperties.commit();
  Assert.equal(
    conversation.securityProperties.untrustedInput,
    true,
    "untrusted_input set"
  );
});

add_task(async function test_worldCupMatches_omits_empty_params() {
  matchesMode = "ok";
  lastRequest = null;
  const conversation = makeConversation();
  await worldCupMatches({}, conversation);
  Assert.equal(lastRequest.query, "", "no query params when none provided");
});

add_task(async function test_worldCupLive_shape() {
  const conversation = makeConversation();
  const result = await worldCupLive({ teams: "BRA" }, conversation);
  Assert.ok(Array.isArray(result.matches), "matches array present");
  Assert.equal(result.matches.length, 1, "one live match");
  Assert.ok(!("icon_url" in result.matches[0].home_team), "icon_url stripped");
});

add_task(async function test_worldCupMatches_returns_error_on_http_failure() {
  matchesMode = "500";
  const conversation = makeConversation();
  const result = await worldCupMatches({}, conversation);
  Assert.ok(result.error, "returns error object on HTTP 500");
  Assert.ok(
    result.error.includes("HTTP 500"),
    `error message mentions status: ${result.error}`
  );
  matchesMode = "ok";
});

add_task(async function test_worldCupMatches_returns_error_on_unreachable() {
  Services.prefs.setStringPref(ENDPOINT_PREF, "http://localhost:1"); // refused
  Services.prefs.setIntPref(TIMEOUT_PREF, 250);

  const conversation = makeConversation();
  const result = await worldCupMatches({}, conversation);
  Assert.ok(result.error, "returns error object on connection failure");

  Services.prefs.setStringPref(
    ENDPOINT_PREF,
    `http://localhost:${server.identity.primaryPort}`
  );
  Services.prefs.setIntPref(TIMEOUT_PREF, 5000);
});
