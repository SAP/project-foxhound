/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for Smartbar context chip header functionality.
 *
 * These tests verify the context chip header: the implicit current-tab chip,
 * adding/removing chips via the "+" button, and clearing chips on chat submit.
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

add_task(async function test_mentions_insert_from_context_button() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

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

add_task(async function test_default_context_chip_sidebar_mode() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

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
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  await SpecialPowers.spawn(sidebarBrowser, [], async () => {
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

add_task(async function test_inline_mention_does_not_create_context_chip() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await insertInlineMention(browser);

  const chips = await getSmartbarContextChips(browser);
  Assert.equal(
    chips.length,
    0,
    "Inline @mention should not create a context chip in the smartbar header"
  );

  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_context_mentions_cleared_after_chat_submit() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    smartbar.addContextMention({
      type: "tab",
      url: "https://example.com/1",
      label: "Page 1",
    });

    const chipContainer = smartbar.querySelector(
      ".smartbar-context-chips-header"
    );
    Assert.equal(
      chipContainer.websites.length,
      1,
      "Should have one context mention before submit"
    );
  });

  await typeInSmartbar(browser, "tell me a joke");
  await submitSmartbar(browser);

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
      "Context mentions should be cleared after chat submit"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_implicit_chip_persists_after_chat_submit_in_sidebar() {
    const { win, sidebarBrowser } = await openAIWindowWithSidebar();

    const implicitUrl = await SpecialPowers.spawn(
      sidebarBrowser,
      [],
      async () => {
        const smartbar = await ContentTaskUtils.waitForCondition(() => {
          const aiWindowElement = content.document.querySelector("ai-window");
          return aiWindowElement?.shadowRoot?.querySelector(
            "#ai-window-smartbar"
          );
        }, "Sidebar smartbar should be loaded");

        const chipContainer = smartbar.querySelector(
          ".smartbar-context-chips-header"
        );

        await ContentTaskUtils.waitForMutationCondition(
          chipContainer,
          { childList: true, subtree: true },
          () =>
            Array.isArray(chipContainer.websites) &&
            chipContainer.websites.length === 1
        );

        const url = chipContainer.websites[0].url;

        smartbar.addContextMention({
          type: "tab",
          url: "https://example.com/1",
          label: "Page 1",
        });
        Assert.equal(
          chipContainer.websites.length,
          2,
          "Should have implicit chip plus one explicit chip"
        );

        return url;
      }
    );

    await typeInSmartbar(sidebarBrowser, "tell me a joke");
    await submitSmartbar(sidebarBrowser);

    await SpecialPowers.spawn(sidebarBrowser, [implicitUrl], async url => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = aiWindowElement.shadowRoot.querySelector(
        "#ai-window-smartbar"
      );
      const chipContainer = smartbar.querySelector(
        ".smartbar-context-chips-header"
      );

      Assert.equal(
        chipContainer.websites.length,
        1,
        "Only the implicit chip should remain after chat submit"
      );
      Assert.equal(
        chipContainer.websites[0].url,
        url,
        "Remaining chip should be the implicit current-tab chip"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_removed_implicit_chip_stays_removed_after_chat_submit() {
    const { win, sidebarBrowser } = await openAIWindowWithSidebar();

    await SpecialPowers.spawn(sidebarBrowser, [], async () => {
      const smartbar = await ContentTaskUtils.waitForCondition(() => {
        const aiWindowElement = content.document.querySelector("ai-window");
        return aiWindowElement?.shadowRoot?.querySelector(
          "#ai-window-smartbar"
        );
      }, "Sidebar smartbar should be loaded");

      const chipContainer = smartbar.querySelector(
        ".smartbar-context-chips-header"
      );

      await ContentTaskUtils.waitForMutationCondition(
        chipContainer,
        { childList: true, subtree: true },
        () =>
          Array.isArray(chipContainer.websites) &&
          chipContainer.websites.length === 1
      );

      const implicitUrl = chipContainer.websites[0].url;
      smartbar.removeContextMention(implicitUrl);
      Assert.equal(
        chipContainer.websites.length,
        0,
        "Implicit chip should be removed"
      );
    });

    await typeInSmartbar(sidebarBrowser, "tell me a joke");
    await submitSmartbar(sidebarBrowser);

    await SpecialPowers.spawn(sidebarBrowser, [], async () => {
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
        "Implicit chip should stay removed after chat submit"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  }
);
