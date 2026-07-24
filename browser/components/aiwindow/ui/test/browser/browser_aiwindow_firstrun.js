/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FIRSTRUN_URL = "chrome://browser/content/aiwindow/firstrun.html";

async function openFirstrunPage() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    FIRSTRUN_URL
  );
  return tab;
}

add_task(async function test_firstrun_welcome_screen_renders() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.firstrun.autoAdvanceMS", 0]],
  });

  const tab = await openFirstrunPage();

  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const root = content.document.documentElement;

    await ContentTaskUtils.waitForMutationCondition(
      root,
      { childList: true, subtree: true },
      () => content.document.querySelector(".screen.AI_WINDOW_INTRO")
    );

    const introScreen = content.document.querySelector(
      ".screen.AI_WINDOW_INTRO"
    );
    Assert.ok(
      introScreen,
      "The intro screen with class 'screen AI_WINDOW_INTRO' should be present"
    );

    await ContentTaskUtils.waitForMutationCondition(
      root,
      { childList: true, subtree: true, attributes: true },
      () => content.document.querySelector(".screen.AI_WINDOW_CHOOSE_MODEL")
    );
  });

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_launchWindow_shows_firstrun_when_not_completed() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", false],
    ],
  });

  const restoreSignIn = skipSignIn();

  // Ensure we start in classic mode
  document.documentElement.removeAttribute("ai-window");

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  await AIWindow.launchWindow(gBrowser.selectedBrowser);

  await BrowserTestUtils.waitForCondition(
    () => gBrowser.selectedBrowser.currentURI.spec === FIRSTRUN_URL,
    "Should navigate to firstrun.html"
  );

  Assert.equal(
    gBrowser.selectedBrowser.currentURI.spec,
    FIRSTRUN_URL,
    "launchWindow should load firstrun.html when firstrun not completed"
  );

  // Cleanup
  document.documentElement.removeAttribute("ai-window");
  restoreSignIn();
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_switcher_shows_firstrun_when_not_completed() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", false],
    ],
  });

  const restoreSignIn = skipSignIn();

  // Ensure we start in classic mode
  document.documentElement.removeAttribute("ai-window");

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  // Open the switcher panel and click "Switch to AI Window"
  let button = document.getElementById("ai-window-toggle");
  let view = PanelMultiView.getViewNode(document, "ai-window-toggle-view");

  let viewShownPromise = BrowserTestUtils.waitForEvent(view, "ViewShown");
  button.click();
  await viewShownPromise;

  let aiButton = view.querySelector("#ai-window-switch-ai");
  aiButton.click();

  await TestUtils.waitForCondition(
    () => document.documentElement.hasAttribute("ai-window"),
    "Window should have ai-window attribute after switching"
  );

  await BrowserTestUtils.waitForCondition(
    () => gBrowser.selectedBrowser.currentURI.spec === FIRSTRUN_URL,
    "Should navigate to firstrun.html"
  );

  Assert.equal(
    gBrowser.selectedBrowser.currentURI.spec,
    FIRSTRUN_URL,
    "Switcher should load firstrun.html when firstrun not completed"
  );

  await TestUtils.waitForCondition(
    () => PanelUI.panel.state === "closed",
    "Panel should close after switching"
  );

  // Cleanup
  document.documentElement.removeAttribute("ai-window");
  restoreSignIn();
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(
  async function test_launchWindow_opens_new_window_with_firstrun_when_not_completed() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.firstrun.hasCompleted", false],
      ],
    });

    const restoreSignIn = skipSignIn();

    document.documentElement.removeAttribute("ai-window");

    const tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:blank"
    );

    const newWindowPromise = BrowserTestUtils.waitForNewWindow({
      url: FIRSTRUN_URL,
    });
    await AIWindow.launchWindow(gBrowser.selectedBrowser, true);
    const newWindow = await newWindowPromise;

    Assert.equal(
      newWindow.gBrowser.selectedBrowser.currentURI.spec,
      FIRSTRUN_URL,
      "launchWindow with openNewWindow=true should load firstrun.html when firstrun not completed"
    );

    await TestUtils.waitForCondition(
      () => newWindow.document.documentElement.hasAttribute("ai-window"),
      "New window should have ai-window attribute after authorization"
    );

    Assert.ok(
      newWindow.document.documentElement.hasAttribute("ai-window"),
      "New window should be in AI Window mode"
    );

    await BrowserTestUtils.closeWindow(newWindow);
    document.documentElement.removeAttribute("ai-window");
    restoreSignIn();
    BrowserTestUtils.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

add_task(async function test_firstrun_explainer_page_opens() {
  const explainerPref = "browser.smartwindow.firstrun.explainerURL";
  const exampleURL = "https://example.com/";

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.enabled", true],
      ["browser.smartwindow.firstrun.hasCompleted", false],
      ["browser.smartwindow.firstrun.modelChoice", ""],
      [explainerPref, exampleURL],
    ],
  });

  const restoreSignIn = skipSignIn();

  const explainerUrlPref = Services.prefs.getStringPref(
    explainerPref,
    exampleURL
  );

  const win = Services.wm.getMostRecentWindow("navigator:browser");
  let calls = [];
  const originalOpenLinkIn = win.openLinkIn;

  win.openLinkIn = function (url, where, params) {
    calls.push({ url, where, params });
    return null;
  };

  const aiWindowTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  await AIWindow.launchWindow(gBrowser.selectedBrowser);

  await BrowserTestUtils.waitForCondition(
    () => gBrowser.selectedBrowser.currentURI.spec === FIRSTRUN_URL,
    "Should navigate to firstrun.html"
  );

  const browser = aiWindowTab.linkedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const root = content.document.documentElement;

    await ContentTaskUtils.waitForMutationCondition(
      root,
      { childList: true, subtree: true },
      () => content.document.querySelector(".screen.AI_WINDOW_INTRO")
    );

    await ContentTaskUtils.waitForMutationCondition(
      root,
      { childList: true, subtree: true, attributes: true },
      () => content.document.querySelector(".screen.AI_WINDOW_CHOOSE_MODEL")
    );

    const model1Box = content.document.querySelectorAll(".select-item")[0];
    const letsGoButton = content.document.querySelector(
      ".action-buttons > button"
    );

    Assert.ok(model1Box, "Model 1 box exists");
    Assert.ok(letsGoButton, "Let's go button exists");

    EventUtils.synthesizeMouseAtCenter(model1Box, {}, content);
    EventUtils.synthesizeMouseAtCenter(letsGoButton, {}, content);
  });

  await BrowserTestUtils.waitForCondition(
    () => calls.length,
    "openLinkIn function was called"
  );

  const call = calls[0];

  Assert.ok(
    call.url.includes(explainerUrlPref),
    "openLinkIn function was called with the explainer URL"
  );

  Assert.equal(
    call.where,
    "tab",
    "openLinkIn function opened in a background tab"
  );

  // Clean up
  document.documentElement.removeAttribute("ai-window");
  restoreSignIn();
  BrowserTestUtils.removeTab(aiWindowTab);
  win.openLinkIn = originalOpenLinkIn;
  await SpecialPowers.popPrefEnv();
});
