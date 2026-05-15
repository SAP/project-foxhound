/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionWidget:
    "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs",
});

/**
 * Tests that setting the optedOut pref removes the toolbar button
 */
add_task(async function test_opt_out() {
  let buttonBefore = document.getElementById(lazy.IPProtectionWidget.WIDGET_ID);

  Assert.ok(
    BrowserTestUtils.isVisible(buttonBefore),
    "ipprotection toolbar button should be present"
  );

  Services.prefs.setBoolPref("browser.ipProtection.optedOut", true);

  let buttonAfter = document.getElementById(lazy.IPProtectionWidget.WIDGET_ID);

  Assert.ok(!buttonAfter, "ipprotection toolbar button should not be present");

  Services.prefs.clearUserPref("browser.ipProtection.optedOut");
});
