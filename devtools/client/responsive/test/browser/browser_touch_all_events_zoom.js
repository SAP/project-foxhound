/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

/* import-globals-from helper_touch_all_events.js */
Services.scriptloader.loadSubScript(
  CHROME_URL_ROOT + "helper_touch_all_events.js",
  this
);

const TEST_URL = `${URL_ROOT_COM_SSL}touch_iframe_parent_desktop.html`;

// The following tests change the page's zoom state, so we run each of them
// separately to ensure they don't interfere with each other.
for (const frameName of ["topFrame", "localIFrame", "remoteIFrame"]) {
  addRDMTask(TEST_URL, async function ({ ui }) {
    reloadOnTouchChange(true);
    await toggleTouchSimulation(ui);
    await runTouchAllEventsTests(ui, [frameName], "double_tap_zoom");
    await toggleTouchSimulation(ui);
  });
}
