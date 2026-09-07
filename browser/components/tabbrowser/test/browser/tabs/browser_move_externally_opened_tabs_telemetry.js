/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let resetTelemetry = async () => {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
};

/**
 * Simulates opening a link external to Firefox, returning the newly created tab.
 *
 * @returns {Promise<MozTabbrowserTab>}
 */
async function openExternalLink() {
  const tabOpen = BrowserTestUtils.waitForEvent(window, "TabOpen");
  window.browserDOMWindow.openURI(
    Services.io.newURI("data:text/plain,external%20URL"),
    null,
    Ci.nsIBrowserDOMWindow.OPEN_DEFAULTWINDOW,
    Ci.nsIBrowserDOMWindow.OPEN_EXTERNAL,
    Services.scriptSecurityManager.createNullPrincipal({})
  );
  return (await tabOpen).target;
}

/**
 * @returns {Promise<MozTabbrowserTab>}
 */
async function openInternalLink() {
  return BrowserTestUtils.addTab(gBrowser, "data:text/plain,internal%20URL");
}

/**
 * @param {MozTabbrowserTab} tab
 */
async function moveTab(tab) {
  const tabMove = BrowserTestUtils.waitForEvent(tab, "TabMove");
  gBrowser.moveTabTo(tab, {
    tabIndex: 0,
    isUserTriggered: true,
  });
  await tabMove;
}

/**
 * @param {1|null} notFromExternalApp
 * @param {1|null} fromExternalAppNextToActiveTab
 * @param {1|null} fromExternalAppTabStripEnd
 */
function assertTabMovementCounters(
  notFromExternalApp,
  fromExternalAppNextToActiveTab,
  fromExternalAppTabStripEnd
) {
  Assert.equal(
    Glean.browserUiInteraction.tabMovement.not_from_external_app.testGetValue(),
    notFromExternalApp,
    "should have recorded appropriate internally opened tab move"
  );
  Assert.equal(
    Glean.browserUiInteraction.tabMovement.from_external_app_next_to_active_tab.testGetValue(),
    fromExternalAppNextToActiveTab,
    "should have recorded appropriate externally opened tab move (next to active tab)"
  );
  Assert.equal(
    Glean.browserUiInteraction.tabMovement.from_external_app_tab_strip_end.testGetValue(),
    fromExternalAppTabStripEnd,
    "should have recorded appropriate externally opened tab move (end of tab strip)"
  );
}

add_task(async function test_move_interally_opened_link() {
  await resetTelemetry();

  const tab = await openInternalLink();
  await moveTab(tab);

  await TestUtils.waitForCondition(
    () =>
      Glean.browserUiInteraction.tabMovement.not_from_external_app.testGetValue(),
    "wait until a metric is recorded"
  );

  assertTabMovementCounters(1, null, null);

  BrowserTestUtils.removeTab(tab);
  await resetTelemetry();
});

add_task(async function test_move_exterally_opened_link_end_of_tab_strip() {
  await resetTelemetry();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.link.open_newwindow.override.external", -1]],
  });

  const tab = await openExternalLink();
  await moveTab(tab);

  await TestUtils.waitForCondition(
    () =>
      Glean.browserUiInteraction.tabMovement.from_external_app_tab_strip_end.testGetValue(),
    "wait until a metric is recorded"
  );

  assertTabMovementCounters(null, null, 1);

  BrowserTestUtils.removeTab(tab);
  await resetTelemetry();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_move_exterally_opened_link_next_to_active_tab() {
  await resetTelemetry();
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.link.open_newwindow.override.external",
        Ci.nsIBrowserDOMWindow.OPEN_NEWTAB_AFTER_CURRENT,
      ],
    ],
  });

  const tab = await openExternalLink();
  await moveTab(tab);

  await TestUtils.waitForCondition(
    () =>
      Glean.browserUiInteraction.tabMovement.from_external_app_next_to_active_tab.testGetValue(),
    "wait until a metric is recorded"
  );

  assertTabMovementCounters(null, 1, null);

  BrowserTestUtils.removeTab(tab);
  await resetTelemetry();
  await SpecialPowers.popPrefEnv();
});
