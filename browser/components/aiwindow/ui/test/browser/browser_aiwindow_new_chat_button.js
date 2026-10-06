/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

/**
 * Test that new chat button exists in sidebar mode and has correct attributes.
 */
add_task(async function test_new_chat_button_sidebar() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.openAIEngine, "build");

    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.firstrun.hasCompleted", true],
        ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ],
    });

    const win = await openAIWindow();
    AIWindowUI.toggleSidebar(win);

    // Wait for sidebar to be ready
    await BrowserTestUtils.waitForCondition(() => {
      const sidebarBrowser = win.document.getElementById("ai-window-browser");
      return sidebarBrowser && sidebarBrowser.contentDocument;
    }, "Sidebar browser should be loaded");

    const sidebarBrowser = win.document.getElementById("ai-window-browser");

    // Wait for ai-window component to be loaded
    await BrowserTestUtils.waitForCondition(() => {
      const aiWindow =
        sidebarBrowser.contentDocument.querySelector("ai-window");
      return aiWindow && aiWindow.shadowRoot;
    }, "AI Window component should be loaded with shadow root");

    const aiWindow = sidebarBrowser.contentDocument.querySelector("ai-window");

    Assert.ok(aiWindow, "AI Window component should exist in sidebar");
    Assert.equal(
      aiWindow.mode,
      "sidebar",
      "AI Window should be in sidebar mode"
    );

    // Find the new chat button
    const newChatButton = aiWindow.shadowRoot.querySelector(
      ".new-chat-icon-button"
    );
    Assert.ok(newChatButton, "New chat button should exist in sidebar mode");

    // Verify button properties
    Assert.equal(
      newChatButton.getAttribute("data-l10n-id"),
      "aiwindow-new-chat",
      "Button should have correct l10n ID"
    );

    await BrowserTestUtils.closeWindow(win);
    await SpecialPowers.popPrefEnv();
  } finally {
    sb.restore();
  }
});

/**
 * Test that new chat button is present in fullpage mode and visible when chat is active.
 */
add_task(async function test_new_chat_button_in_fullpage() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.openAIEngine, "build");

    const aiWin = await openAIWindow();
    const browser = aiWin.gBrowser.selectedBrowser;

    const result = await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");

      await new Promise(resolve => content.setTimeout(resolve, 100));

      await ContentTaskUtils.waitForCondition(
        () => aiWindowElement && aiWindowElement.shadowRoot,
        "Wait for AI Window to be rendered with shadow root"
      );

      const mode = aiWindowElement.mode;
      const newChatButton = aiWindowElement.shadowRoot.querySelector(
        ".new-chat-icon-button"
      );
      const fullpageHeader =
        aiWindowElement.shadowRoot.querySelector(".fullpage-header");

      return {
        mode,
        hasButton: !!newChatButton,
        hasFullpageHeader: !!fullpageHeader,
      };
    });

    Assert.equal(
      result.mode,
      "fullpage",
      "AI Window should be in fullpage mode"
    );
    Assert.ok(
      result.hasButton,
      "New chat button should exist in fullpage mode"
    );
    Assert.ok(
      result.hasFullpageHeader,
      "Fullpage header container should exist in fullpage mode"
    );

    await BrowserTestUtils.closeWindow(aiWin);
  } finally {
    sb.restore();
  }
});

/**
 * Test that clicking new chat in fullpage mode keeps the chat-active state
 * instead of reverting to the initial empty state.
 */
add_task(async function test_new_chat_fullpage_stays_chat_active() {
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.openAIEngine, "build");

    const aiWin = await openAIWindow();
    const browser = aiWin.gBrowser.selectedBrowser;

    const result = await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");

      await ContentTaskUtils.waitForCondition(
        () => aiWindowElement && aiWindowElement.shadowRoot,
        "Wait for AI Window to be rendered with shadow root"
      );

      aiWindowElement.classList.add("chat-active");

      Assert.ok(
        aiWindowElement.classList.contains("chat-active"),
        "chat-active class should be set before clicking new chat"
      );

      aiWindowElement.onCreateNewChatClick();

      return aiWindowElement.classList.contains("chat-active");
    });

    Assert.ok(
      result,
      "chat-active class should be retained after new chat click in fullpage mode"
    );

    await BrowserTestUtils.closeWindow(aiWin);
  } finally {
    sb.restore();
  }
});
