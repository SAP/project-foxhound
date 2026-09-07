/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_smart_window.js", gTestPath).href,
  this
);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.preferences.aiControls", true],
      ["browser.ai.control.default", "available"],
      ["browser.ai.control.smartWindow", "default"],
      ["browser.smartwindow.enabled", true],
    ],
  });
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(
    "browser.smartwindow.memories.generateFromHistory"
  );
  Services.prefs.clearUserPref(
    "browser.smartwindow.memories.generateFromConversation"
  );
});

describe("settings AI Controls - Smart Window block modal", () => {
  let doc, win;

  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.tos.consentTime", 1770830464],
        ["browser.ai.control.smartWindow", "default"],
      ],
    });
    await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
    doc = gBrowser.selectedBrowser.contentDocument;
    win = doc.documentGlobal;
    await openAiFeaturePanel(doc, win);
  });

  afterEach(async () => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    const { ChatStore } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs"
    );
    const { MemoryStore } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
    );
    for (const convo of await ChatStore.findRecentConversations(1)) {
      await ChatStore.deleteConversationById(convo.id).catch(() => {});
    }
    for (const { id } of await MemoryStore.getMemories()) {
      await MemoryStore.hardDeleteMemory(id).catch(() => {});
    }
  });

  it("shows block modal when selecting blocked with existing data", async () => {
    await addMemory();
    const { dialogEl } = await triggerBlockAndWaitForDialog(doc, win);
    Assert.ok(dialogEl.dialog.open, "Block confirmation dialog is open");
    Assert.equal(
      dialogEl.headingL10nId,
      "smart-window-block-title",
      "Dialog uses Smart Window heading"
    );
  });

  it("shows both description when user has chats and memories", async () => {
    await addChat();
    await addMemory();
    const { dialogEl } = await triggerBlockAndWaitForDialog(doc, win);
    Assert.equal(
      dialogEl.descriptionL10nId,
      "smart-window-block-description-both",
      "Description references both chats and memories"
    );
  });

  it("shows chats only description when user has only chats", async () => {
    await addChat();
    const { dialogEl } = await triggerBlockAndWaitForDialog(doc, win);
    Assert.equal(
      dialogEl.descriptionL10nId,
      "smart-window-block-description-chats",
      "Description references only chats"
    );
  });

  it("shows memories only description when user has only memories", async () => {
    await addMemory();
    const { dialogEl } = await triggerBlockAndWaitForDialog(doc, win);
    Assert.equal(
      dialogEl.descriptionL10nId,
      "smart-window-block-description-memories",
      "Description references only memories"
    );
  });

  it("does not set pref to blocked on cancel", async () => {
    await addMemory();
    const { dialogEl } = await triggerBlockAndWaitForDialog(doc, win);

    const dialogClosed = BrowserTestUtils.waitForEvent(
      dialogEl.shadowRoot.querySelector("dialog"),
      "toggle"
    );
    EventUtils.synthesizeMouseAtCenter(dialogEl.cancelButton, {}, win);
    await dialogClosed;

    Assert.ok(!dialogEl.dialog.open, "Dialog is closed after cancel");
    Assert.notEqual(
      Services.prefs.getStringPref("browser.ai.control.smartWindow", ""),
      "blocked",
      "Pref not changed to blocked after cancel"
    );
  });

  it("skips modal and blocks directly when there is no data", async () => {
    const setting = win.Preferences.getSetting("aiControlSmartWindowSelect");
    const dialogEl = doc.querySelector("block-ai-confirmation-dialog");
    await dialogEl.updateComplete;

    setting.userChange("blocked");
    await TestUtils.waitForCondition(
      () =>
        Services.prefs.getStringPref("browser.ai.control.smartWindow", "") ===
        "blocked",
      "Waiting for pref to be set to blocked"
    );
    Assert.ok(
      !dialogEl.dialog.open,
      "No dialog modal shown when no data to delete"
    );
  });

  it("clears memories on confirm when user has only memories", async () => {
    const { MemoryStore } = await addMemory();
    const { setting, dialogEl } = await triggerBlockAndWaitForDialog(doc, win);

    await waitForSettingChange(setting, () =>
      EventUtils.synthesizeMouseAtCenter(dialogEl.confirmButton, {}, win)
    );
    await TestUtils.waitForCondition(
      async () => (await MemoryStore.getMemories()).length === 0,
      "Waiting for memories to be cleared"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ai.control.smartWindow"),
      "blocked",
      "Pref is set to blocked after confirm"
    );
  });

  it("clears chats on confirm when user has only chats", async () => {
    const { ChatStore } = await addChat();
    const { setting, dialogEl } = await triggerBlockAndWaitForDialog(doc, win);

    await waitForSettingChange(setting, () =>
      EventUtils.synthesizeMouseAtCenter(dialogEl.confirmButton, {}, win)
    );
    await TestUtils.waitForCondition(
      async () => (await ChatStore.findRecentConversations(10)).length === 0,
      "Waiting for chats to be cleared"
    );
    Assert.equal(
      Services.prefs.getStringPref("browser.ai.control.smartWindow"),
      "blocked",
      "Pref is set to blocked after confirm"
    );
  });
});
