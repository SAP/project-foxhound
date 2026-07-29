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
  // Block Smart Window via AI control
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ai.control.smartWindow", "blocked"]],
  });

  // Stub launchWindow to prevent actually opening a window
  let launchStub = sinon.stub(AIWindow, "launchWindow");
  launchStub.resolves(true);

  gContentAPI.showFirefoxAccountsForAIWindow();

  await BrowserTestUtils.waitForCondition(
    () => launchStub.callCount > 0,
    "Waiting for launchWindow to be called"
  );

  // Verify the pref was overridden to "available"
  Assert.equal(
    Services.prefs.getStringPref("browser.ai.control.smartWindow", ""),
    "available",
    "AI control pref should be set to available when launching from AI control blocked state"
  );

  Assert.ok(launchStub.calledOnce, "launchWindow should be called");

  launchStub.restore();
  await SpecialPowers.popPrefEnv();
});
