/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

var gTestTab;
var gContentAPI;

add_task(setup_UITourTest);

add_UITour_task(async function test_showFirefoxAccountsForAIWindow() {
  // Stub launchWindow to prevent actually opening a window
  let launchStub = sinon.stub(AIWindow, "launchWindow");
  launchStub.resolves(true);

  gContentAPI.showFirefoxAccountsForAIWindow();

  await BrowserTestUtils.waitForCondition(
    () => launchStub.callCount > 0,
    "Waiting for launchWindow to be called"
  );

  Assert.ok(launchStub.calledOnce, "launchWindow should be called");

  launchStub.restore();
});
