/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for Smartbar mentions functionality.
 *
 * These tests verify that users can trigger and insert mention suggestions into
 * the Smartbar editor.
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

/**
 * Wait for mentions to be open.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<boolean>} True if mentions are open
 */
async function waitForMentionsOpen(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");

    await ContentTaskUtils.waitForCondition(
      () => editor.isHandlingMentions,
      "Wait for mentions to open"
    );

    return editor.isHandlingMentions;
  });
}

/**
 * Wait for panel list to be visible.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<boolean>} True if panel is visible
 */
async function waitForPanelOpen(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");

    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { attributes: true, attributeFilter: ["open"] },
      () => panel.hasAttribute("open")
    );

    return panel.hasAttribute("open");
  });
}

/**
 * Wait for a mention to be inserted.
 *
 * @param {MozBrowser} browser - The browser element
 * @returns {Promise<boolean>} True if the mention exists
 */
async function waitForMentionInserted(browser) {
  return SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const editor = smartbar.querySelector("moz-multiline-editor");

    await ContentTaskUtils.waitForMutationCondition(
      editor.shadowRoot,
      { childList: true, subtree: true },
      () => editor.shadowRoot.querySelector("ai-website-chip") !== null
    );

    return !!editor.shadowRoot.querySelector("ai-website-chip");
  });
}

add_task(async function test_mentions_trigger_zero_prefix() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;
  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

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
  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

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
  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  const panelVisible = waitForPanelOpen(browser);
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
  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

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
  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  const waitPanel = SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    const panelList = smartbar.querySelector("smartwindow-panel-list");
    const panel = panelList.shadowRoot.querySelector("panel-list");

    await ContentTaskUtils.waitForMutationCondition(
      panel,
      { childList: true, subtree: true },
      () => panel.querySelector("panel-item:not(.panel-section-header)")
    );
  });
  await typeInSmartbar(browser, "@");
  await waitPanel;

  await BrowserTestUtils.synthesizeKey("KEY_ArrowDown", {}, browser);
  await BrowserTestUtils.synthesizeKey("KEY_Enter", {}, browser);
  const hasMention = await waitForMentionInserted(browser);
  Assert.ok(hasMention, "Editor should contain a mention after pressing Enter");

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_mentions_insert_from_context_button() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
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

    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    Assert.equal(
      chipContainer.websites.length,
      1,
      "Context mention should be in smartbar header in fullpage mode"
    );
  });

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

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
  await typeInSmartbar(browser, "@");
  await waitForPanelOpen(browser);

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

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
  await typeInSmartbar(browser, "@");
  await waitForPanelOpen(browser);

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

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
  await typeInSmartbar(browser, "@");
  await waitForPanelOpen(browser);

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

add_task(async function test_default_context_chip_sidebar_mode() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
    // TODO (Bug 2017728): Update this test to open the sidebar via AIWindowUI.openSidebar()
    smartbar.isSidebarMode = true;

    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    Assert.ok(chipContainer, "Website chip container exists");

    await ContentTaskUtils.waitForMutationCondition(
      chipContainer,
      { childList: true, subtree: true },
      () =>
        Array.isArray(chipContainer.websites) &&
        chipContainer.websites.length === 1
    );

    Assert.equal(
      chipContainer.websites[0].url,
      "chrome://browser/content/aiwindow/aiWindow.html",
      "Default chip url matches current tab URL"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_no_default_context_chip_fullpage_mode() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    Assert.equal(
      chipContainer.websites.length,
      0,
      "No default context mention should be in smartbar header in fullpage mode"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_context_mentions_added_smartbar_header_fullpage() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );
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

    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    const firstItem = panel.querySelector(
      "panel-item:not(.panel-section-header)"
    );
    firstItem.click();

    Assert.equal(
      chipContainer.websites.length,
      1,
      "Context mention should be added to smartbar header in fullpage mode"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_context_mentions_added_smartbar_header_sidebar() {
  const win = await openAIWindow();
  AIWindowUI.toggleSidebar(win);
  const browser = win.document.getElementById("ai-window-browser");

  await SpecialPowers.spawn(browser, [], async () => {
    const smartbar = await ContentTaskUtils.waitForCondition(() => {
      const aiWindowElement = content.document.querySelector("ai-window");
      return aiWindowElement?.shadowRoot?.querySelector("#ai-window-smartbar");
    }, "Sidebar smartbar should be loaded");
    const contextButton = smartbar.querySelector("context-icon-button");
    const button = contextButton.shadowRoot.querySelector("moz-button");

    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    Assert.equal(
      chipContainer.websites.length,
      1,
      "Should have default tab mention in smartbar header in sidebar mode"
    );
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

    Assert.equal(
      chipContainer.websites.length,
      2,
      "Context mention should be added to smartbar header in sidebar mode"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_context_mentions_not_duplicated_in_smartbar_header() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      const chipContainer = smartbar.querySelector(
        ".smartbar-context-chips-header"
      );

      smartbar.addContextMention({
        type: "tab",
        url: "https://example.com/1",
        label: "Page 1",
      });
      smartbar.addContextMention({
        type: "tab",
        url: "https://example.com/1",
        label: "Page 1",
      });

      Assert.equal(
        chipContainer.websites.length,
        1,
        "Duplicate context mention should not be added to smartbar header"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_context_mentions_can_be_removed_from_smartbar_header() {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);

    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );

      const testUrl = "https://example.com/";
      smartbar.addContextMention({
        type: "tab",
        url: testUrl,
        label: "Removable Page",
      });
      const chipContainer = smartbar.querySelector(
        ".smartbar-context-chips-header"
      );
      Assert.equal(
        chipContainer.websites.length,
        1,
        "Should have context mention in smartbar header"
      );
      await ContentTaskUtils.waitForMutationCondition(
        chipContainer.shadowRoot,
        { childList: true, subtree: true },
        () => chipContainer.shadowRoot.querySelector("ai-website-chip")
      );
      const websiteChip =
        chipContainer.shadowRoot.querySelector("ai-website-chip");
      const removeButton = websiteChip.shadowRoot.querySelector(".chip-remove");
      removeButton.click();

      Assert.equal(
        chipContainer.websites.length,
        0,
        "Context mention should be removed from smartbar header"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  }
);
