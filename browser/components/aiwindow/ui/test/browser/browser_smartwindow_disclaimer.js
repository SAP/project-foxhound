/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests for disclaimer label.
 */

async function openFullScreenAIWindow() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  return { win, browser };
}

add_task(async function test_smartwindow_disclaimer_visibility() {
  const { win, browser } = await openFullScreenAIWindow();

  try {
    const smartWindowElement =
      browser.contentDocument.querySelector("ai-window");
    Assert.ok(smartWindowElement, "ai-window element should exist");

    Assert.strictEqual(
      smartWindowElement.shadowRoot?.querySelector(".disclaimer"),
      null,
      "Disclaimer should NOT exist in full page mode"
    );

    smartWindowElement.showDisclaimer = true;
    await BrowserTestUtils.waitForMutationCondition(
      smartWindowElement.shadowRoot,
      { childList: true, subtree: true },
      () => smartWindowElement.shadowRoot.querySelector(".disclaimer")
    );

    smartWindowElement.showDisclaimer = false;
    await BrowserTestUtils.waitForMutationCondition(
      smartWindowElement.shadowRoot,
      { childList: true, subtree: true },
      () => !smartWindowElement.shadowRoot.querySelector(".disclaimer")
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    await SpecialPowers.popPrefEnv();
  }
});
