/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testNonPublicFeaturesShouldntGetDisplayed() {
  const cleanup = await setupLabsTest();

  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:preferences#paneExperimental"
  );
  let doc = gBrowser.contentDocument;

  await TestUtils.waitForCondition(
    () => doc.getElementById("nimbus-qa-1"),
    "wait for features to be added to the DOM"
  );

  Assert.ok(
    !!doc.getElementById("nimbus-qa-1"),
    "nimbus-qa-1 checkbox in the document"
  );
  Assert.ok(
    !!doc.getElementById("nimbus-qa-2"),
    "nimbus-qa-2 checkbox in the document"
  );

  Assert.ok(
    !doc.getElementById("targeting-false"),
    "targeting-false checkbox not in the document"
  );
  Assert.ok(
    !doc.getElementById("bucketing-false"),
    "bucketing-false checkbox not in the document"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  await cleanup();
});

add_task(async function testNonPublicFeaturesShouldntGetDisplayed() {
  // Only recipes that do not match targeting or bucketing
  const cleanup = await setupLabsTest(DEFAULT_LABS_RECIPES.slice(2));

  await SpecialPowers.pushPrefEnv({
    set: [["browser.preferences.experimental.hidden", false]],
  });

  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:preferences#paneExperimental"
  );
  const doc = gBrowser.contentDocument;

  const expectedPane = SRD_PREF_VALUE ? "paneSync" : "paneGeneral";

  // When there are no features, paneExperimental redirects to the default
  // pane (paneSync with SRD enabled, paneGeneral otherwise).
  // Wait for the redirect to complete.
  await TestUtils.waitForCondition(
    () =>
      doc.getElementById("categories").currentView === expectedPane &&
      doc.getElementById("category-experimental").hidden,
    `Wait for redirect to ${expectedPane} and nav button to be hidden`
  );

  ok(
    doc.getElementById("category-experimental").hidden,
    "Experimental Features section should be hidden when all features are hidden"
  );
  is(
    doc.getElementById("categories").currentView,
    expectedPane,
    `When the experimental features section is hidden, navigating to #experimental should redirect to the default pane (${expectedPane})`
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  await cleanup();
  await SpecialPowers.popPrefEnv();
});
