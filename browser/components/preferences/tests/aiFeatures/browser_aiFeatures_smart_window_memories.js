/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_smart_window.js", gTestPath).href,
  this
);

describe("settings ai features / Smart Window memories", () => {
  let doc, win;

  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.preferences.aiControls", true],
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.tos.consentTime", 1770830464],
      ],
    });
  });

  afterEach(() => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  it("toggles chat and browsing memory controls and shows correct empty states", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.memories.generateFromConversation", false],
        ["browser.smartwindow.memories.generateFromHistory", false],
      ],
    });

    ({ doc, win } = await openSmartWindowPanel());

    const chatCheckbox = doc.getElementById("learnFromChatActivity");
    Assert.ok(!chatCheckbox.checked, "Chat checkbox is unchecked initially");

    chatCheckbox.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(chatCheckbox.labelEl, {}, win);
    await chatCheckbox.updateComplete;

    Assert.ok(
      Services.prefs.getBoolPref(
        "browser.smartwindow.memories.generateFromConversation"
      ),
      "Chat preference is now true"
    );
    Assert.ok(chatCheckbox.checked, "Chat checkbox is now checked");

    const browsingCheckbox = doc.getElementById("learnFromBrowsingActivity");
    Assert.ok(
      !browsingCheckbox.checked,
      "Browsing checkbox is unchecked initially"
    );

    browsingCheckbox.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(browsingCheckbox.labelEl, {}, win);
    await browsingCheckbox.updateComplete;

    Assert.ok(
      Services.prefs.getBoolPref(
        "browser.smartwindow.memories.generateFromHistory"
      ),
      "Browsing preference is now true"
    );
    Assert.ok(browsingCheckbox.checked, "Browsing checkbox is now checked");

    // Verify manage memories pane shows learning-off empty state when both
    // memory generation prefs are disabled.
    const manageButton = doc.getElementById("manageMemoriesButton");
    manageButton.scrollIntoView();
    const paneLoaded = waitForPaneChange("manageMemories");
    EventUtils.synthesizeMouseAtCenter(manageButton, {}, win);
    await paneLoaded;

    let noMemoriesItem = doc.getElementById("no-memories-stored");
    Assert.ok(noMemoriesItem, "No memories item exists");
    Assert.ok(
      BrowserTestUtils.isVisible(noMemoriesItem),
      "No memories item is visible"
    );

    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.memories.generateFromConversation", false],
        ["browser.smartwindow.memories.generateFromHistory", false],
      ],
    });

    const memoriesList = doc.getElementById("memoriesList");
    if (memoriesList?.setting?.config?.asyncSetting) {
      memoriesList.setting.config.asyncSetting.emitChange();
    }

    await TestUtils.waitForTick();

    noMemoriesItem = doc.getElementById("no-memories-stored");
    Assert.ok(noMemoriesItem, "No memories item exists");
    Assert.equal(
      noMemoriesItem.dataset.l10nId,
      "ai-window-no-memories-learning-off",
      "Shows learning-off empty state l10n ID"
    );
  });

  it("renders and deletes memory items", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.memories.generateFromConversation", true],
        ["browser.smartwindow.memories.generateFromHistory", true],
      ],
    });

    const { MemoryStore, memories } = await populateMemories();
    const testMemory = memories[0];

    ({ doc, win } = await openManageMemoriesPanel());

    const memoriesList = doc.getElementById("memoriesList");
    await memoriesList.updateComplete;

    const memoryItems = memoriesList.querySelectorAll("[id^='memory-item']");
    Assert.greaterOrEqual(
      memoryItems.length,
      2,
      "At least two memory items are rendered"
    );

    const initialMemories = await MemoryStore.getMemories();
    const initialCount = initialMemories.length;

    const deleteButton = memoriesList.querySelector(
      `[memoryId="${testMemory.id}"][action="delete"]`
    );
    Assert.ok(deleteButton, "Delete button exists for the memory");

    EventUtils.synthesizeMouseAtCenter(deleteButton, {}, win);

    await TestUtils.waitForCondition(async () => {
      const currentMemories = await MemoryStore.getMemories();
      return currentMemories.length < initialCount;
    }, "Waiting for memory to be deleted");

    const remainingMemories = await MemoryStore.getMemories();
    Assert.ok(
      !remainingMemories.find(m => m.id === testMemory.id),
      "Memory was deleted"
    );
  });
});
