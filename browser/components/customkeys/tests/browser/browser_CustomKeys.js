/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test the behavior of assigning keys, resetting keys, etc. via the CustomKeys module. The UI is tested separately.
 */

add_setup(async function () {
  // We need to be sure that the foreground tab has fully loaded before running
  // any tests. Otherwise, when keyboard events are sent to the remote process,
  // there is a race condition where they sometimes won't be handled again in
  // the parent process afterward.
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  registerCleanupFunction(function () {
    CustomKeys.resetAll();
    BrowserTestUtils.removeTab(tab);
  });
});

// Test changing a key.
add_task(async function testChangeKey() {
  is(
    document.activeElement,
    gBrowser.selectedBrowser,
    "Tab document browser is focused"
  );

  is(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    null,
    "key_gotoHistory is not customized"
  );
  info(`Changing key_gotoHistory to ${consts.unusedDisplay}`);
  CustomKeys.changeKey("key_gotoHistory", {
    modifiers: consts.unusedModifiers,
    key: consts.unusedKey,
  });
  Assert.deepEqual(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    { modifiers: consts.historyModifiers, key: "H" },
    "key_gotoHistory is customized"
  );
  info(`Pressing ${consts.unusedDisplay}`);
  let focused = BrowserTestUtils.waitForEvent(window, "SidebarFocused");
  EventUtils.synthesizeKey(consts.unusedKey, consts.unusedOptions, window);
  await focused;
  ok(true, "Sidebar got focus");
  is(
    SidebarController.currentID,
    "viewHistorySidebar",
    "History sidebar is open"
  );
  info(`Pressing ${consts.unusedDisplay}`);
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedBrowser, "focus");
  EventUtils.synthesizeKey(consts.unusedKey, consts.unusedOptions, window);
  await focused;
  ok(true, "Tab document browser got focus");

  is(
    CustomKeys.getDefaultKey("viewBookmarksSidebarKb"),
    null,
    "viewBookmarksSidebarKb is not customized"
  );
  info(`Changing viewBookmarksSidebarKb to ${consts.historyDisplay}`);
  CustomKeys.changeKey("viewBookmarksSidebarKb", {
    modifiers: consts.historyModifiers,
    key: "H",
  });
  Assert.deepEqual(
    CustomKeys.getDefaultKey("viewBookmarksSidebarKb"),
    { modifiers: "accel", key: "B" },
    "viewBookmarksSidebarKb is customized"
  );
  info(`Pressing ${consts.historyDisplay}`);
  focused = BrowserTestUtils.waitForEvent(window, "SidebarFocused");
  EventUtils.synthesizeKey("H", consts.historyOptions, window);
  await focused;
  ok(true, "Sidebar got focus");
  is(
    SidebarController.currentID,
    "viewBookmarksSidebar",
    "Bookmarks sidebar is open"
  );
  info(`Pressing ${consts.historyDisplay}`);
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedBrowser, "focus");
  EventUtils.synthesizeKey("H", consts.historyOptions, window);
  await focused;
  ok(true, "Tab document browser got focus");

  info("Resetting all keys");
  CustomKeys.resetAll();
});

// Test clearing a key.
add_task(async function testClearKey() {
  is(
    document.activeElement,
    gBrowser.selectedBrowser,
    "Tab document browser is focused"
  );
  // Move focus into chrome so that accel+l to focus the URL bar reliably occurs
  // immediately. We need this guarantee because we want to test when pressing
  // accel+l does nothing, so we can't rely on an event for that test.
  info("Focusing selected tab");
  let focused = BrowserTestUtils.waitForEvent(gBrowser.selectedTab, "focus");
  gBrowser.selectedTab.focus();
  await focused;
  ok(true, "Selected tab got focus");

  is(
    CustomKeys.getDefaultKey("focusURLBar"),
    null,
    "focusURLBar is not customized"
  );
  info("Pressing accel+L");
  EventUtils.synthesizeKey("L", { accelKey: true }, window);
  is(document.activeElement, gURLBar.inputField, "URL bar is focused");
  info("Focusing selected tab");
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedTab, "focus");
  gBrowser.selectedTab.focus();
  await focused;
  ok(true, "Selected tab got focus");

  info("Clearing focusURLBar");
  CustomKeys.clearKey("focusURLBar");
  Assert.deepEqual(
    CustomKeys.getDefaultKey("focusURLBar"),
    { modifiers: "accel", key: "L" },
    "focusURLBar is customized"
  );
  info("Pressing accel+L");
  EventUtils.synthesizeKey("L", { accelKey: true }, window);
  is(
    document.activeElement,
    gBrowser.selectedTab,
    "Selected tab still focused"
  );

  // The tab bar has focus now. We need to move focus back to the document
  // because otherwise, the focus will remain on the tab bar for the next test.
  info("Focusing tab document browser");
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedBrowser, "focus");
  gBrowser.selectedBrowser.focus();
  await focused;
  ok(true, "Tab document browser got focus");
  info("Resetting all keys");
  CustomKeys.resetAll();
});

// Test resetting a key.
add_task(async function testResetKey() {
  is(
    document.activeElement,
    gBrowser.selectedBrowser,
    "Tab document browser is focused"
  );

  is(
    CustomKeys.getDefaultKey("focusURLBar"),
    null,
    "focusURLBar is not customized"
  );
  info("Clearing focusURLBar");
  CustomKeys.clearKey("focusURLBar");
  Assert.deepEqual(
    CustomKeys.getDefaultKey("focusURLBar"),
    { modifiers: "accel", key: "L" },
    "focusURLBar is customized"
  );

  info("Resetting focusURLBar");
  CustomKeys.resetKey("focusURLBar");
  is(
    CustomKeys.getDefaultKey("focusURLBar"),
    null,
    "focusURLBar is not customized"
  );
  info("Pressing accel+L");
  let focused = BrowserTestUtils.waitForEvent(gURLBar.inputField, "focus");
  EventUtils.synthesizeKey("L", { accelKey: true }, window);
  await focused;
  ok(true, "URL bar got focus");
  info("Focusing tab document browser");
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedBrowser, "focus");
  gBrowser.selectedBrowser.focus();
  await focused;
  ok(true, "Tab document browser got focus");

  info("Resetting all keys");
  CustomKeys.resetAll();
});

// Test resetting all keys.
add_task(async function testResetAll() {
  is(
    document.activeElement,
    gBrowser.selectedBrowser,
    "Tab document browser is focused"
  );

  is(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    null,
    "key_gotoHistory is not customized"
  );
  info(`Changing key_gotoHistory to ${consts.unusedDisplay}`);
  CustomKeys.changeKey("key_gotoHistory", {
    modifiers: consts.unusedModifiers,
    key: consts.unusedKey,
  });
  Assert.deepEqual(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    { modifiers: consts.historyModifiers, key: "H" },
    "key_gotoHistory is customized"
  );

  is(
    CustomKeys.getDefaultKey("focusURLBar"),
    null,
    "focusURLBar is not customized"
  );
  info("Clearing focusURLBar");
  CustomKeys.clearKey("focusURLBar");
  Assert.deepEqual(
    CustomKeys.getDefaultKey("focusURLBar"),
    { modifiers: "accel", key: "L" },
    "focusURLBar is customized"
  );

  info("Resetting all keys");
  CustomKeys.resetAll();

  info(`Pressing ${consts.historyDisplay}`);
  let focused = BrowserTestUtils.waitForEvent(window, "SidebarFocused");
  EventUtils.synthesizeKey("H", consts.historyOptions, window);
  await focused;
  ok(true, "Sidebar got focus");
  is(
    SidebarController.currentID,
    "viewHistorySidebar",
    "History sidebar is open"
  );
  info(`Pressing ${consts.historyDisplay}`);
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedBrowser, "focus");
  EventUtils.synthesizeKey("H", consts.historyOptions, window);
  await focused;
  ok(true, "Tab document browser got focus");

  info("Pressing accel+L");
  focused = BrowserTestUtils.waitForEvent(gURLBar.inputField, "focus");
  EventUtils.synthesizeKey("L", { accelKey: true }, window);
  await focused;
  ok(true, "URL bar got focus");
  info("Focusing tab document browser");
  focused = BrowserTestUtils.waitForEvent(gBrowser.selectedBrowser, "focus");
  gBrowser.selectedBrowser.focus();
  await focused;
  ok(true, "Tab document browser got focus");
});

// Test that changes apply to other windows.
add_task(async function testOtherWindow() {
  // Test changing a key before a new window is opened.
  is(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    null,
    "key_gotoHistory is not customized"
  );
  info(`Changing key_gotoHistory to ${consts.unusedDisplay}`);
  CustomKeys.changeKey("key_gotoHistory", {
    modifiers: consts.unusedModifiers,
    key: consts.unusedKey,
  });
  Assert.deepEqual(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    { modifiers: consts.historyModifiers, key: "H" },
    "key_gotoHistory is customized"
  );

  info("Opening new window");
  const newWin = await BrowserTestUtils.openNewBrowserWindow();
  is(
    newWin.document.activeElement,
    newWin.gURLBar.inputField,
    "URL bar is focused in new window"
  );

  info(`Pressing ${consts.unusedDisplay} in new window`);
  let focused = BrowserTestUtils.waitForEvent(newWin, "SidebarFocused");
  EventUtils.synthesizeKey(consts.unusedKey, consts.unusedOptions, newWin);
  await focused;
  ok(true, "Sidebar got focus in new window");
  is(
    newWin.SidebarController.currentID,
    "viewHistorySidebar",
    "History sidebar is open in new window"
  );
  info(`Pressing ${consts.unusedDisplay} in new window`);
  focused = BrowserTestUtils.waitForEvent(
    newWin.gBrowser.selectedBrowser,
    "focus"
  );
  EventUtils.synthesizeKey(consts.unusedKey, consts.unusedOptions, newWin);
  await focused;
  ok(true, "Tab document browser got focus in new window");

  // Test changing a key after a new window is opened.
  is(
    CustomKeys.getDefaultKey("viewBookmarksSidebarKb"),
    null,
    "viewBookmarksSidebarKb is not customized"
  );
  info(`Changing viewBookmarksSidebarKb to ${consts.historyDisplay}`);
  CustomKeys.changeKey("viewBookmarksSidebarKb", {
    modifiers: consts.historyModifiers,
    key: "H",
  });
  Assert.deepEqual(
    CustomKeys.getDefaultKey("viewBookmarksSidebarKb"),
    { modifiers: "accel", key: "B" },
    "viewBookmarksSidebarKb is customized"
  );
  info(`Pressing ${consts.historyDisplay} in new window`);
  focused = BrowserTestUtils.waitForEvent(newWin, "SidebarFocused");
  EventUtils.synthesizeKey("H", consts.historyOptions, newWin);
  await focused;
  ok(true, "Sidebar got focus in new window");
  is(
    newWin.SidebarController.currentID,
    "viewBookmarksSidebar",
    "Bookmarks sidebar is open"
  );
  info(`Pressing ${consts.historyDisplay} in new window`);
  focused = BrowserTestUtils.waitForEvent(
    newWin.gBrowser.selectedBrowser,
    "focus"
  );
  EventUtils.synthesizeKey("H", consts.historyOptions, newWin);
  await focused;
  ok(true, "Tab document browser got focus in new window");

  // Test resetting keys after a new window is opened.
  info("Resetting all keys");
  CustomKeys.resetAll();

  is(
    CustomKeys.getDefaultKey("key_gotoHistory"),
    null,
    "key_gotoHistory is not customized"
  );
  info(`Pressing ${consts.historyDisplay} in new window`);
  focused = BrowserTestUtils.waitForEvent(newWin, "SidebarFocused");
  EventUtils.synthesizeKey("H", consts.historyOptions, newWin);
  await focused;
  ok(true, "Sidebar got focus in new window");
  is(
    newWin.SidebarController.currentID,
    "viewHistorySidebar",
    "History sidebar is open in new window"
  );
  info(`Pressing ${consts.historyDisplay} in new window`);
  focused = BrowserTestUtils.waitForEvent(
    newWin.gBrowser.selectedBrowser,
    "focus"
  );
  EventUtils.synthesizeKey("H", consts.historyOptions, newWin);
  await focused;
  ok(true, "Tab document browser got focus in new window");

  info("Closing new window");
  await BrowserTestUtils.closeWindow(newWin);
});
