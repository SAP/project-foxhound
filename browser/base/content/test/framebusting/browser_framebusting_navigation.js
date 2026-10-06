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

  // All these different variants to navigate the top-level should be
  // blocked.
  const variants = [
    "top", // top.location =
    "open", // self.open() with target="_top"
    "form", // <form> with target="_top"
    "link", // <a> with target="_top"
    "mailto", // top.location = mailto:
  ];
  for (const variant of variants) {
    info(`Triggering framebusting (${variant})...`);
    await triggerFramebusting(tab, /*attrs=*/ {}, /*params=*/ { variant });

    info("Waiting for notification...");
    await BrowserTestUtils.waitForCondition(() =>
      gBrowser.getNotificationBox().getNotificationWithValue("popup-blocked")
    );

    is(tab.linkedBrowser.currentURI.spec, FRAMEBUSTING_PARENT_URL);
  }

  BrowserTestUtils.removeTab(tab);
});
