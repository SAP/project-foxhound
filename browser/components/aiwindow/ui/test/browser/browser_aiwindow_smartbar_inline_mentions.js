/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for Smartbar inline @mention functionality.
 *
 * These tests verify that users can trigger and insert inline mention
 * suggestions into the Smartbar editor via the @ trigger.
 */

"use strict";

const { SmartbarMentionsPanelSearch, MENTION_TYPE } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/urlbar/SmartbarMentionsPanelSearch.sys.mjs"
  );

let providerStub;
const DEFAULT_PROVIDER_STUB_RETURN = [
  {
    url: "https://example.com/1",
    title: "Page 1",
    icon: "",
    type: MENTION_TYPE.TAB_OPEN,
    timestamp: Date.now(),
  },
  {
    url: "https://example.com/2",
    title: "Page 2",
    icon: "",
    type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
    timestamp: Date.now(),
  },
  {
    url: "https://example.com/3",
    title: "Page 3",
    icon: "",
    type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
    timestamp: Date.now() - 1000,
  },
  {
    url: "https://example.com/4",
    title: "Page 4",
    icon: "",
    type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
    timestamp: Date.now() - 2000,
  },
];

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });

  providerStub = sinon.stub(
    SmartbarMentionsPanelSearch.prototype,
    "startQuery"
  );
  providerStub.returns(DEFAULT_PROVIDER_STUB_RETURN);

  registerCleanupFunction(() => {
    providerStub.restore();
  });
});

add_task(async function test_mentions_trigger_zero_prefix() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const mentionsOpen = waitForMentionsOpen(browser);
  await typeInSmartbar(browser, "@");
  await mentionsOpen;

  Assert.ok(
    mentionsOpen,
    "Mentions should open after typing @ without leading text"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_mentions_trigger_after_text() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const mentionsOpen = waitForMentionsOpen(browser);
  await typeInSmartbar(browser, "test @");
  await mentionsOpen;

  Assert.ok(
    mentionsOpen,
    "Mentions should open after typing @ with leading text"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_mentions_suggestions_panel_shows() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const panelVisible = waitForMentionsOpen(browser);
  await typeInSmartbar(browser, "@");
  await panelVisible;

  Assert.ok(
    panelVisible,
    "Panel list should show mention suggestions after typing @"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_mentions_insert_on_click() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const waitMention = waitForMentionInserted(browser);
  await typeInSmartbar(browser, "@");
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");

    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  const hasMention = await waitMention;
  Assert.ok(
    hasMention,
    "Editor should contain a mention after clicking on a suggestion"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_mentions_insert_on_enter() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  await BrowserTestUtils.synthesizeKey("KEY_ArrowDown", {}, browser);
  await BrowserTestUtils.synthesizeKey("KEY_Enter", {}, browser);
  const hasMention = await waitForMentionInserted(browser);
  Assert.ok(hasMention, "Editor should contain a mention after pressing Enter");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_panel_shows_unified_group() {
  providerStub.returns([
    {
      url: "https://example.com/1",
      title: "Page 1",
      icon: "",
      type: MENTION_TYPE.TAB_OPEN,
      timestamp: Date.now(),
    },
    {
      url: "https://example.com/2",
      title: "Page 2",
      icon: "",
      type: MENTION_TYPE.TAB_OPEN,
      timestamp: Date.now() - 500,
    },
    {
      url: "https://example.com/3",
      title: "Page 3",
      icon: "",
      type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
      timestamp: Date.now() - 1000,
    },
  ]);

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  const groupInfo = await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");

    const headers = Array.from(panel.querySelectorAll(".panel-section-header"));
    return {
      headerCount: headers.length,
      headerL10nId: headers[0]?.getAttribute("data-l10n-id"),
    };
  });

  Assert.equal(
    groupInfo.headerCount,
    1,
    "Panel should show single unified group"
  );
  Assert.equal(
    groupInfo.headerL10nId,
    "smartbar-mentions-list-recent-tabs-label",
    "Group should have 'Recent tabs' header"
  );

  await BrowserTestUtils.closeWindow(win);
  providerStub.returns(DEFAULT_PROVIDER_STUB_RETURN);
});

add_task(async function test_deduplication_by_url() {
  // Simulate duplicate URLs across open and closed tabs
  providerStub.returns([
    {
      url: "https://example.com/duplicate",
      title: "Open Tab (Duplicate)",
      icon: "",
      type: MENTION_TYPE.TAB_OPEN,
      timestamp: Date.now(),
    },
    {
      url: "https://example.com/unique1",
      title: "Unique Open Tab",
      icon: "",
      type: MENTION_TYPE.TAB_OPEN,
      timestamp: Date.now() - 500,
    },
    {
      url: "https://example.com/duplicate",
      title: "Closed Tab (Duplicate)",
      icon: "",
      type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
      timestamp: Date.now() - 1000,
    },
    {
      url: "https://example.com/unique2",
      title: "Unique Closed Tab",
      icon: "",
      type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
      timestamp: Date.now() - 2000,
    },
  ]);

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  const itemInfo = await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const items = panelList.groups[0]?.items || [];

    return {
      itemCount: items.length,
      urls: items.map(item => item.id),
    };
  });

  Assert.equal(
    itemInfo.itemCount,
    3,
    "Should deduplicate by URL (3 unique URLs from 4 results)"
  );
  Assert.ok(
    itemInfo.urls.includes("https://example.com/duplicate"),
    "Should keep first occurrence of duplicate (open tab)"
  );
  Assert.ok(
    itemInfo.urls.includes("https://example.com/unique1"),
    "Should include unique open tab"
  );
  Assert.ok(
    itemInfo.urls.includes("https://example.com/unique2"),
    "Should include unique closed tab"
  );

  await BrowserTestUtils.closeWindow(win);
  providerStub.returns(DEFAULT_PROVIDER_STUB_RETURN);
});

add_task(async function test_maxResults_total_limit() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.mentions.maxResults", 3]],
  });

  const tabs = [];
  for (let i = 1; i <= 5; i++) {
    tabs.push({
      url: `https://example.com/tab${i}`,
      title: `Tab ${i}`,
      icon: "",
      type: MENTION_TYPE.TAB_OPEN,
      timestamp: Date.now() - i * 1000,
    });
  }
  for (let i = 1; i <= 5; i++) {
    tabs.push({
      url: `https://example.com/closed${i}`,
      title: `Closed ${i}`,
      icon: "",
      type: MENTION_TYPE.TAB_RECENTLY_CLOSED,
      timestamp: Date.now() - (i + 10) * 1000,
    });
  }

  providerStub.returns(tabs);

  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  const itemInfo = await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const groups = panelList.groups;

    const items = groups[0]?.items || [];

    return {
      totalCount: items.length,
      groupCount: groups.length,
    };
  });

  Assert.equal(itemInfo.groupCount, 1, "Should have single unified group");
  Assert.equal(
    itemInfo.totalCount,
    3,
    "Should limit total results to maxResults (3) after deduplication"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
  providerStub.returns(DEFAULT_PROVIDER_STUB_RETURN);
});

add_task(async function test_suggestions_closes_when_mentions_panel_opens() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await promiseSmartbarSuggestionsOpen(browser, () =>
    typeInSmartbar(browser, "test")
  );

  await typeInSmartbar(browser, " @");
  await waitForMentionsOpen(browser);

  await promiseSmartbarSuggestionsClose(browser);

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_suggestions_reopens_after_mentions_trigger_removed() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(browser, "test @");
    await waitForMentionsOpen(browser);

    await promiseSmartbarSuggestionsClose(browser);

    await promiseSmartbarSuggestionsOpen(browser, async () => {
      await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);
    });

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(async function test_suggestions_hidden_when_inline_mentions_exists() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await typeInSmartbar(browser, "@");
  await waitForMentionsOpen(browser);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  await waitForMentionInserted(browser);
  await typeInSmartbar(browser, " test query");

  await promiseSmartbarSuggestionsClose(browser);

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_suggestions_show_after_inline_mentions_removed() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  const mentionsOpen = waitForMentionsOpen(browser);
  await typeInSmartbar(browser, "test @");
  await mentionsOpen;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();
  });

  await waitForMentionInserted(browser);
  await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);

  await promiseSmartbarSuggestionsOpen(browser, async () => {
    await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_inline_mention_available_via_getAllMentions() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await insertInlineMention(browser);

  const mentions = await getEditorInlineMentions(browser);
  Assert.equal(mentions.length, 1, "getAllMentions should return one mention");
  Assert.equal(
    mentions[0].id,
    "https://example.com/1",
    "Mention id should match the selected tab URL"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_deleted_inline_mention_excluded_from_getAllMentions() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await insertInlineMention(browser);

    // Delete the mention by pressing Backspace twice (once for trailing space,
    // once for the atomic mention node).
    await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);
    await BrowserTestUtils.synthesizeKey("KEY_Backspace", {}, browser);

    const mentions = await getEditorInlineMentions(browser);
    Assert.equal(
      mentions.length,
      0,
      "getAllMentions should return empty after deleting the inline mention"
    );

    await BrowserTestUtils.closeWindow(win);
  }
);
