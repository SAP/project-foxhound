/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

"use strict";

/* import-globals-from helper_touch_all_events.js */
Services.scriptloader.loadSubScript(
  CHROME_URL_ROOT + "helper_touch_all_events.js",
  this
);

requestLongerTimeout(2);

const TEST_URL = `${URL_ROOT_COM_SSL}touch_iframe_parent.html`;

for (const test of ["tap", "drag", "double_tap"]) {
  addRDMTask(TEST_URL, async function ({ ui }) {
    reloadOnTouchChange(true);
    await toggleTouchSimulation(ui);
    await runTouchAllEventsTests(
      ui,
      ["topFrame", "localIFrame", "remoteIFrame"],
      test
    );
    await toggleTouchSimulation(ui);
  });
}
