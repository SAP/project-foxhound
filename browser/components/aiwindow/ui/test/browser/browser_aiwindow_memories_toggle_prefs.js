/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { MemoriesManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
);

const PREF_MEMORIES_CONVERSATION =
  "browser.smartwindow.memories.generateFromConversation";
const PREF_MEMORIES_HISTORY =
  "browser.smartwindow.memories.generateFromHistory";

function getMemoriesButton(browser) {
  const aiWindow = browser.contentDocument?.querySelector("ai-window");
  return aiWindow?.shadowRoot?.querySelector("memories-icon-button");
}

// Sidebar runs in the parent process, so we stub and check DOM directly.
add_task(async function test_sidebar_memories_toggle_visibility() {
  const stub = sinon
    .stub(MemoriesManager, "getAllMemories")
    .resolves([{ memory_summary: "test memory" }]);

  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  try {
    // Setting prefs after the stub is in place and sidebar is open so the
    // pref change triggers #onMemoriesPrefChanged() against the stub.
    Services.prefs.setBoolPref(PREF_MEMORIES_CONVERSATION, false);
    Services.prefs.setBoolPref(PREF_MEMORIES_HISTORY, false);

    await BrowserTestUtils.waitForCondition(() => {
      const btn = getMemoriesButton(sidebarBrowser);
      return btn && btn.show === true;
    }, "Sidebar: shown when prefs off but memories exist");
    Assert.ok(true, "Shown when prefs off but memories exist");

    Services.prefs.setBoolPref(PREF_MEMORIES_CONVERSATION, true);
    Services.prefs.setBoolPref(PREF_MEMORIES_HISTORY, true);
    await BrowserTestUtils.waitForCondition(() => {
      const btn = getMemoriesButton(sidebarBrowser);
      return btn && btn.show === true;
    }, "Sidebar: shown when prefs on");
    Assert.ok(true, "Shown when prefs on");
  } finally {
    stub.restore();
    Services.prefs.clearUserPref(PREF_MEMORIES_CONVERSATION);
    Services.prefs.clearUserPref(PREF_MEMORIES_HISTORY);
    await BrowserTestUtils.closeWindow(win);
  }
});

add_task(async function test_fullpage_memories_toggle_visibility() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const { sinon: sinonLib } = ChromeUtils.importESModule(
      "resource://testing-common/Sinon.sys.mjs"
    );
    const { MemoriesManager: MM } = ChromeUtils.importESModule(
      "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs"
    );
    content._memoriesStub = sinonLib
      .stub(MM, "getAllMemories")
      .resolves([{ memory_summary: "test memory" }]);
  });

  try {
    // Setting prefs after the stub is in place so the pref change triggers
    // #onMemoriesPrefChanged() which calls #refreshHasMemories() against
    // the stub.
    await SpecialPowers.pushPrefEnv({
      set: [
        [PREF_MEMORIES_CONVERSATION, false],
        [PREF_MEMORIES_HISTORY, false],
      ],
    });
    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForCondition(() => {
        const btn = aiWindow?.shadowRoot?.querySelector("memories-icon-button");
        return btn && btn.show === true;
      }, "Fullpage: shown when prefs off but memories exist");
    });
    Assert.ok(true, "Shown when prefs off but memories exist");

    await SpecialPowers.pushPrefEnv({
      set: [
        [PREF_MEMORIES_CONVERSATION, true],
        [PREF_MEMORIES_HISTORY, true],
      ],
    });
    await SpecialPowers.spawn(browser, [], async () => {
      const aiWindow = content.document.querySelector("ai-window");
      await ContentTaskUtils.waitForCondition(() => {
        const btn = aiWindow?.shadowRoot?.querySelector("memories-icon-button");
        return btn && btn.show === true;
      }, "Fullpage: shown when prefs on");
    });
    Assert.ok(true, "Shown when prefs on");
  } finally {
    await SpecialPowers.spawn(browser, [], async () => {
      if (content._memoriesStub) {
        content._memoriesStub.restore();
        delete content._memoriesStub;
      }
    });
    await BrowserTestUtils.closeWindow(win);
  }
});
