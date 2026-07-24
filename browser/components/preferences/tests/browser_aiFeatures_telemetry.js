/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_CHAT_PROVIDER_URL = "http://mochi.test:8888/";
const COMMON_TELEMETRY = {
  aiControlTranslations: "translations",
  aiControlPdfjsAltText: "pdfjsAltText",
  aiControlSmartTabGroups: "smartTabGroups",
  aiControlLinkPreviews: "linkPreviewKeyPoints",
  aiControlSidebarChatbot: "sidebarChatbot",
};

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
        ["browser.ml.chat.provider", ""],
        ["browser.translations.enable", true],
        ["browser.tabs.groups.smart.optin", true],
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
  });
});
