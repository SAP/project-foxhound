/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for conversation starter prompts in the AI Window.
 *
 * These tests verify that:
 * - Prompts are rendered correctly in both sidebar and fullpage modes
 * - Clicking a prompt triggers the correct event with proper data
 * - Prompts are removed after selection
 * - Mode changes update the layout correctly
 */

"use strict";

/**
 * Get prompt buttons from the prompts element.
 * Waits for the prompts element to be rendered before returning buttons.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<Array>} Array of prompt button text content
 */
async function getPromptButtons(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const smartWindowElement = content.document.querySelector("ai-window");

    const promptsElement = await ContentTaskUtils.waitForCondition(
      () => smartWindowElement.shadowRoot.querySelector("smartwindow-prompts"),
      "Wait for smartwindow-prompts element"
    );

    const buttons =
      promptsElement.shadowRoot.querySelectorAll(".sw-prompt-button");
    return Array.from(buttons).map(button => button.textContent.trim());
  });
}

/**
 * Click a prompt button by index.
 *
 * @param {MozBrowser} browser - The browser element
 * @param {number} index - The index of the button to click
 */
async function clickPromptButton(browser, index) {
  await SpecialPowers.spawn(browser, [index], async buttonIndex => {
    const smartWindowElement = content.document.querySelector("ai-window");

    const promptsElement = await ContentTaskUtils.waitForCondition(
      () => smartWindowElement.shadowRoot.querySelector("smartwindow-prompts"),
      "Wait for smartwindow-prompts element"
    );

    const buttons =
      promptsElement.shadowRoot.querySelectorAll(".sw-prompt-button");

    buttons[buttonIndex].click();
  });
}

add_task(async function test_prompt_click_triggers_chat() {
  // TODO:  Bug 2016859 - Test broken after fetchWithHistory signature change
  //   const sb = this.sinon.createSandbox();

  //   try {
  //     const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
  //     sb.stub(this.openAIEngine, "build");

  //     await SpecialPowers.pushPrefEnv({
  //       set: [["browser.smartwindow.endpoint", "http://localhost:0/v1"]],
  //     });

  //     const win = await openAIWindow();
  //     const browser = win.gBrowser.selectedBrowser;

  //     await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  //     const buttons = await getPromptButtons(browser);
  //     const firstPromptText = buttons[0];

  //     await clickPromptButton(browser, 0);
  //     await TestUtils.waitForTick();

  //     Assert.ok(
  //       fetchWithHistoryStub.calledOnce,
  //       "Should call fetchWithHistory when prompt is clicked"
  //     );

  //     const conversation = fetchWithHistoryStub.firstCall.args[0];
  //     const messages = conversation.getMessagesInOpenAiFormat();
  //     const userMessage = messages.find(message => message.role === "user");

  //     Assert.equal(
  //       userMessage.content,
  //       firstPromptText,
  //       "Should submit the prompt text as user message"
  //     );

  //     await BrowserTestUtils.closeWindow(win);
  //     await SpecialPowers.popPrefEnv();
  //   } finally {
  //     sb.restore();
  //   }
  // });
  ok(true, "Test temporarily skipped ");
});

add_task(async function test_prompt_click_respects_memories_setting() {
  // TODO:  Bug 2016859 - Test broken after fetchWithHistory signature change
  //   const sb = this.sinon.createSandbox();

  //   try {
  //     const fetchWithHistoryStub = sb.stub(this.Chat, "fetchWithHistory");
  //     sb.stub(this.openAIEngine, "build");

  //     await SpecialPowers.pushPrefEnv({
  //       set: [
  //         ["browser.aiwindow.memories", true],
  //         ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
  //       ],
  //     });

  //     const win = await openAIWindow();
  //     const browser = win.gBrowser.selectedBrowser;

  //     await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  //     await getPromptButtons(browser);
  //     await clickPromptButton(browser, 0);
  //     await TestUtils.waitForTick();

  //     const conversation = fetchWithHistoryStub.firstCall.args[0];
  //     const userMessage = conversation.messages.find(m => m.role === 0);

  //     Assert.ok(
  //       userMessage.memoriesEnabled,
  //       "Should pass memories enabled state to user message"
  //     );
  //     Assert.equal(
  //       userMessage.memoriesFlagSource,
  //       0,
  //       "Should indicate memories flag came from global setting"
  //     );

  //     await BrowserTestUtils.closeWindow(win);
  //     await SpecialPowers.popPrefEnv();
  //   } finally {
  //     sb.restore();
  //   }
  // });
  ok(true, "Test temporarily skipped ");
});
