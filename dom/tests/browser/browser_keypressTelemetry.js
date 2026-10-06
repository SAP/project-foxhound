/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EventUtils = {};
var PaintListener = {};
Services.scriptloader.loadSubScript(
  "chrome://mochikit/content/tests/SimpleTest/EventUtils.js",
  EventUtils
);

const { ContentTaskUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ContentTaskUtils.sys.mjs"
);

async function getRecordedKeypressCount() {
  await Services.fog.testFlushAllChildren();
  const v = Glean.performanceInteraction.keypressPresentLatency.testGetValue();
  return v ? v.count : 0;
}

add_task(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["toolkit.telemetry.ipcBatchTimeout", 10]],
  });
  Services.fog.testResetFOG();

  waitForExplicitFinish();

  gURLBar.focus();
  await SimpleTest.promiseFocus(window);
  EventUtils.sendChar("x");

  await ContentTaskUtils.waitForCondition(
    async () => {
      return (await getRecordedKeypressCount()) > 0;
    },
    "waiting for telemetry",
    200,
    600
  );
  let result = await getRecordedKeypressCount();
  Assert.equal(result, 1, "One keypress recorded");

  gURLBar.focus();
  await SimpleTest.promiseFocus(window);
  EventUtils.sendChar("x");

  await ContentTaskUtils.waitForCondition(
    async () => {
      return (await getRecordedKeypressCount()) > 1;
    },
    "waiting for telemetry",
    200,
    600
  );
  result = await getRecordedKeypressCount();
  Assert.equal(result, 2, "Two keypresses recorded");
});
