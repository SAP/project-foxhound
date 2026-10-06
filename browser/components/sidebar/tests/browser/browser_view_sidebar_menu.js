/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let win;

add_setup(async () => {
  SpecialPowers.pushPrefEnv({ set: [["sidebar.revamp", false]] });
  win = await BrowserTestUtils.openNewBrowserWindow();
});

registerCleanupFunction(async () => {
  await BrowserTestUtils.closeWindow(win);
});

/**
 * Check that pref controlled megalist sidebar menu item is hidden/shown
 */
add_task(async function test_megalist_menu() {
  const { document } = win;
  const item = document.getElementById("menu_megalistSidebar");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contextual-password-manager.enabled", false]],
  });
  ok(item.hidden, "Megalist sidebar menu item hidden");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contextual-password-manager.enabled", true]],
  });
  ok(!item.hidden, "Megalist sidebar menu item shown");
});

/**
 * Check that pref controlled chat sidebar menu item is hidden/shown
 */
add_task(async function test_megalist_menu() {
  const { document } = win;
  const item = document.getElementById("menu_genaiChatSidebar");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.chat.enabled", false]],
  });
  ok(item.hidden, "Chat sidebar menu item hidden");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.chat.enabled", true]],
  });
  ok(!item.hidden, "Chat sidebar menu item shown");
});

/**
 * Check that a sidebar extension appears in the View > Sidebar menu
 * and that its checked state is accurate
 */
add_task(async function test_sidebar_menu_extension_item() {
  const { document, SidebarController } = win;

  const extension = ExtensionTestUtils.loadExtension({ ...extData });
  await extension.startup();

  const menu = document.getElementById("viewSidebarMenu");
  const extMenuItem = menu.querySelector(".webextension-menuitem");

  ok(extMenuItem, "Extension sidebar menu item appears in View > Sidebar menu");

  // Check the checked state when the extension sidebar is open
  ok(
    extMenuItem.hasAttribute("checked"),
    "Extension menu item is checked when sidebar is open"
  );

  SidebarController.hide();

  ok(
    !extMenuItem.hasAttribute("checked"),
    "Extension menu item is not checked when sidebar is closed"
  );

  await extension.unload();
});
