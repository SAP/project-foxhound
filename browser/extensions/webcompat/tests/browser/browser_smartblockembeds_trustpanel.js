/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["test.wait300msAfterTabSwitch", true],
      ["browser.urlbar.trustPanel.featureGate", true],
      // Extend clickjacking delay for test because timer expiry can happen before we
      // check the toggle is disabled (especially in chaos mode).
      [SEC_DELAY_PREF, 1000],
      [TRACKING_PREF, true],
      [SMARTBLOCK_EMBEDS_ENABLED_PREF, true],
    ],
  });

  await UrlClassifierTestUtils.addTestTrackers();
  await generateTestShims();

  registerCleanupFunction(() => {
    UrlClassifierTestUtils.cleanupTestTrackers();
  });

  Services.fog.testResetFOG();
});

add_task(async function test_smartblock_embed_replaced() {
  // Open a site with a test "embed"
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    waitForLoad: true,
  });

  await loadSmartblockPageOnTab(tab);
  await clickOnPagePlaceholder(tab);

  // Check smartblock section is unhidden
  ok(
    BrowserTestUtils.isVisible(
      tab.ownerDocument.getElementById("trustpanel-smartblock-toggle-container")
    ),
    "Smartblock section is visible"
  );

  // Check toggle is present and off
  let blockedEmbedToggle = tab.ownerDocument.querySelector(
    "#trustpanel-smartblock-toggle-container moz-toggle"
  );
  ok(blockedEmbedToggle, "Toggle exists in container");
  ok(BrowserTestUtils.isVisible(blockedEmbedToggle), "Toggle is visible");
  ok(!blockedEmbedToggle.pressed, "Unblock toggle should be off");

  // Check toggle disabled by clickjacking protections
  ok(blockedEmbedToggle.disabled, "Unblock toggle should be disabled");

  // Wait for clickjacking protections to timeout
  let delayTime = Services.prefs.getIntPref(SEC_DELAY_PREF);
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, delayTime + 100));

  // Setup promise on custom event to wait for placeholders to finish replacing
  let embedScriptFinished = BrowserTestUtils.waitForContentEvent(
    tab.linkedBrowser,
    "testEmbedScriptFinished",
    false,
    null,
    true
  );

  // Click to toggle to unblock embed and wait for script to finish
  await EventUtils.synthesizeMouseAtCenter(blockedEmbedToggle.buttonEl, {});

  await embedScriptFinished;

  ok(blockedEmbedToggle.pressed, "Unblock toggle should be on");

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    let unloadedEmbed = content.document.querySelector(".broken-embed-content");
    ok(!unloadedEmbed, "Unloaded embeds should not be on the page");

    // Check embed was put back on the page
    let loadedEmbed = content.document.querySelector(".loaded-embed-content");
    ok(loadedEmbed, "Embed should now be on the page");
  });

  await openProtectionsPanel(window);

  await EventUtils.synthesizeMouseAtCenter(
    document.getElementById("trustpanel-blocker-see-all"),
    {}
  );

  // Check if smartblock section is still there after unblock
  await BrowserTestUtils.waitForCondition(() => {
    return BrowserTestUtils.isVisible(
      tab.ownerDocument.getElementById("trustpanel-smartblock-toggle-container")
    );
  });

  // Check toggle is still there and is on now
  blockedEmbedToggle = tab.ownerDocument.querySelector(
    "#trustpanel-smartblock-toggle-container moz-toggle"
  );
  ok(blockedEmbedToggle, "Toggle exists in container");
  ok(BrowserTestUtils.isVisible(blockedEmbedToggle), "Toggle is visible");
  ok(blockedEmbedToggle.pressed, "Unblock toggle should be on");

  // Setup promise on custom event to wait for placeholders to finish replacing
  let smartblockScriptFinished = BrowserTestUtils.waitForContentEvent(
    tab.linkedBrowser,
    "smartblockEmbedScriptFinished",
    false,
    null,
    true
  );

  // click toggle to reblock (this will trigger a reload)
  // Note: clickjacking delay should not happen because panel not opened via embed button
  blockedEmbedToggle.click();

  // Wait for smartblock embed script to finish
  await smartblockScriptFinished;

  ok(!blockedEmbedToggle.pressed, "Unblock toggle should be off");

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    // Check that the "embed" was replaced with a placeholder
    let placeholder = content.document.querySelector(
      ".shimmed-embedded-content"
    );

    ok(placeholder, "Embed replaced with a placeholder after reblock");
  });

  await BrowserTestUtils.removeTab(tab);
});
