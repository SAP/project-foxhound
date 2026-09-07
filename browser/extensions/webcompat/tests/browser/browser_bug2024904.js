/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

registerCleanupFunction(() => {
  UrlClassifierTestUtils.cleanupTestTrackers();
  // It's unclear why/where this pref ends up getting set, but we ought to reset it.
  Services.prefs.clearUserPref(
    "privacy.trackingprotection.allow_list.hasUserInteractedWithETPSettings"
  );
});

add_setup(async function () {
  await UrlClassifierTestUtils.addTestTrackers();
  await generateTestShims();
});

add_task(async function test_shim_fetch_request_blocked() {
  Services.prefs.setBoolPref(TRACKING_PREF, true);

  await WebCompatExtension.shimsReady();

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  const fetchBlocked = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async () => {
      return await content
        .fetch(
          "https://itisatracker.org/browser/browser/extensions/webcompat/tests/browser/shims_test_fetch.txt"
        )
        .then(
          ok => ok.text().then(t => t.trim()),
          _error => "BLOCKED"
        );
    }
  );

  Assert.equal(
    fetchBlocked,
    "BLOCKED",
    "Fetch to shim-matched tracker URL did not return real tracker content"
  );

  await BrowserTestUtils.removeTab(tab);
  Services.prefs.clearUserPref(TRACKING_PREF);
});
