/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests the gating for `SuggestBackendMerino.query`.
 */

"use strict";

const { UrlUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/UrlUtils.sys.mjs"
);

const SUGGESTION = "selected suggestion";

let backend;

add_setup(async () => {
  await MerinoTestUtils.server.start();
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    prefs: [
      ["quicksuggest.online.available", true],
      ["quicksuggest.online.enabled", true],
    ],
  });

  backend = QuickSuggest.getFeature("SuggestBackendMerino");
  Assert.ok(backend, "The Merino backend should exist");

  await SearchService.init();
});

async function establishSession() {
  let context = createContext("establish", {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  await backend.query("establish", { queryContext: context });
  MerinoTestUtils.server.checkAndClearRequests([
    {
      params: {
        [MerinoTestUtils.SEARCH_PARAMS.QUERY]: "establish",
        [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 0,
      },
    },
  ]);
  let sessionID = backend.client.sessionID;
  Assert.ok(sessionID, "A session ID should exist after a fetch");
  return sessionID;
}

function endSession() {
  backend.client?.resetSession();
}

function fetchSelection(searchString) {
  searchString = searchString?.trim();
  // Mirror the `UrlbarInput.pickResult` call site, which doesn't record an
  // empty selection or one that looks like an origin (e.g. "facebook.com").
  if (
    !searchString ||
    UrlUtils.looksLikeOrigin(searchString) != UrlUtils.LOOKS_LIKE_ORIGIN.NONE
  ) {
    return Promise.resolve([]);
  }
  let queryContext = createContext(searchString, {
    providers: [UrlbarProviderQuickSuggest.name],
    isPrivate: false,
  });
  return backend.query(searchString, { queryContext });
}

add_task(async function appProvidedDefaultSuggestion() {
  let sessionID = await establishSession();

  let requestPromise = MerinoTestUtils.server.waitForNextRequest();
  fetchSelection(SUGGESTION);
  await requestPromise;

  MerinoTestUtils.server.checkAndClearRequests([
    {
      params: {
        [MerinoTestUtils.SEARCH_PARAMS.QUERY]: SUGGESTION,
        [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 1,
        [MerinoTestUtils.SEARCH_PARAMS.SESSION_ID]: sessionID,
      },
    },
  ]);

  endSession();
});

// If no suggestion is selected, we use the user-typed term.
add_task(async function appProvidedDefaultTypedTerm() {
  let sessionID = await establishSession();

  let requestPromise = MerinoTestUtils.server.waitForNextRequest();
  fetchSelection("typed query");
  await requestPromise;

  MerinoTestUtils.server.checkAndClearRequests([
    {
      params: {
        [MerinoTestUtils.SEARCH_PARAMS.QUERY]: "typed query",
        [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 1,
        [MerinoTestUtils.SEARCH_PARAMS.SESSION_ID]: sessionID,
      },
    },
  ]);

  endSession();
});

add_task(async function emptyTerm() {
  await establishSession();

  for (let searchString of ["", "   "]) {
    fetchSelection(searchString);
    MerinoTestUtils.server.checkAndClearRequests([]);
  }

  endSession();
});

add_task(async function urlLikeSelection() {
  await establishSession();

  for (let searchString of [
    "192.168.1.1",
    "https://example.com/",
    "facebook.com",
  ]) {
    fetchSelection(searchString);
    MerinoTestUtils.server.checkAndClearRequests([]);
  }

  endSession();
});

add_task(async function noPriorSession() {
  // Ensure there is no live session.
  backend.client?.resetSession();
  Assert.ok(
    !backend.client?.sessionID,
    "There should be no live session before fetching"
  );

  let requestPromise = MerinoTestUtils.server.waitForNextRequest();
  fetchSelection(SUGGESTION);
  await requestPromise;

  MerinoTestUtils.server.checkAndClearRequests([
    {
      params: {
        [MerinoTestUtils.SEARCH_PARAMS.QUERY]: SUGGESTION,
        [MerinoTestUtils.SEARCH_PARAMS.SEQUENCE_NUMBER]: 0,
      },
    },
  ]);
  Assert.ok(
    backend.client?.sessionID,
    "A new session should have been started"
  );

  endSession();
});
