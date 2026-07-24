/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { MemoriesSchedulers } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/MemoriesSchedulers.sys.mjs"
);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });
});

add_task(async function test_memories_scheduler_on_toggle_to_aiwindow() {
  if (document.documentElement.hasAttribute("ai-window")) {
    document.documentElement.removeAttribute("ai-window");
  }

  const stub = sinon.stub(MemoriesSchedulers, "maybeRunAndSchedule");

  AIWindow.toggleAIWindow(window, true);

  Assert.ok(
    stub.calledOnce,
    "MemoriesSchedulers.maybeRunAndSchedule should be called once when toggling to AI Window"
  );

  Assert.ok(
    document.documentElement.hasAttribute("ai-window"),
    "Window should have ai-window attribute after toggle"
  );

  stub.restore();
});

add_task(
  async function test_memories_scheduler_not_called_on_toggle_to_classic() {
    if (!document.documentElement.hasAttribute("ai-window")) {
      document.documentElement.setAttribute("ai-window", "");
    }

    const stub = sinon.stub(MemoriesSchedulers, "maybeRunAndSchedule");

    AIWindow.toggleAIWindow(window, false);

    Assert.ok(
      stub.notCalled,
      "MemoriesSchedulers.maybeRunAndSchedule should not be called when toggling to Classic Window"
    );

    Assert.ok(
      !document.documentElement.hasAttribute("ai-window"),
      "Window should not have ai-window attribute after toggle"
    );

    stub.restore();
  }
);

add_task(async function test_memories_scheduler_on_init_with_aiwindow() {
  const stub = sinon.stub(MemoriesSchedulers, "maybeRunAndSchedule");

  const testWin = await BrowserTestUtils.openNewBrowserWindow({
    private: false,
  });

  testWin.document.documentElement.setAttribute("ai-window", "");

  // Use uninit() to properly clean up observer before re-initializing
  AIWindow.uninit();
  AIWindow.init(testWin);

  Assert.ok(
    stub.calledOnce,
    "MemoriesSchedulers.maybeRunAndSchedule should be called during init when window is AI Window"
  );

  stub.restore();

  await BrowserTestUtils.closeWindow(testWin);
});

add_task(
  async function test_memories_scheduler_not_called_on_init_without_aiwindow() {
    const stub = sinon.stub(MemoriesSchedulers, "maybeRunAndSchedule");

    const testWin = await BrowserTestUtils.openNewBrowserWindow({
      private: false,
    });

    // Use uninit() to properly clean up observer before re-initializing
    AIWindow.uninit();
    AIWindow.init(testWin);

    Assert.ok(
      stub.notCalled,
      "MemoriesSchedulers.maybeRunAndSchedule should not be called during init when window is not AI Window"
    );

    stub.restore();

    await BrowserTestUtils.closeWindow(testWin);
  }
);
