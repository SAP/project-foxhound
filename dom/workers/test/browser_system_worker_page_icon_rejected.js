/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

ChromeUtils.defineESModuleGetters(this, {
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

// These bytes are simultaneously valid JavaScript (the leading block comment
// hides the markup from the JS parser) and a payload that Places stores
// verbatim as an "SVG" favicon (it only checks for a "<svg" substring). If a
// worker script load from page-icon: were *not* blocked, this would execute
// and post "executed" back. The fix must prevent the load entirely.
const WORKER_SOURCE = `/*<svg*/
self.postMessage("executed:" + (typeof ChromeUtils));
`;

const PAGE_URL = "https://example.com/system-worker-page-icon-test/";
const FAVICON_URL = "https://example.com/system-worker-page-icon-test/icon.svg";
const PAGE_ICON_URL = "page-icon:" + PAGE_URL;

add_task(async function test_system_worker_cannot_load_page_icon_script() {
  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });

  // Seed Places with an SVG favicon whose bytes are valid JavaScript.
  await PlacesTestUtils.addVisits(PAGE_URL);
  await PlacesTestUtils.setFaviconForPage(
    PAGE_URL,
    FAVICON_URL,
    "data:image/svg+xml;base64," + btoa(WORKER_SOURCE)
  );

  // Sanity check: page-icon: returns our attacker-controlled bytes verbatim, so
  // absent the fix a worker loading this URL would execute them.
  const favicon = await PlacesTestUtils.getFaviconForPage(PAGE_URL);
  is(
    favicon?.rawData &&
      new TextDecoder().decode(Uint8Array.from(favicon.rawData)),
    WORKER_SOURCE,
    "page-icon: stores the attacker-controlled bytes verbatim"
  );

  // The actual test: a system-principal (Chrome) worker must refuse to load a
  // page-icon: script. The script load is rejected synchronously during
  // construction (NS_ERROR_DOM_BAD_URI), so the constructor throws a
  // SecurityError rather than ever executing the worker.
  let error;
  try {
    new ChromeWorker(PAGE_ICON_URL);
  } catch (e) {
    error = e;
  }

  ok(
    error,
    "A system-principal worker must refuse to load a page-icon: script"
  );
  ok(
    DOMException.isInstance(error) && error.name === "SecurityError",
    "ChromeWorker construction throws SecurityError for a page-icon: script: " +
      error
  );
});
