/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.disable_open_during_load", true],
      ["dom.security.framebusting_intervention.enabled", true],
      ["dom.disable_open_click_delay", 0],
    ],
  });
});

add_task(async function () {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  // Run actual checks.
  await checkSandbox(tab);
  await checkSandboxWithAllowTopNavigation(tab);

  BrowserTestUtils.removeTab(tab);
});

async function checkSandbox(tab) {
  info("Triggering framebusting with sandbox...");
  await triggerFramebusting(tab, /*attrs=*/ { sandbox: "allow-scripts" });

  // The navigation is blocked by the sandbox, so no notification is
  // shown.
  await TestUtils.waitForTick();

  is(tab.linkedBrowser.currentURI.spec, FRAMEBUSTING_PARENT_URL);
}

async function checkSandboxWithAllowTopNavigation(tab) {
  info("Triggering framebusting with sandbox=allow-top-navigation...");
  await triggerFramebusting(
    tab,
    /*attrs=*/ { sandbox: "allow-scripts allow-top-navigation" }
  );

  info("Waiting for redirect...");
  await BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    /*includeSubFrames=*/ false,
    FRAMEBUSTING_FRAME_URL
  );

  is(tab.linkedBrowser.currentURI.spec, FRAMEBUSTING_FRAME_URL);
}
