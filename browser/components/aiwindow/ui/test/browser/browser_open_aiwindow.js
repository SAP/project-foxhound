/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test window type detection and menu item visibility based on aiwindow pref and window type.
 */
add_task(async function test_window_type_and_menu_visibility() {
  // AI Window disabled
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", false]],
  });

  await openHamburgerMenu();
  checkMenuItemVisibility(
    false,
    document.getElementById("appMenu-new-ai-window-button"),
    document.getElementById("appMenu-new-classic-window-button"),
    document.getElementById("appMenu-chats-history-button")
  );
  await closeHamburgerMenu();

  let fileMenuPopup = document.getElementById("menu_FilePopup");
  if (fileMenuPopup) {
    await openFileMenu(fileMenuPopup);
    checkMenuItemVisibility(
      false,
      document.getElementById("menu_newAIWindow"),
      document.getElementById("menu_newClassicWindow"),
      document.getElementById("appMenu-chats-history-button")
    );
    await closeFileMenu(fileMenuPopup);
  }

  await SpecialPowers.popPrefEnv();

  // AI Window enabled
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await openHamburgerMenu();
  checkMenuItemVisibility(
    true,
    document.getElementById("appMenu-new-ai-window-button"),
    document.getElementById("appMenu-new-classic-window-button"),
    document.getElementById("appMenu-chats-history-button")
  );
  await closeHamburgerMenu();

  if (fileMenuPopup) {
    await openFileMenu(fileMenuPopup);
    checkMenuItemVisibility(
      true,
      document.getElementById("menu_newAIWindow"),
      document.getElementById("menu_newClassicWindow"),
      document.getElementById("appMenu-chats-history-button")
    );
    await closeFileMenu(fileMenuPopup);
  }

  await SpecialPowers.popPrefEnv();
});

/**
 * Test that the File menu doesn't crash and AI items are hidden when
 * gBrowser is unavailable (simulates macOS hidden window with no
 * browser windows open).
 */
add_task(async function test_file_menu_no_browser_window() {
  let fileMenuPopup = document.getElementById("menu_FilePopup");
  if (!fileMenuPopup) {
    return;
  }

  let savedGBrowser = window.gBrowser;
  window.gBrowser = undefined;

  try {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", false]],
    });

    await openFileMenu(fileMenuPopup);
    Assert.ok(
      document.getElementById("menu_newAIWindow").hidden,
      "AI Window item should be hidden when pref is disabled and no browser window"
    );
    Assert.ok(
      document.getElementById("menu_newClassicWindow").hidden,
      "Classic Window item should be hidden when pref is disabled and no browser window"
    );
    await closeFileMenu(fileMenuPopup);
  } finally {
    window.gBrowser = savedGBrowser;
    await SpecialPowers.popPrefEnv();
  }
});

/**
 * Test that clicking AI window and classic window buttons opens the correct window type.
 */
add_task(async function test_button_actions() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  const restoreSignIn = skipSignIn();

  const currentWindowIsAIWindow = isAIWindow();

  await openHamburgerMenu();

  const buttonId = currentWindowIsAIWindow
    ? "appMenu-new-classic-window-button"
    : "appMenu-new-ai-window-button";
  const button = document.getElementById(buttonId);

  if (button && !button.hidden) {
    let delayedStartupPromise = BrowserTestUtils.waitForNewWindow();
    button.click();

    const newWin = await delayedStartupPromise;

    const exampleUrl = "https://example.com/";
    await BrowserTestUtils.loadURIString({
      browser: newWin.gBrowser.selectedTab.linkedBrowser,
      uriString: exampleUrl,
    });

    const newWinIsAI =
      newWin.document.documentElement.hasAttribute("ai-window");

    Assert.equal(
      newWinIsAI,
      !currentWindowIsAIWindow,
      `Clicking ${currentWindowIsAIWindow ? "classic" : "AI"} window button should open a ${currentWindowIsAIWindow ? "classic" : "AI"} window`
    );

    if (newWinIsAI) {
      let fileMenuPopup = newWin.document.getElementById("menu_FilePopup");

      await openHamburgerMenu(newWin);
      checkMenuItemVisibility(
        true,
        newWin.document.getElementById("appMenu-new-ai-window-button"),
        newWin.document.getElementById("appMenu-new-classic-window-button"),
        newWin.document.getElementById("appMenu-chats-history-button")
      );
      await closeHamburgerMenu(newWin);

      if (fileMenuPopup) {
        await openFileMenu(fileMenuPopup);
        checkMenuItemVisibility(
          true,
          newWin.document.getElementById("menu_newAIWindow"),
          newWin.document.getElementById("menu_newClassicWindow"),
          newWin.document.getElementById("appMenu-chats-history-button")
        );
        await closeFileMenu(fileMenuPopup);
      }
    }

    await BrowserTestUtils.closeWindow(newWin);
  } else {
    await closeHamburgerMenu();
  }

  await openHamburgerMenu();

  const appMenuNewWindow = document.getElementById(
    "appMenu-new-window-button2"
  );
  if (appMenuNewWindow && !appMenuNewWindow.hidden) {
    let delayedStartupPromise = BrowserTestUtils.waitForNewWindow();
    appMenuNewWindow.click();

    const newWin = await delayedStartupPromise;
    const newWinIsAI =
      newWin.document.documentElement.hasAttribute("ai-window");

    Assert.equal(
      newWinIsAI,
      currentWindowIsAIWindow,
      "New window button should open same type as current window"
    );

    await BrowserTestUtils.closeWindow(newWin);
  }

  const appMenuPopup = document.getElementById("appMenu-popup");
  if (appMenuPopup && appMenuPopup.state !== "closed") {
    await closeHamburgerMenu();
  }

  restoreSignIn();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_openNewBrowserWindow_and_ai_inherit() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  const newAIWindow = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: null,
    aiWindow: true,
  });

  Assert.ok(
    newAIWindow.document.documentElement.hasAttribute("ai-window"),
    "BrowserTestUtils.openNewBrowserWindow({ aiWindow: true }) should open an AI Window"
  );

  await SpecialPowers.popPrefEnv();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", false]],
  });

  const newWindowAfterDisabledAI = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: newAIWindow,
    aiWindow: false,
  });

  Assert.ok(
    !newWindowAfterDisabledAI.document.documentElement.hasAttribute(
      "ai-window"
    ),
    "BrowserTestUtils.openNewBrowserWindow({ aiWindow: false }) should not open a new AI Window from an existing AI Window"
  );

  await BrowserTestUtils.closeWindow(newAIWindow);
  await BrowserTestUtils.closeWindow(newWindowAfterDisabledAI);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test AI window mode detection in aiWindow.html
 */
add_task(async function test_aiwindow_html_mode_detection() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  // Open AI Window directly to load aiWindow.html
  const newAIWindow = await BrowserTestUtils.openNewBrowserWindow({
    openerWindow: null,
    aiWindow: true,
  });
  const browser = newAIWindow.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    await content.customElements.whenDefined("ai-window");

    const aiWindowElement = content.document.querySelector("ai-window");
    Assert.ok(aiWindowElement, "ai-window element should exist");

    // Check that mode is detected (should be FULLPAGE when loaded directly)
    info(`aiWindowElement.mode: ${aiWindowElement.mode}`);
    Assert.strictEqual(
      aiWindowElement.mode,
      "fullpage",
      `Mode should be detected as fullpage, got: ${aiWindowElement.mode}`
    );
  });

  await BrowserTestUtils.closeWindow(newAIWindow);
  await SpecialPowers.popPrefEnv();
});

function checkMenuItemVisibility(
  aiWindowEnabled,
  aiOpenerButton,
  classicOpenerButton,
  chatsButton
) {
  const doc =
    aiOpenerButton?.ownerDocument ||
    classicOpenerButton?.ownerDocument ||
    document;
  const currentWindowIsAIWindow = doc.documentElement.hasAttribute("ai-window");

  if (!aiWindowEnabled) {
    Assert.ok(
      !aiOpenerButton || aiOpenerButton.hidden,
      `AI Window button should not be visible when browser.smartwindow.enabled is false`
    );
    Assert.ok(
      !classicOpenerButton || classicOpenerButton.hidden,
      `Classic Window button should not be visible when browser.smartwindow.enabled is false`
    );
    Assert.ok(
      !chatsButton || chatsButton.hidden,
      `Chats history button should not be visible when browser.smartwindow.enabled is false`
    );
  } else if (currentWindowIsAIWindow) {
    Assert.ok(
      !aiOpenerButton || aiOpenerButton.hidden,
      `AI Window button should be hidden in AI Window when browser.smartwindow.enabled is true`
    );
    Assert.ok(
      classicOpenerButton && !classicOpenerButton.hidden,
      `Classic Window button should be visible in AI Window when browser.smartwindow.enabled is true`
    );
    Assert.ok(
      chatsButton && !chatsButton.hidden,
      `Chats history button should be visible when browser.smartwindow.enabled is true and in AI window`
    );
  } else {
    Assert.ok(
      aiOpenerButton && !aiOpenerButton.hidden,
      `AI Window button should be visible in Classic Window when browser.smartwindow.enabled is true`
    );
    Assert.ok(
      !classicOpenerButton || classicOpenerButton.hidden,
      `Classic Window button should be hidden in Classic Window when browser.smartwindow.enabled is true`
    );
    Assert.ok(
      !chatsButton || chatsButton.hidden,
      `Chats history button should be hidden in when browser.smartwindow.enabled is true but not in AI Window`
    );
  }
}

function isAIWindow() {
  return window.document.documentElement.hasAttribute("ai-window");
}

async function openHamburgerMenu(aiWindow = null) {
  let menuButton = aiWindow
    ? aiWindow.document.getElementById("PanelUI-menu-button")
    : document.getElementById("PanelUI-menu-button");
  let mainView = aiWindow
    ? PanelMultiView.getViewNode(aiWindow.document, "appMenu-mainView")
    : PanelMultiView.getViewNode(document, "appMenu-mainView");

  let viewShownPromise = BrowserTestUtils.waitForEvent(mainView, "ViewShown");
  menuButton.click();
  await viewShownPromise;
}

async function closeHamburgerMenu(aiWindow = null) {
  let appMenuPopup = aiWindow
    ? aiWindow.document.getElementById("appMenu-popup")
    : document.getElementById("appMenu-popup");

  let panelHiddenPromise = BrowserTestUtils.waitForEvent(
    appMenuPopup,
    "popuphidden"
  );

  if (aiWindow) {
    aiWindow.PanelUI.hide();
  } else {
    PanelUI.hide();
  }
  await panelHiddenPromise;
}

async function openFileMenu(menu) {
  return new Promise(resolve => {
    menu.addEventListener("popupshown", resolve, { once: true });
    menu.dispatchEvent(new MouseEvent("popupshowing", { bubbles: true }));
    menu.dispatchEvent(new MouseEvent("popupshown", { bubbles: true }));
  });
}

async function closeFileMenu(menu) {
  return new Promise(resolve => {
    menu.addEventListener("popuphidden", resolve, { once: true });
    menu.dispatchEvent(new MouseEvent("popuphiding", { bubbles: true }));
    menu.dispatchEvent(new MouseEvent("popuphidden", { bubbles: true }));
  });
}
