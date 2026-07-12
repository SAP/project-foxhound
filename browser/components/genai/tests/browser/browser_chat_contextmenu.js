/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Bug 1895789 to standarize contextmenu helpers in BrowserTestUtils
async function openContextMenu(doc = document) {
  const contextMenu = doc.getElementById("contentAreaContextMenu");
  const promise = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  await BrowserTestUtils.synthesizeMouse(
    null,
    0,
    0,
    { type: "contextmenu" },
    doc.documentGlobal.gBrowser.selectedBrowser
  );
  await promise;
}

async function hideContextMenu(doc = document) {
  const contextMenu = doc.getElementById("contentAreaContextMenu");
  const promise = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await promise;
}

async function waitMenuState(menu, shouldHide, description) {
  await TestUtils.waitForCondition(() => {
    return menu && menu.hidden === shouldHide;
  }, description);
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("browser.ml.chat.page.menuBadge");
});

/**
 * Check that chat context menu is shown with appropriate prefs set
 */
add_task(async function test_hidden_menu() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.chat.page", false]],
  });

  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await openContextMenu();

    await this.waitMenuState(
      document.getElementById("context-ask-chat"),
      true,
      "Menu should be hidden"
    );

    Assert.ok(
      document.getElementById("context-ask-chat").hidden,
      "Ask chat menu is hidden"
    );
    await hideContextMenu();
  });
  // Test is using new page feature functionality
  await SpecialPowers.popPrefEnv();
});

/**
 * Check that the chat context menu is hidden by default
 */
add_task(async function test_menu_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.chat.provider", "http://localhost:8080"]],
  });
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await openContextMenu();

    await this.waitMenuState(
      document.getElementById("context-ask-chat"),
      false,
      "Menu should be visible"
    );

    Assert.ok(
      !document.getElementById("context-ask-chat").hidden,
      "Ask chat menu is shown"
    );
    await hideContextMenu();
  });
});

/**
 * Check that the remove option resets provider
 */
add_task(async function test_remove_option() {
  Services.fog.testResetFOG();
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    await openContextMenu();
    Assert.ok(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "Provider is set"
    );

    await this.waitMenuState(
      document.getElementById("context-ask-chat"),
      false,
      "Menu should be visible"
    );

    const menu = document.getElementById("context-ask-chat");
    menu.getItemAtIndex(menu.itemCount - 1).click();

    await hideContextMenu();

    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Provider reset"
    );

    const events = Glean.genaiChatbot.contextmenuRemove.testGetValue();
    Assert.equal(events.length, 1, "One remove event recorded");
    Assert.equal(events[0].extra.provider, "localhost", "Provider recorded");
  });
});

/**
 * Check that the chat context menu is hidden in popup windows because
 * they don't have a sidebar
 */
add_task(async function test_hidden_in_popup() {
  await BrowserTestUtils.withNewTab("https://example.com", async browser => {
    const popupWindowPromise = BrowserTestUtils.waitForNewWindow();
    await SpecialPowers.spawn(browser, [], () => {
      content.open("https://example.com", "_blank", "popup");
    });
    const popupWin = await popupWindowPromise;

    await openContextMenu(popupWin.document);
    await waitMenuState(
      popupWin.document.getElementById("context-ask-chat"),
      true,
      "Menu should be hidden in popup"
    );
    await hideContextMenu(popupWin.document);

    await BrowserTestUtils.closeWindow(popupWin);
  });
});

/**
 * Check that the chat context menu is hidden inside a Smart Window,
 * both directly and when accessed from a sidebar panel sub-window.
 */
add_task(async function test_visible_in_smart_window() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", "http://localhost:8080"],
      ["browser.ml.chat.shortcuts.smartwindow", true],
    ],
  });

  const { GenAI } = ChromeUtils.importESModule(
    "resource:///modules/GenAI.sys.mjs"
  );
  const menu = document.getElementById("context-ask-chat");
  const aiWindowDoc = {
    documentElement: { hasAttribute: attr => attr === "ai-window" },
  };
  const buildMenu = async (
    documentGlobal,
    selectionInfo = { text: "selected" }
  ) => {
    let hidden = null;
    await GenAI.buildAskChatMenu(menu, {
      browser: {
        browsingContext: { currentURI: { spec: "https://example.com" } },
        documentGlobal,
      },
      selectionInfo,
      showItem: (item, show) => {
        hidden = !show;
      },
      source: "page",
      contextTabs: null,
    });
    return hidden;
  };

  Assert.ok(
    !(await buildMenu({ document: aiWindowDoc })),
    "Menu shown when documentGlobal is the Smart Window with selection"
  );
  Assert.ok(
    !(await buildMenu({
      document: { documentElement: { hasAttribute: () => false } },
      browsingContext: { topChromeWindow: { document: aiWindowDoc } },
    })),
    "Menu shown when documentGlobal is a sidebar sub-window inside a Smart Window with selection"
  );
  Assert.ok(
    await buildMenu({ document: aiWindowDoc }, {}),
    "Menu hidden in Smart Window when there is no selection"
  );

  await SpecialPowers.popPrefEnv();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", "http://localhost:8080"],
      ["browser.ml.chat.shortcuts.smartwindow", false],
    ],
  });

  Assert.ok(
    await buildMenu({ document: aiWindowDoc }),
    "Menu hidden in Smart Window when smartwindow shortcuts pref is off"
  );

  await SpecialPowers.popPrefEnv();
});

/**
 * Check that handleAskChat submits to Smart Window when selection is from a sidebar sub-window
 */
add_task(async function test_smart_window_sidebar_ask_chat() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.chat.shortcuts.smartwindow", true]],
  });

  const { GenAI } = ChromeUtils.importESModule(
    "resource:///modules/GenAI.sys.mjs"
  );
  const { sinon } = ChromeUtils.importESModule(
    "resource://testing-common/Sinon.sys.mjs"
  );
  const { AIWindowUI } = ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
  );

  const submitChatMessage = sinon.stub();
  const isSidebarOpenStub = sinon
    .stub(AIWindowUI, "isSidebarOpen")
    .returns(true);
  const getSidebarAiWindowStub = sinon
    .stub(AIWindowUI, "_getSidebarAiWindow")
    .returns({ submitChatMessage });

  const aiWindowDoc = {
    documentElement: { hasAttribute: attr => attr === "ai-window" },
  };

  await GenAI.handleAskChat(
    { id: "summarize", label: "Summarize" },
    {
      window: {
        browsingContext: {
          topChromeWindow: { document: aiWindowDoc },
        },
      },
      selection: "hello",
      contentType: "selection",
      entry: "page",
    }
  );

  Assert.ok(
    submitChatMessage.calledOnce,
    "submitChatMessage called from sidebar sub-window"
  );
  Assert.equal(
    submitChatMessage.firstCall.args[0].text,
    "Summarize: hello",
    "Prompt is label + selection"
  );

  isSidebarOpenStub.restore();
  getSidebarAiWindowStub.restore();

  await SpecialPowers.popPrefEnv();
});

/**
 * Check tab behavior of chat menu items without sidebar pref
 */
add_task(async function test_open_tab() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", "http://localhost:8080"],
      ["browser.ml.chat.sidebar", false],
      ["browser.ml.chat.page", false],
    ],
  });
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    const origTabs = gBrowser.tabs.length;
    await openContextMenu();
    await BrowserTestUtils.switchTab(gBrowser, () =>
      document.getElementById("context-ask-chat").getItemAtIndex(0).click()
    );
    await hideContextMenu();

    Assert.equal(gBrowser.tabs.length, origTabs + 1, "Chat opened tabs");
    Assert.ok(!SidebarController.isOpen, "Chat did not open sidebar");
    gBrowser.removeTab(gBrowser.selectedTab);
    await SpecialPowers.popPrefEnv();
  });
});

/**
 * Check sidebar behavior of chat menu items with sidebar pref
 */
add_task(async function test_open_sidebar() {
  Services.fog.testResetFOG();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.provider", "http://localhost:8080"],
      ["browser.ml.chat.sidebar", true],
      ["browser.ml.chat.page", false],
    ],
  });
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    const origTabs = gBrowser.tabs.length;
    await openContextMenu();
    document.getElementById("context-ask-chat").getItemAtIndex(0).click();
    await hideContextMenu();

    Assert.equal(gBrowser.tabs.length, origTabs, "Chat did not open tab");
    Assert.ok(SidebarController.isOpen, "Chat opened sidebar");
    SidebarController.hide();
  });

  let events = Glean.genaiChatbot.contextmenuPromptClick.testGetValue();
  Assert.equal(events.length, 1, "One context menu click");
  Assert.equal(events[0].extra.prompt, "summarize", "Picked summarize");
  Assert.equal(events[0].extra.provider, "localhost", "With localhost");
  Assert.equal(events[0].extra.selection, "0", "No selection");

  events = Glean.genaiChatbot.promptClick.testGetValue();
  Assert.equal(events.length, 1, "One context menu click");
  Assert.equal(events[0].extra.content_type, "selection", "Using selection");
  Assert.equal(events[0].extra.prompt, "summarize", "Picked summarize");
  Assert.equal(events[0].extra.provider, "localhost", "With localhost");
  Assert.equal(events[0].extra.selection, "0", "No selection");
  Assert.equal(events[0].extra.source, "page", "From page menu");

  await SpecialPowers.popPrefEnv();
});

/**
 * Check modified prompts record as custom
 */
add_task(async function test_custom_prompt() {
  Services.fog.testResetFOG();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.ml.chat.prompts.0", JSON.stringify({ id: "prompt" })],
      ["browser.ml.chat.provider", "http://localhost:8080"],
      ["browser.ml.chat.sidebar", true],
    ],
  });
  await BrowserTestUtils.withNewTab("https://example.com", async () => {
    await openContextMenu();

    await this.waitMenuState(
      document.getElementById("context-ask-chat"),
      false,
      "Menu should be visible"
    );

    document.getElementById("context-ask-chat").getItemAtIndex(0).click();
    await hideContextMenu();
    SidebarController.hide();
  });

  Assert.equal(
    Glean.genaiChatbot.contextmenuPromptClick.testGetValue()[0].extra.prompt,
    "custom",
    "Custom id replaced with 'custom'"
  );

  await SpecialPowers.popPrefEnv();
});
