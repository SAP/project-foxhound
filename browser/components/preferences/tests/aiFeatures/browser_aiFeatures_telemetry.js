/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_smart_window.js", gTestPath).href,
  this
);

const TEST_CHAT_PROVIDER_URL = "http://mochi.test:8888/";
const { AIWindowUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/ui/modules/AIWindowUI.sys.mjs"
);

describe("AI Controls telemetry", () => {
  let doc;

  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.preferences.aiControls", true],
        ["browser.ai.control.default", "available"],
        ["browser.ai.control.translations", "default"],
        ["browser.ai.control.pdfjsAltText", "default"],
        ["browser.ai.control.smartTabGroups", "default"],
        ["browser.ai.control.linkPreviewKeyPoints", "default"],
        ["browser.ai.control.sidebarChatbot", "default"],
        ["browser.ai.control.smartWindow", "default"],
        ["browser.ml.chat.provider", ""],
        ["browser.translations.enable", true],
        // Prevent the sidebar from auto-opening when browser.ml.chat.provider is
        // restored by SpecialPowers during pref cleanup after the sidebarChatbot test
        ["browser.ml.chat.openSidebarOnProviderChange", false],
        ["browser.tabs.groups.smart.optin", true],
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.tos.consentTime", 1770830464],
        ["browser.smartwindow.memories.generateFromHistory", false],
        ["browser.smartwindow.memories.generateFromConversation", false],
      ],
    });
    Services.fog.testResetFOG();
    await openPreferencesViaOpenPreferencesAPI("ai", { leaveOpen: true });
    doc = gBrowser.selectedBrowser.contentDocument;
  });

  afterEach(() => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  it("records no event before interaction", async () => {
    Assert.equal(
      Glean.browser.aiControlChanged.testGetValue(),
      null,
      "No events recorded before any interaction"
    );
  });

  it("records events when translations set to blocked", async () => {
    let selectEl = doc.getElementById("aiControlTranslationsSelect");
    await changeMozSelectValue(selectEl, "blocked");

    let events = Glean.browser.aiControlChanged.testGetValue();
    Assert.equal(events.length, 1, "One event recorded");
    Assert.equal(
      events[0].extra.feature,
      "translations",
      "Feature is translations"
    );
    Assert.equal(events[0].extra.selection, "blocked", "Selection is blocked");
  });

  it("records event when smartTabGroups set to enabled", async () => {
    let selectEl = doc.getElementById("aiControlSmartTabGroupsSelect");
    await changeMozSelectValue(selectEl, "enabled");

    let events = Glean.browser.aiControlChanged.testGetValue();
    Assert.equal(events.length, 1, "One event recorded");
    Assert.equal(
      events[0].extra.feature,
      "smartTabGroups",
      "Feature is smartTabGroups"
    );
    Assert.equal(events[0].extra.selection, "enabled", "Selection is enabled");
  });

  it("records event when sidebarChatbot set to blocked", async () => {
    let selectEl = doc.getElementById("aiControlSidebarChatbotSelect");
    await changeMozSelectValue(selectEl, "blocked");

    let options = selectEl.querySelectorAll("moz-option");
    // Last one is a chatbot, mock its URL to avoid network requets
    let chatbotOption = options[options.length - 1];
    chatbotOption.value = TEST_CHAT_PROVIDER_URL;
    await chatbotOption.updateComplete;
    await selectEl.updateComplete;
    await changeMozSelectValue(selectEl, TEST_CHAT_PROVIDER_URL);

    let events = Glean.browser.aiControlChanged.testGetValue();
    Assert.equal(events.length, 2, "Two events recorded");
    Assert.equal(
      events[0].extra.feature,
      "sidebarChatbot",
      "Feature is sidebarChatbot"
    );
    Assert.equal(events[0].extra.selection, "blocked", "Selection is blocked");
    Assert.equal(
      events[1].extra.feature,
      "sidebarChatbot",
      "Feature is sidebarChatbot"
    );
    Assert.equal(events[1].extra.selection, "enabled", "Selection is enabled");

    await SidebarController.hide();
  });

  async function waitForBlockDialog() {
    const dialogEl = doc.querySelector("block-ai-confirmation-dialog");
    await dialogEl.updateComplete;
    await BrowserTestUtils.waitForEvent(dialogEl.dialog, "toggle");
    await dialogEl.updateComplete;
    return dialogEl;
  }

  it("records events when smart window status changes", async () => {
    await addMemory();

    let selectEl = doc.getElementById("aiControlSmartWindowSelect");
    let blockDialogShown = waitForBlockDialog();

    // Use changeMozSelectValue instead of native select popup interaction
    changeMozSelectValue(selectEl, "blocked");
    let dialogEl = await blockDialogShown;

    // Verify no telemetry event is recorded on dialog open.
    let events = Glean.browser.aiControlChanged.testGetValue();
    Assert.ok(!events, "No events recorded");

    // Confirm the block.
    await waitForSettingChange(selectEl.setting, () =>
      EventUtils.synthesizeMouseAtCenter(
        dialogEl.confirmButton,
        {},
        dialogEl.documentGlobal
      )
    );

    // Verify confirmed blocked telemetry event is recorded.
    events = Glean.browser.aiControlChanged.testGetValue();
    Assert.equal(events.length, 1, "One event recorded");
    Assert.equal(
      events[0].extra.feature,
      "smartWindow",
      "Feature is smartWindow"
    );
    Assert.equal(events[0].extra.selection, "blocked", "Selection is blocked");

    // Verify available telemetry event is recorded.
    await changeMozSelectValue(selectEl, "available");

    events = Glean.browser.aiControlChanged.testGetValue();
    Assert.equal(events.length, 2, "Two events recorded");
    Assert.equal(
      events[1].extra.feature,
      "smartWindow",
      "Feature is smartWindow"
    );
    Assert.equal(
      events[1].extra.selection,
      "available",
      "Selection is available"
    );
  });
});
