/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PREF_IS_DEFAULT_WINDOW = "browser.smartwindow.isDefaultWindow";

/**
 * When "Use Smart Window by default" is on, Cmd/Ctrl+N opens a Smart Window
 * regardless of whether the current window is a Smart Window or Classic Window.
 */
add_task(
  async function test_cmd_n_opens_smart_window_from_classic_when_default() {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_IS_DEFAULT_WINDOW, true]],
    });
    const restoreSignIn = skipSignIn();

    const classicWin = await BrowserTestUtils.openNewBrowserWindow();
    Assert.ok(
      !classicWin.document.documentElement.hasAttribute("ai-window"),
      "Opener is a classic window"
    );

    let newWinPromise = BrowserTestUtils.waitForNewWindow();
    classicWin.document.getElementById("cmd_newNavigator").doCommand();
    const newWin = await newWinPromise;

    try {
      await BrowserTestUtils.waitForMutationCondition(
        newWin.document.documentElement,
        { attributes: true },
        () => newWin.document.documentElement.hasAttribute("ai-window")
      );
      Assert.ok(
        newWin.document.documentElement.hasAttribute("ai-window"),
        "Cmd+N from a Classic Window opens a Smart Window when default pref is on"
      );
    } finally {
      await BrowserTestUtils.closeWindow(newWin);
      await BrowserTestUtils.closeWindow(classicWin);
      restoreSignIn();
      await SpecialPowers.popPrefEnv();
    }
  }
);

add_task(
  async function test_cmd_n_opens_smart_window_from_smart_when_default() {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_IS_DEFAULT_WINDOW, true]],
    });
    const restoreSignIn = skipSignIn();

    const smartWin = await openAIWindow();

    let newWinPromise = BrowserTestUtils.waitForNewWindow();
    smartWin.document.getElementById("cmd_newNavigator").doCommand();
    const newWin = await newWinPromise;

    try {
      await BrowserTestUtils.waitForMutationCondition(
        newWin.document.documentElement,
        { attributes: true },
        () => newWin.document.documentElement.hasAttribute("ai-window")
      );
      Assert.ok(
        newWin.document.documentElement.hasAttribute("ai-window"),
        "Cmd+N from a Smart Window opens a Smart Window when default pref is on"
      );
    } finally {
      await BrowserTestUtils.closeWindow(newWin);
      await BrowserTestUtils.closeWindow(smartWin);
      restoreSignIn();
      await SpecialPowers.popPrefEnv();
    }
  }
);
