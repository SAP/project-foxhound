/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { ChatConversation } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
);

const { ChatMessage } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatMessage.sys.mjs"
);

const { ChatStore, MESSAGE_ROLE } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

function createMockConversation(id = "test-conv-id") {
  const conversation = new ChatConversation({
    id,
    title: "Test Conversation",
    pageUrl: new URL("https://example.com/"),
  });

  conversation.messages = [
    new ChatMessage({
      ordinal: 0,
      role: MESSAGE_ROLE.USER,
      content: { text: "Hello" },
    }),
    new ChatMessage({
      ordinal: 1,
      role: MESSAGE_ROLE.ASSISTANT,
      content: { text: "Hi there" },
    }),
  ];

  return conversation;
}

// When Smart Window loads without a pending conversation, it stamps its
// conversation ID on the host XUL browser element so that navigating away
// and back can recover the conversation.
add_task(async function test_data_conversation_id_stamped_on_initial_load() {
  let win;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await BrowserTestUtils.waitForMutationCondition(
      browser,
      { attributes: true, attributeFilter: ["data-conversation-id"] },
      () => browser.hasAttribute("data-conversation-id")
    );
    Assert.ok(
      browser.hasAttribute("data-conversation-id"),
      "data-conversation-id should be stamped on the host browser after initial load"
    );
    Assert.ok(
      browser.getAttribute("data-conversation-id"),
      "data-conversation-id should be a non-empty string"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

// The data-conversation-id attribute on the XUL host browser persists through
// content navigation since it lives on the chrome element, not in the content
// document.
add_task(
  async function test_data_conversation_id_persists_through_navigation() {
    let win, tab;
    try {
      win = await openAIWindow();
      const browser = win.gBrowser.selectedBrowser;
      tab = win.gBrowser.selectedTab;

      await BrowserTestUtils.waitForMutationCondition(
        browser,
        { attributes: true, attributeFilter: ["data-conversation-id"] },
        () => browser.hasAttribute("data-conversation-id")
      );
      Assert.ok(
        browser.hasAttribute("data-conversation-id"),
        "data-conversation-id should be stamped on initial load"
      );

      const convId = browser.getAttribute("data-conversation-id");

      await promiseNavigateAndLoad(browser, "https://example.com/");

      Assert.equal(
        browser.getAttribute("data-conversation-id"),
        convId,
        "data-conversation-id should persist on the host browser after navigating away"
      );
    } finally {
      if (tab) {
        await BrowserTestUtils.removeTab(tab);
      }
      await BrowserTestUtils.closeWindow(win);
    }
  }
);

// After navigating away from the Smart Window and pressing back, the Smart Window
// reloads and looks up the conversation using the ID preserved on the host
// browser element.
add_task(async function test_back_navigation_restores_conversation() {
  const sb = lazy.sinon.createSandbox();
  let win, tab;

  try {
    const mockConversation = createMockConversation();
    sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    tab = win.gBrowser.selectedTab;

    // Stamp the mock ID to simulate a saved conversation in this tab.
    browser.setAttribute("data-conversation-id", mockConversation.id);

    win.dispatchEvent(
      new win.CustomEvent("ai-window:opened-conversation", {
        detail: {
          mode: "fullpage",
          conversationId: mockConversation.id,
          tab,
        },
      })
    );

    await promiseNavigateAndLoad(browser, "https://example.com/");

    let loaded = BrowserTestUtils.browserLoaded(browser, {
      wantLoad: AIWINDOW_URL,
    });
    win.gBrowser.goBack();
    await loaded;

    await TestUtils.waitForCondition(
      () => ChatStore.findConversationById.calledWith(mockConversation.id),
      "findConversationById should be called with the preserved ID after back navigation"
    );

    Assert.ok(
      ChatStore.findConversationById.calledWith(mockConversation.id),
      "Conversation should be looked up by the preserved ID after back navigation"
    );
  } finally {
    if (tab) {
      await BrowserTestUtils.removeTab(tab);
    }
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});

// chat-active should not be applied on a fresh Smart Window load where there
// is no conversation to restore.
add_task(async function test_chat_active_not_applied_on_fresh_load() {
  let win;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    // Wait for #loadPendingConversation to stamp a fresh ID — this is the
    // signal that the no-existing-conversation path has completed.
    await BrowserTestUtils.waitForMutationCondition(
      browser,
      { attributes: true, attributeFilter: ["data-conversation-id"] },
      () => browser.hasAttribute("data-conversation-id")
    );
    Assert.ok(
      browser.hasAttribute("data-conversation-id"),
      "data-conversation-id should be stamped after initial load"
    );

    const hasChatActive = await SpecialPowers.spawn(browser, [], () =>
      content.document
        .querySelector("ai-window")
        ?.classList.contains("chat-active")
    );

    Assert.ok(
      !hasChatActive,
      "chat-active should not be applied on a fresh load with no conversation to restore"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

// chat-active should not be applied when data-conversation-id is present on
// the host browser but the conversation no longer exists in the store.
// This covers refresh and mode-switch scenarios where the attribute is stale.
add_task(async function test_chat_active_removed_for_stale_conversation_id() {
  let win;
  try {
    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    // Stamp a fake ID to simulate the attribute being present from a previous
    // load (e.g. a refresh on a new tab, or a classic→smart mode switch).
    // The constructor will see it and eagerly apply chat-active, then
    // #loadPendingConversation should remove it when the store lookup fails.
    const staleId = "stale-conversation-id-not-in-store";
    browser.setAttribute("data-conversation-id", staleId);

    await promiseNavigateAndLoad(browser, AIWINDOW_URL);

    // The stale ID gets replaced with a fresh one once the store lookup fails —
    // wait for that replacement as the signal that cleanup has completed.
    await BrowserTestUtils.waitForMutationCondition(
      browser,
      { attributes: true, attributeFilter: ["data-conversation-id"] },
      () => browser.getAttribute("data-conversation-id") !== staleId
    );
    Assert.notStrictEqual(
      browser.getAttribute("data-conversation-id"),
      staleId,
      "data-conversation-id should be replaced after a failed conversation lookup"
    );

    const hasChatActive = await SpecialPowers.spawn(browser, [], () =>
      content.document
        .querySelector("ai-window")
        ?.classList.contains("chat-active")
    );

    Assert.ok(
      !hasChatActive,
      "chat-active should be removed when the conversation is not found in the store"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

// chat-active should be applied eagerly when data-conversation-id is present
// on the host browser, indicating a conversation is being restored via back
// navigation.
add_task(async function test_chat_active_applied_on_back_navigation() {
  const sb = lazy.sinon.createSandbox();
  let win, tab;

  try {
    const mockConversation = createMockConversation();
    sb.stub(ChatStore, "findConversationById").resolves(mockConversation);

    win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    tab = win.gBrowser.selectedTab;

    browser.setAttribute("data-conversation-id", mockConversation.id);

    await promiseNavigateAndLoad(browser, "https://example.com/");

    let loaded = BrowserTestUtils.browserLoaded(browser, {
      wantLoad: AIWINDOW_URL,
    });
    win.gBrowser.goBack();
    await loaded;

    await TestUtils.waitForCondition(
      () =>
        SpecialPowers.spawn(browser, [], () =>
          content.document
            .querySelector("ai-window")
            ?.classList.contains("chat-active")
        ),
      "chat-active should be applied when restoring a conversation via back navigation"
    );
  } finally {
    if (tab) {
      await BrowserTestUtils.removeTab(tab);
    }
    await BrowserTestUtils.closeWindow(win);
    sb.restore();
  }
});
