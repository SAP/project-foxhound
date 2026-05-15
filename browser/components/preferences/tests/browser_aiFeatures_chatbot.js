/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(2);

const TEST_CHAT_PROVIDER_URL = "http://mochi.test:8888/";

function mockSidebarChatbotUrls(providerControl) {
  let options = providerControl.inputEl.querySelectorAll("option");
  for (let option of options) {
    if (option.value.startsWith("https://")) {
      option.value = TEST_CHAT_PROVIDER_URL;
    }
  }
}

describe("settings ai features", () => {
  let doc, win;

  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.preferences.aiControls", true]],
    });
    await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
    doc = gBrowser.selectedBrowser.contentDocument;
    win = doc.ownerGlobal;
  });

  afterEach(() => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  async function openAiFeaturePanel() {
    const paneLoaded = waitForPaneChange("ai");
    const categoryButton = doc.getElementById("category-ai-features");
    categoryButton.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(categoryButton, {}, win);
    await paneLoaded;
  }

  it("can change the chatbot provider value", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.ml.chat.page", false],
        ["browser.ml.chat.provider", ""],
        ["browser.ai.control.sidebarChatbot", "available"],
      ],
    });

    const categoryButton = doc.getElementById("category-ai-features");
    Assert.ok(categoryButton, "category exists");
    Assert.ok(
      BrowserTestUtils.isVisible(categoryButton),
      "category is visible"
    );

    await openAiFeaturePanel();

    const providerControl = doc.getElementById("aiControlSidebarChatbotSelect");
    mockSidebarChatbotUrls(providerControl);
    Assert.ok(providerControl, "control exists");
    Assert.ok(
      BrowserTestUtils.isVisible(providerControl),
      "control is visible"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Pref is empty"
    );

    Assert.equal(providerControl.value, "available", "No provider set");
    Assert.equal(
      Services.prefs.getBoolPref("browser.ml.chat.page"),
      false,
      "Chatbot page is disabled"
    );

    const settingChanged = waitForSettingChange(providerControl.setting);
    providerControl.focus();
    const pickerOpened = BrowserTestUtils.waitForSelectPopupShown(
      win.docShell.chromeEventHandler.ownerGlobal
    );
    EventUtils.sendKey("space");
    await pickerOpened;
    EventUtils.sendKey("down");
    EventUtils.sendKey("down");
    EventUtils.sendKey("return");
    await settingChanged;

    Assert.equal(
      providerControl.value,
      TEST_CHAT_PROVIDER_URL,
      "Provider enabled"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      TEST_CHAT_PROVIDER_URL,
      "Chatbot provider is set"
    );
    Assert.equal(
      Services.prefs.getBoolPref("browser.ml.chat.page"),
      true,
      "Chatbot page is enabled"
    );

    await gBrowser.ownerGlobal.SidebarController.hide();
  });

  it("can change the chatbot provider from blocked", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.ml.chat.page", false],
        ["browser.ml.chat.provider", ""],
        ["browser.ai.control.sidebarChatbot", "available"],
      ],
    });

    const categoryButton = doc.getElementById("category-ai-features");
    Assert.ok(categoryButton, "category exists");
    Assert.ok(
      BrowserTestUtils.isVisible(categoryButton),
      "category is visible"
    );

    await openAiFeaturePanel();

    let providerControl = doc.getElementById("aiControlSidebarChatbotSelect");
    Assert.ok(providerControl, "control exists");
    Assert.ok(
      BrowserTestUtils.isVisible(providerControl),
      "control is visible"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Pref is empty"
    );

    Assert.equal(providerControl.value, "available", "No provider set");

    // Set chatbot to Blocked
    let settingChanged = waitForSettingChange(providerControl.setting);
    providerControl.focus();
    let pickerOpened = BrowserTestUtils.waitForSelectPopupShown(
      win.docShell.chromeEventHandler.ownerGlobal
    );
    EventUtils.sendKey("space");
    await pickerOpened;
    EventUtils.sendKey("down");
    EventUtils.sendKey("return");
    await settingChanged;

    Assert.equal(providerControl.value, "blocked", "Provider blocked");
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Chatbot provider is empty"
    );
    Assert.equal(
      Services.prefs.getBoolPref("browser.ml.chat.page"),
      false,
      "Chatbot page stays disabled when blocked"
    );

    // Refresh the page
    await openPreferencesViaOpenPreferencesAPI("ai", { leaveOpen: true });

    // Verify it's still blocked
    providerControl = doc.getElementById("aiControlSidebarChatbotSelect");
    mockSidebarChatbotUrls(providerControl);
    Assert.equal(providerControl.value, "blocked", "Provider blocked");
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Chatbot provider is empty"
    );
    Assert.equal(
      Services.prefs.getBoolPref("browser.ml.chat.page"),
      false,
      "Chatbot page stays disabled when blocked"
    );

    // Change the selection to a chatbot
    settingChanged = waitForSettingChange(providerControl.setting);
    providerControl.focus();
    pickerOpened = BrowserTestUtils.waitForSelectPopupShown(
      win.docShell.chromeEventHandler.ownerGlobal
    );
    EventUtils.sendKey("space");
    await pickerOpened;
    EventUtils.sendKey("down");
    EventUtils.sendKey("return");
    await settingChanged;

    Assert.equal(
      providerControl.value,
      TEST_CHAT_PROVIDER_URL,
      "Provider enabled"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      TEST_CHAT_PROVIDER_URL,
      "Chatbot provider is set"
    );
    Assert.equal(
      Services.prefs.getBoolPref("browser.ml.chat.page"),
      true,
      "Chatbot page is enabled"
    );

    // Calling openPreferencesViaOpenPreferencesAPI again opened a blank tab
    BrowserTestUtils.removeTab(gBrowser.selectedTab);

    await gBrowser.ownerGlobal.SidebarController.hide();
    await SpecialPowers.popPrefEnv();
  });

  it("changes chatbot provider when the underlying pref changes", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.ml.chat.provider", ""],
        ["browser.ai.control.sidebarChatbot", "available"],
      ],
    });

    const categoryButton = doc.getElementById("category-ai-features");
    Assert.ok(categoryButton, "category exists");
    Assert.ok(
      BrowserTestUtils.isVisible(categoryButton),
      "category is visible"
    );

    await openAiFeaturePanel();

    const providerControl = doc.getElementById("aiControlSidebarChatbotSelect");
    mockSidebarChatbotUrls(providerControl);
    Assert.ok(providerControl, "control exists");
    Assert.ok(
      BrowserTestUtils.isVisible(providerControl),
      "control is visible"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Pref is empty"
    );
    Assert.equal(providerControl.value, "available", "No provider set");

    let settingChanged = waitForSettingChange(providerControl.setting);
    Services.prefs.setStringPref(
      "browser.ml.chat.provider",
      TEST_CHAT_PROVIDER_URL
    );
    await settingChanged;

    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      TEST_CHAT_PROVIDER_URL,
      "Pref is set to provider URL"
    );
    Assert.equal(
      providerControl.value,
      TEST_CHAT_PROVIDER_URL,
      "Select is set to provider URL"
    );

    settingChanged = waitForSettingChange(providerControl.setting);
    Services.prefs.setStringPref("browser.ml.chat.provider", "");
    await settingChanged;

    Assert.equal(
      Services.prefs.getStringPref("browser.ml.chat.provider"),
      "",
      "Pref is cleared"
    );
    Assert.equal(
      providerControl.value,
      "available",
      "Select is back to available"
    );

    await gBrowser.ownerGlobal.SidebarController.hide();
    await SpecialPowers.popPrefEnv();
  });
});
