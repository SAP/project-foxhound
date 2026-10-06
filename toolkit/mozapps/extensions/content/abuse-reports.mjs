/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* globals windowRoot */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AbuseReporter: "resource://gre/modules/AbuseReporter.sys.mjs",
});

/**
 * This script is part of the HTML about:addons page and it provides some
 * helpers used for abuse reports.
 */

export async function openAbuseReport({ addonId }) {
  // TODO: `reportEntryPoint` is also passed to this function but we aren't
  // using it currently. Maybe we should?

  const amoUrl = lazy.AbuseReporter.getAMOFormURL({ addonId });
  windowRoot.window.openTrustedLinkIn(amoUrl, "tab", {
    // Make sure the newly open tab is going to be focused, independently
    // from general user prefs.
    forceForeground: true,
  });
}
