/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for Smartbar telemetry in the Smart Window.
 *
 * These tests verify that urlbar engagement and abandonment telemetry
 * includes the correct extra keys when using the smartbar.
 */

"use strict";

/**
 * @import { SmartbarAction } from "chrome://browser/content/aiwindow/components/input-cta/input-cta.mjs"
 */

let expectedModel;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.searchEngagementTelemetry.enabled", true],
      ["browser.smartwindow.firstrun.modelChoice", "1"],
    ],
  });

  expectedModel = await modelFor("1");

  const fakeIntentEngine = {
    run({ args: [[query]] }) {
      const searchKeywords = ["search", "find", "look up"];
      const navigateKeywords = ["https://", "www.", ".com"];
      const formattedPrompt = query.toLowerCase();

      const isSearch = searchKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );
      const isNavigate = navigateKeywords.some(keyword =>
        formattedPrompt.includes(keyword)
      );

      if (isNavigate) {
        return [
          { label: "navigate", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
      if (isSearch) {
        return [
          { label: "search", score: 0.95 },
          { label: "chat", score: 0.05 },
        ];
      }
      return [
        { label: "chat", score: 0.95 },
        { label: "search", score: 0.05 },
      ];
    },
  };

  gIntentEngineStub.resolves(fakeIntentEngine);
});

async function resetTelemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
}

// TODO (bug 2025792): Add tests for `extra_key`s `bounce` and `disable`.

add_task(async function test_smartbar_telemetry_navigate_submit_enter() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await stubLoadURL(browser);
  await typeInSmartbar(browser, "https://example.com");
  await waitForSmartbarAction(browser, "navigate");
  await submitSmartbar(browser);

  const events = Glean.smartWindow.navigateSubmit.testGetValue();
  Assert.equal(events.length, 1, "Should have one navigate_submit event");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "navigate_submit has chat_id");
  Assert.equal(
    extra.message_seq,
    "0",
    "navigate_submit has correct message_seq"
  );
  Assert.equal(extra.model, expectedModel, "navigate_submit has correct model");
  Assert.equal(extra.length, "20", "navigate_submit has correct length");
  Assert.equal(
    extra.location,
    "fullpage",
    "navigate_submit has correct location"
  );
  Assert.equal(
    extra.detected_intent,
    "navigate",
    "navigate_submit has correct detected_intent"
  );
  Assert.equal(
    extra.submit_type,
    "enter",
    "navigate_submit has correct submit_type for enter key"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_navigate_submit_button() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await stubLoadURL(browser);
  await typeInSmartbar(browser, "https://example.com");
  await waitForSmartbarAction(browser, "navigate");
  await submitSmartbar(browser, { useButton: true });

  const events = Glean.smartWindow.navigateSubmit.testGetValue();
  Assert.equal(events.length, 1, "Should have one navigate_submit event");

  const extra = events[0].extra;
  Assert.equal(
    extra.submit_type,
    "button",
    "navigate_submit has correct submit_type for button click"
  );
  Assert.equal(
    extra.detected_intent,
    "navigate",
    "navigate_submit has correct detected_intent"
  );
  Assert.equal(
    extra.location,
    "fullpage",
    "navigate_submit has correct location"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_search_submit() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await stubLoadURL(browser);
  await typeInSmartbar(browser, "search for cats");
  await waitForSmartbarAction(browser, "search");
  await submitSmartbar(browser, { useButton: true });

  const events = Glean.smartWindow.searchSubmit.testGetValue();
  Assert.equal(events.length, 1, "Should have one search_submit event");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "search_submit has chat_id");
  Assert.equal(extra.message_seq, "0", "search_submit has correct message_seq");
  Assert.equal(extra.model, expectedModel, "search_submit has correct model");
  Assert.equal(
    extra.location,
    "fullpage",
    "search_submit has correct location"
  );
  Assert.equal(
    extra.detected_intent,
    "search",
    "search_submit has correct detected_intent"
  );
  Assert.equal(extra.length, "15", "search_submit has correct length");
  Assert.ok(extra.provider, "search_submit has provider");
  Assert.equal(
    extra.submit_type,
    "button",
    "search_submit has correct submit_type for button click"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_telemetry_search_submit_user_changed_intent() {
    await resetTelemetry();

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "test");
    await stubLoadURL(browser);

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
      const inputCta = smartbar.querySelector("input-cta");
      const mozButton = inputCta.shadowRoot.querySelector("moz-button");

      const chevronButton = await ContentTaskUtils.waitForCondition(
        () => mozButton.shadowRoot.querySelector("#chevron-button"),
        "Wait for chevron button to be rendered"
      );

      const panelList = inputCta.shadowRoot.querySelector("panel-list");
      chevronButton.click();
      await ContentTaskUtils.waitForEvent(panelList, "shown");

      const searchItem = panelList.querySelector('panel-item[icon="search"]');
      searchItem.click();
    });

    const previewEvents = Glean.smartWindow.intentChangePreview.testGetValue();
    Assert.equal(
      previewEvents.length,
      1,
      "Should have one intent_change_preview event"
    );
    Assert.equal(
      previewEvents[0].extra.current_intent,
      "chat",
      "intent_change_preview current_intent reflects intent model"
    );

    const searchEvents = Glean.smartWindow.searchSubmit.testGetValue();
    Assert.equal(searchEvents.length, 1, "Should have one search_submit event");
    Assert.equal(
      searchEvents[0].extra.detected_intent,
      "chat",
      "search_submit detected_intent is chat even though user picked search"
    );
    Assert.equal(
      searchEvents[0].extra.submit_type,
      "button",
      "search_submit has correct submit_type for explicit action selection"
    );

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_smartbar_telemetry_chat_submit_enter() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "tell me a joke");
  await waitForSmartbarAction(browser, "chat");
  await submitSmartbar(browser);

  const events = Glean.smartWindow.chatSubmit.testGetValue();
  Assert.equal(events.length, 1, "Should have one chat_submit event");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "chat_submit has chat_id");
  Assert.equal(extra.message_seq, "0", "chat_submit has correct message_seq");
  Assert.equal(extra.model, expectedModel, "chat_submit has correct model");
  Assert.equal(extra.location, "fullpage", "chat_submit has correct location");
  Assert.equal(
    extra.detected_intent,
    "chat",
    "chat_submit has correct detected_intent"
  );
  Assert.equal(
    extra.submit_type,
    "enter",
    "chat_submit has correct submit_type for enter key"
  );
  Assert.equal(extra.tabs, "0", "chat_submit has correct tabs count");
  Assert.equal(extra.mentions, "0", "chat_submit has correct mentions count");
  Assert.equal(extra.length, "14", "chat_submit has correct length");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_chat_submit_button_click() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "tell me a joke");
  await waitForSmartbarAction(browser, "chat");
  await submitSmartbar(browser, { useButton: true });

  const events = Glean.smartWindow.chatSubmit.testGetValue();
  Assert.equal(events.length, 1, "Should have one chat_submit event");

  const extra = events[0].extra;
  Assert.equal(
    extra.submit_type,
    "button",
    "chat_submit has correct submit_type for button click"
  );
  Assert.equal(
    extra.detected_intent,
    "chat",
    "chat_submit has correct detected_intent"
  );
  Assert.equal(extra.location, "fullpage", "chat_submit has correct location");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_chat_submit_keyboard() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "tell me a joke");
  await waitForSmartbarAction(browser, "chat");
  await submitSmartbar(browser);

  const events = Glean.smartWindow.chatSubmit.testGetValue();
  Assert.equal(events.length, 1, "Should have one chat_submit event");

  const extra = events[0].extra;
  Assert.equal(
    extra.submit_type,
    "enter",
    "chat_submit has correct submit_type when pressing Enter"
  );
  Assert.equal(
    extra.detected_intent,
    "chat",
    "chat_submit has correct detected_intent"
  );
  Assert.equal(extra.location, "fullpage", "chat_submit has correct location");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_engagement_extra_keys() {
  await resetTelemetry();
  const sb = this.sinon.createSandbox();

  try {
    sb.stub(this.Chat, "fetchWithHistory");
    sb.stub(this.openAIEngine, "build");

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "tell me a joke");
    await submitSmartbar(browser);

    const events = Glean.urlbar.engagement.testGetValue() ?? [];
    Assert.greater(events.length, 0, "Should have engagement events");
    const smartbarEvent = events.find(e => e.extra.sap === "smartbar");
    Assert.ok(smartbarEvent, "Should have a smartbar engagement event");

    const extra = smartbarEvent.extra;
    Assert.ok(extra.chat_id, "engagement has chat_id");
    Assert.equal(extra.intent, "chat", "engagement has correct intent");
    Assert.equal(
      extra.window_mode,
      "smartwindow",
      "engagement has correct window mode"
    );
    Assert.equal(extra.location, "fullpage", "engagement has correct location");
    Assert.equal(extra.model, expectedModel, "engagement has correct model");
    Assert.equal(
      extra.selected_result,
      "ai_chat",
      "engagement has correct selected_result"
    );

    await BrowserTestUtils.closeWindow(win);
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_smartbar_telemetry_engagement_ai_search_fallback() {
    await resetTelemetry();

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;
    await stubLoadURL(browser);

    await promiseSmartbarSuggestionsOpen(browser, () =>
      typeInSmartbar(browser, "tell me a joke")
    );
    await waitForSmartbarAction(browser, "chat");

    // Pick the AiChat search fallback row
    await SpecialPowers.spawn(
      browser,
      [UrlbarUtils.RESULT_TYPE.SEARCH],
      async searchResultType => {
        const smartbar = content.document
          .querySelector("ai-window")
          .shadowRoot.querySelector("#ai-window-smartbar");
        const fallbackRow = await ContentTaskUtils.waitForCondition(
          () =>
            [...smartbar.querySelectorAll(".urlbarView-row")].find(
              row =>
                row.result?.providerName == "UrlbarProviderAiChat" &&
                row.result.type == searchResultType
            ),
          "Wait for the AiChat search fallback row to render"
        );
        EventUtils.synthesizeMouseAtCenter(fallbackRow, {}, content);
      }
    );

    const events = Glean.urlbar.engagement.testGetValue() ?? [];
    const smartbarEvent = events.find(e => e.extra.sap === "smartbar");
    Assert.ok(smartbarEvent, "Should have a smartbar engagement event");
    Assert.equal(
      smartbarEvent.extra.selected_result,
      "ai_search_fallback",
      "engagement has correct selected_result"
    );
    Assert.equal(
      smartbarEvent.extra.results,
      "ai_chat,ai_search_fallback",
      "smartbar lists the correct results"
    );

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_smartbar_telemetry_abandonment_extra_keys() {
  await resetTelemetry();

  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  await typeInSmartbar(sidebarBrowser, "test");
  await SpecialPowers.spawn(sidebarBrowser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    smartbar.blur();
  });

  const events = Glean.urlbar.abandonment.testGetValue() ?? [];
  Assert.greater(events.length, 0, "Should have abandonment events");
  const smartbarEvent = events.find(e => e.extra.sap === "smartbar");
  Assert.ok(smartbarEvent, "Should have a smartbar abandonment event");

  const extra = smartbarEvent.extra;
  Assert.ok(extra.chat_id, "abandonment has chat_id");
  Assert.equal(extra.intent, "chat", "abandonment has correct intent");
  Assert.equal(
    extra.window_mode,
    "smartwindow",
    "abandonment has correct window mode"
  );
  Assert.equal(extra.location, "sidebar", "abandonment has correct location");
  Assert.equal(extra.model, expectedModel, "abandonment has correct model");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_intent_change_preview() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "test query");

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const inputCta = smartbar.querySelector("input-cta");
    const mozButton = inputCta.shadowRoot.querySelector("moz-button");
    const chevronButton = await ContentTaskUtils.waitForCondition(
      () => mozButton.shadowRoot.querySelector("#chevron-button"),
      "Wait for chevron button to be rendered"
    );

    const panelList = inputCta.shadowRoot.querySelector("panel-list");
    chevronButton.click();
    await ContentTaskUtils.waitForEvent(panelList, "shown");
  });

  const events = Glean.smartWindow.intentChangePreview.testGetValue();
  Assert.equal(events.length, 1, "intent_change_preview event recorded");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "intent_change_preview has chat_id");
  Assert.equal(
    extra.current_intent,
    "chat",
    "intent_change_preview has correct current_intent"
  );
  Assert.equal(
    extra.location,
    "fullpage",
    "intent_change_preview has correct location"
  );
  Assert.equal(
    extra.message_seq,
    "0",
    "intent_change_preview has correct message_seq"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_mention_start_inline() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  const events = Glean.smartWindow.mentionStart.testGetValue();
  Assert.equal(events.length, 1, "Should have mention_start events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "mention_start has chat_id");
  Assert.equal(
    extra.location,
    "fullpage",
    "mention_start has correct location"
  );
  Assert.equal(
    extra.mentions_available,
    "1",
    "mention_start has correct mentions_available"
  );
  Assert.equal(extra.message_seq, "0", "mention_start has correct message_seq");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_add_tabs_click() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const contextButton = smartbar.querySelector("context-icon-button");
    const button = contextButton.shadowRoot.querySelector("moz-button");
    button.click();
  });

  const events = Glean.smartWindow.addTabsClick.testGetValue();
  Assert.equal(events.length, 1, "Should have add_tabs_click events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "add_tabs_click has chat_id");
  Assert.equal(
    extra.location,
    "fullpage",
    "add_tabs_click has correct location"
  );
  Assert.equal(
    extra.message_seq,
    "0",
    "add_tabs_click has correct message_seq"
  );
  Assert.equal(
    extra.tabs_available,
    "1",
    "add_tabs_click has correct tabs_available"
  );
  Assert.equal(
    extra.tabs_preselected,
    "0",
    "add_tabs_click has correct tabs_preselected"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_mention_select_inline() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { childList: true, subtree: true },
      () => panel.querySelector("panel-item:not(.panel-section-header)")
    );
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  const events = Glean.smartWindow.mentionSelect.testGetValue();
  Assert.equal(events.length, 1, "Should have mention_select events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "mention_select has chat_id");
  Assert.equal(
    extra.location,
    "fullpage",
    "mention_select has correct location"
  );
  Assert.greater(
    Number(extra.length),
    0,
    "mention_select has length of the mention"
  );
  Assert.equal(
    extra.mentions_available,
    "1",
    "mention_select has correct mentions_available"
  );
  Assert.equal(
    extra.message_seq,
    "0",
    "mention_select has correct message_seq"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_add_tabs_selection() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const contextButton = smartbar.querySelector("context-icon-button");
    const button = contextButton.shadowRoot.querySelector("moz-button");
    button.click();

    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { childList: true, subtree: true },
      () => panel.querySelector("panel-item:not(.panel-section-header)")
    );
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  const events = Glean.smartWindow.addTabsSelection.testGetValue();
  Assert.equal(events.length, 1, "Should have add_tabs_selection events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "add_tabs_selection has chat_id");
  Assert.equal(
    extra.location,
    "fullpage",
    "add_tabs_selection has correct location"
  );
  Assert.equal(
    extra.message_seq,
    "0",
    "add_tabs_selection has correct message_seq"
  );
  Assert.equal(
    extra.tabs_available,
    "1",
    "add_tabs_selection has correct tabs_available"
  );
  Assert.equal(
    extra.tabs_preselected,
    "0",
    "add_tabs_selection has correct tabs_preselected"
  );
  Assert.equal(
    extra.tabs_selected,
    "1",
    "add_tabs_selection has correct tabs_selected"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_mention_remove_inline() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { childList: true, subtree: true },
      () => panel.querySelector("panel-item:not(.panel-section-header)")
    );
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  await waitForMentionInserted(browser);
  await resetTelemetry();

  await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);
  await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);

  const events = Glean.smartWindow.mentionRemove.testGetValue();
  Assert.equal(events.length, 1, "Should have mention_remove events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "mention_remove has chat_id");
  Assert.equal(
    extra.location,
    "fullpage",
    "mention_remove has correct location"
  );
  Assert.equal(
    extra.mentions,
    "0",
    "mention_remove has correct remaining mentions count"
  );
  Assert.equal(
    extra.message_seq,
    "0",
    "mention_remove has correct message_seq"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_smartbar_telemetry_remove_tab() {
  await resetTelemetry();

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const contextButton = smartbar.querySelector("context-icon-button");
    const button = contextButton.shadowRoot.querySelector("moz-button");
    button.click();

    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { childList: true, subtree: true },
      () => panel.querySelector("panel-item:not(.panel-section-header)")
    );
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  await resetTelemetry();

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");
    const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
    const chipContainer = smartbar.querySelector("website-chip-container");
    const chip = chipContainer.shadowRoot.querySelector("ai-website-chip");
    const removeButton = chip.shadowRoot.querySelector(".chip-remove");
    removeButton.click();
  });

  const events = Glean.smartWindow.removeTab.testGetValue();
  Assert.equal(events.length, 1, "Should have remove_tab events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "remove_tab has chat_id");
  Assert.equal(extra.location, "fullpage", "remove_tab has correct location");
  Assert.equal(extra.message_seq, "0", "remove_tab has correct message_seq");
  Assert.equal(
    extra.tabs_selected,
    "0",
    "remove_tab has correct remaining tabs count"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_telemetry_mention_remove_with_multiple_mentions() {
    await resetTelemetry();

    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "@");
    await waitForMentionsOpen(browser);

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
      const panelList = smartbar.querySelector("smartwindow-panel-list");
      const panel = panelList.shadowRoot.querySelector("panel-list");
      await ContentTaskUtils.waitForMutationCondition(
        panel,
        { childList: true, subtree: true },
        () => panel.querySelector("panel-item:not(.panel-section-header)")
      );
      const firstItem = panel.querySelector(
        "panel-item:not(.panel-section-header)"
      );
      firstItem.click();
    });

    await waitForMentionInserted(browser);

    await typeInSmartbar(browser, " @");
    await waitForMentionsOpen(browser);

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
      const panelList = smartbar.querySelector("smartwindow-panel-list");
      const panel = panelList.shadowRoot.querySelector("panel-list");
      await ContentTaskUtils.waitForMutationCondition(
        panel,
        { childList: true, subtree: true },
        () => panel.querySelector("panel-item:not(.panel-section-header)")
      );
      const firstItem = panel.querySelector(
        "panel-item:not(.panel-section-header)"
      );
      firstItem.click();
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      const smartbar = aiWindow.shadowRoot.querySelector("#ai-window-smartbar");
      const editor = smartbar.querySelector("moz-multiline-editor");

      await ContentTaskUtils.waitForMutationCondition(
        editor.shadowRoot,
        { childList: true, subtree: true },
        () => editor.shadowRoot.querySelectorAll("ai-website-chip").length === 2
      );
    });

    await resetTelemetry();

    await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);
    await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);

    const events = Glean.smartWindow.mentionRemove.testGetValue();
    Assert.equal(events.length, 1, "Should have one mention_remove event");
    Assert.equal(
      events[0].extra.mentions,
      "1",
      "mention_remove reports 1 remaining mention after removing one of two"
    );

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_smartbar_telemetry_mention_start_sidebar() {
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();
  await resetTelemetry();

  await typeInSmartbar(sidebarBrowser, "@");
  await waitForMentionsOpen(sidebarBrowser);

  const events = Glean.smartWindow.mentionStart.testGetValue();
  Assert.equal(events.length, 1, "Should have mention_start events");

  const extra = events[0].extra;
  Assert.ok(extra.chat_id, "mention_start has chat_id");
  Assert.equal(extra.location, "sidebar", "mention_start has correct location");
  Assert.equal(
    extra.mentions_available,
    "1",
    "mention_start has correct mentions_available"
  );
  Assert.equal(extra.message_seq, "0", "mention_start has correct message_seq");

  await BrowserTestUtils.closeWindow(win);
});
