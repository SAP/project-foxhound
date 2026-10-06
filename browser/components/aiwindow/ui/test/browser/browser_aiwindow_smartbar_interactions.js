/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Dispatch a `smartbar-commit` event and wait for it to be processed.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {string} value - The value to submit
 * @param {string} action - The action type
 */
async function dispatchSmartbarCommitAndWait(browser, value, action) {
  await SpecialPowers.spawn(browser, [value, action], async (val, act) => {
    const aiWindowElement = content.document.querySelector("ai-window");

    const smartbar = await ContentTaskUtils.waitForCondition(
      () => aiWindowElement.shadowRoot.querySelector("#ai-window-smartbar"),
      "Wait for Smartbar to be rendered"
    );
    const commitEvent = new content.CustomEvent("smartbar-commit", {
      detail: {
        value: val,
        action: act,
      },
      bubbles: true,
      composed: true,
    });

    smartbar.ownerDocument.dispatchEvent(commitEvent);
  });
  await TestUtils.waitForTick();
}

/**
 * Assert the interaction count pref value.
 *
 * @param {string} prefName - The preference name
 * @param {number} expectedCount - The expected count value
 * @param {string} message - The assertion message
 */
function assertInteractionCount(prefName, expectedCount, message) {
  const count = Services.prefs.getIntPref(prefName, 0);
  Assert.equal(count, expectedCount, message);
}

add_task(async function test_interaction_count_increments() {
  const PREF_NAME = "browser.smartwindow.chat.interactionCount";
  const sb = this.sinon.createSandbox();

  try {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_NAME, 0]],
    });

    sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build").resolves({});

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    assertInteractionCount(PREF_NAME, 0, "Initial count should be 0");

    await dispatchSmartbarCommitAndWait(browser, "test message", "chat");
    assertInteractionCount(PREF_NAME, 1, "Count should increment to 1");

    await dispatchSmartbarCommitAndWait(browser, "another message", "chat");
    assertInteractionCount(PREF_NAME, 2, "Count should increment to 2");

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(async function test_interaction_count_max_limit() {
  const PREF_NAME = "browser.smartwindow.chat.interactionCount";
  const MAX_INTERACTION_COUNT = 1000;
  const sb = this.sinon.createSandbox();

  try {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_NAME, MAX_INTERACTION_COUNT]],
    });

    sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build").resolves({});

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    assertInteractionCount(
      PREF_NAME,
      MAX_INTERACTION_COUNT,
      `Initial count should be ${MAX_INTERACTION_COUNT}`
    );

    await dispatchSmartbarCommitAndWait(browser, "test message", "chat");
    assertInteractionCount(
      PREF_NAME,
      MAX_INTERACTION_COUNT,
      `Count should not exceed max of ${MAX_INTERACTION_COUNT}`
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});
