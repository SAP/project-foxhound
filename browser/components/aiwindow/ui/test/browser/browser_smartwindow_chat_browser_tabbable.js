/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

async function waitForAIWindow(browser) {
  await SpecialPowers.spawn(browser, [], async () => {
    await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("ai-window:defined"),
      "Wait for ai-window to be defined"
    );
  });
}

// Empty Smart Window in fullpage mode previously left the embedded chat
// <browser> as a 0-height tab stop between the New Chat button and the
// smartbar. Verify it is now skipped while no chat is active.
add_task(async function test_aichat_browser_not_tabbable_when_chat_inactive() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries();

  let win;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    await waitForAIWindow(browser);

    const result = await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      const aichatBrowser = await ContentTaskUtils.waitForCondition(
        () => aiWindow.shadowRoot?.querySelector("#aichat-browser"),
        "Wait for #aichat-browser"
      );
      return {
        chatActive: aiWindow.classList.contains("chat-active"),
        tabindex: aichatBrowser.getAttribute("tabindex"),
      };
    });

    Assert.ok(
      !result.chatActive,
      "chat-active should not be set on a fresh Smart Window load"
    );
    Assert.equal(
      result.tabindex,
      "-1",
      "#aichat-browser should be removed from tab order while chat is inactive"
    );
  } finally {
    if (win) {
      await BrowserTestUtils.closeWindow(win);
    }
    restoreSignIn();
    await restore();
  }
});

// Once a chat starts and chat-active is applied, the embedded browser should
// rejoin tab order so its content (assistant message footer buttons, links,
// etc.) is reachable by keyboard.
add_task(async function test_aichat_browser_tabbable_when_chat_active() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["Hello from mock."] },
  });

  let win;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    await waitForAIWindow(browser);

    await typeInSmartbar(browser, "start a chat");
    await submitSmartbar(browser);

    const tabindex = await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForCondition(
        () => aiWindow.classList.contains("chat-active"),
        "chat-active should be applied after submitting a prompt"
      );
      return aiWindow.shadowRoot
        .querySelector("#aichat-browser")
        .getAttribute("tabindex");
    });

    Assert.equal(
      tabindex,
      null,
      "#aichat-browser should rejoin tab order while chat is active"
    );
  } finally {
    if (win) {
      await BrowserTestUtils.closeWindow(win);
    }
    restoreSignIn();
    await restore();
  }
});
