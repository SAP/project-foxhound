/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testHiddenWhenLabsDisabled() {
  const cleanup = await setupLabsTest();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.preferences.experimental.hidden", false]],
  });

  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      UserMessaging: { FirefoxLabs: false },
    },
  });

  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:preferences#paneExperimental"
  );

  const doc = gBrowser.contentDocument;

  await TestUtils.waitForCondition(
    () => doc.getElementById("category-experimental").hidden,
    "Wait for Experimental Features section label to become hidden"
  );

  is(
    doc.getElementById("pane-experimental-featureGates"),
    null,
    "Experimental Features section not added to the DOM"
  );

  is(
    doc.querySelector(".category[selected]").id,
    "category-general",
    "When the experimental features section is hidden, navigating to #experimental should redirect to #general"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  await SpecialPowers.popPrefEnv();
  await cleanup();

  await EnterprisePolicyTesting.setupPolicyEngineWithJson({});
});
