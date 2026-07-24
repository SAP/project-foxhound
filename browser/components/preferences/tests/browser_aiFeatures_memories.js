/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

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

  async function openSmartWindowPanel() {
    await openAiFeaturePanel();
    const personalizeButton = doc.getElementById(
      "personalizeSmartWindowButton"
    );
    personalizeButton.scrollIntoView();
    const paneLoaded = waitForPaneChange("personalizeSmartWindow");
    EventUtils.synthesizeMouseAtCenter(personalizeButton, {}, win);
    await paneLoaded;
  }

  async function openManageMemoriesPanel() {
    await openSmartWindowPanel();
    const manageButton = doc.getElementById("manageMemoriesButton");
    manageButton.scrollIntoView();
    const paneLoaded = waitForPaneChange("manageMemories");
    EventUtils.synthesizeMouseAtCenter(manageButton, {}, win);
    await paneLoaded;
  }

  async function populateMemories() {
    const { MemoryStore } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/services/MemoryStore.sys.mjs"
    );

    let memoryOne = await MemoryStore.addMemory({
      memory_summary: "Lorem ipsum dolor sit amet 1",
      category: "interests",
      intent: "general",
      score: 5,
    });
    let memoryTwo = await MemoryStore.addMemory({
      memory_summary: "Lorem ipsum dolor sit amet 2",
      category: "habits",
      intent: "general",
      score: 4,
    });

    registerCleanupFunction(async () => {
      for (const { id } of [memoryOne, memoryTwo]) {
        try {
          await MemoryStore.hardDeleteMemory(id);
        } catch (err) {
          console.error("Failed to delete memory:", id, err);
        }
      }
    });

    return { MemoryStore, memories: [memoryOne, memoryTwo] };
  }

  it("toggles Learn from activity and shows correct empty states", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.memories", false]],
    });

    await openSmartWindowPanel();

    const learnFromActivity = doc.getElementById("learnFromActivity");
    Assert.ok(!learnFromActivity.checked, "Checkbox is unchecked initially");

    learnFromActivity.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(learnFromActivity.labelEl, {}, win);
    await learnFromActivity.updateComplete;

    Assert.ok(
      Services.prefs.getBoolPref("browser.smartwindow.memories"),
      "Preference is now true"
    );
    Assert.ok(learnFromActivity.checked, "Checkbox is now checked");

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
      set: [["browser.smartwindow.memories", false]],
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
      set: [["browser.smartwindow.memories", true]],
    });

    const { MemoryStore, memories } = await populateMemories();
    const testMemory = memories[0];

    await openManageMemoriesPanel();

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
