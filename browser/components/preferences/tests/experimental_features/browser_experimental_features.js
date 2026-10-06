/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function setup() {
  const cleanup = await setupLabsTest();
  registerCleanupFunction(cleanup);
});

add_task(async function testCanOpenWithPref() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.preferences.experimental", true]],
  });

  await openPreferencesViaOpenPreferencesAPI("paneHome", { leaveOpen: true });
  let doc = gBrowser.contentDocument;

  let experimentalCategory = doc.getElementById("category-experimental");
  ok(experimentalCategory, "The category exists");
  ok(!experimentalCategory.hidden, "The category is not hidden");

  let settingPane = await TestUtils.waitForCondition(
    () => doc.querySelector('setting-pane[data-category="paneExperimental"]'),
    "Waiting for experimental setting-pane to get registered"
  );
  ok(
    settingPane.hidden,
    "The setting-pane should be hidden when Home is selected"
  );

  EventUtils.synthesizeMouseAtCenter(
    experimentalCategory,
    {},
    doc.documentGlobal
  );
  await TestUtils.waitForCondition(
    () => !settingPane.hidden,
    "Waiting until pane is visible"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function testSearchFindsExperiments() {
  await openPreferencesViaOpenPreferencesAPI("paneHome", { leaveOpen: true });
  let doc = gBrowser.contentDocument;

  let experimentalCategory = doc.getElementById("category-experimental");
  ok(experimentalCategory, "The category exists");
  ok(!experimentalCategory.hidden, "The category is not hidden");

  await TestUtils.waitForCondition(
    () => doc.querySelector("#pane-experimental-featureGates > .featureGate"),
    "Waiting for experimental features category to get initialized"
  );
  await evaluateSearchResults(
    "in development and evolving",
    ["pane-experimental-featureGates"],
    /* include experiments */ true
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
