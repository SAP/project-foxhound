/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests that the Smart bar still recognizes URL-shaped input as a navigation
 * intent while a chat is already active. Without this, queries are suppressed
 * in chat-active state and every Enter press would be routed to chat.
 */

"use strict";

const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);

// AI chat content loads Fluent strings asynchronously, which may not complete
// before the test finishes.
PromiseTestUtils.allowMatchingRejectionsGlobally(
  /Missing message.*smartwindow-messages-document-title/
);

/**
 * Drives the smart window into chat-active state and waits for the streamed
 * response to finish, so the smartbar is permanently suppressed but no longer
 * showing the "stop" CTA when we start typing the next message.
 *
 * @param {MozBrowser} browser
 */
async function enterChatActiveState(browser) {
  await typeInSmartbar(browser, "hello");
  await submitSmartbar(browser);

  const aiWindowEl = browser.contentDocument?.querySelector("ai-window");
  const aichatBrowser = await TestUtils.waitForCondition(
    () => aiWindowEl.shadowRoot?.querySelector("#aichat-browser"),
    "Wait for aichat-browser"
  );

  await SpecialPowers.spawn(aichatBrowser, [], async () => {
    const chatContent = content.document.querySelector("ai-chat-content");
    await ContentTaskUtils.waitForMutationCondition(
      chatContent.shadowRoot,
      { childList: true, subtree: true },
      () => chatContent.shadowRoot.querySelector("assistant-message-footer")
    );
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    await ContentTaskUtils.waitForCondition(
      () => aiWindow.classList.contains("chat-active"),
      "Wait for chat-active class"
    );
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    Assert.ok(
      smartbar._permanentlySuppressStartQuery,
      "smartbar queries should be permanently suppressed in chat-active state"
    );
  });
}

add_task(async function test_chat_active_url_is_recognized_as_navigate() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["Hello from mock."] },
  });

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  try {
    await enterChatActiveState(browser);

    await stubLoadURL(browser, { captureURL: true });
    await typeInSmartbar(browser, "https://example.com");
    await waitForSmartbarAction(browser, "navigate");

    await submitSmartbar(browser);

    const { called, url } = await getStubLoadURLResult(browser);
    Assert.ok(called, "_loadURL should be called for URL-shaped input");
    Assert.equal(
      url,
      "https://example.com/",
      "_loadURL should receive the fixed-up URL"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await restore();
  }
});

/**
 * Drives the chat-active state then asserts that the given input is treated
 * as a chat prompt (action stays "chat", _loadURL is not called).
 *
 * @param {string} input - The value to type into the smartbar.
 */
async function assertChatInputStaysChat(input) {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["Hello from mock."] },
  });

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  try {
    await enterChatActiveState(browser);

    await stubLoadURL(browser, { captureURL: true });

    const commitPromise = SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
      return new Promise(resolve => {
        smartbar.addEventListener(
          "smartbar-commit",
          e => resolve(e.detail.action),
          { once: true }
        );
      });
    });

    await typeInSmartbar(browser, input);
    await waitForSmartbarAction(browser, "chat");
    await submitSmartbar(browser);

    const action = await commitPromise;
    Assert.equal(
      action,
      "chat",
      `Input "${input}" should submit to chat, not navigate`
    );

    const { called } = await getStubLoadURLResult(browser);
    Assert.ok(!called, `_loadURL should NOT be called for input "${input}"`);
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await restore();
  }
}

add_task(async function test_chat_active_non_url_still_chats() {
  await assertChatInputStaysChat("tell me a story");
});

add_task(async function test_chat_active_url_with_extra_words_still_chats() {
  // A URL mixed with extra words is not a navigation intent — the smart bar
  // should still send it to the assistant.
  await assertChatInputStaysChat("https://example.com testword");
});
