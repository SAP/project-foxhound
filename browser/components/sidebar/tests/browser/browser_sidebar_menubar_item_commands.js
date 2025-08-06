/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SIDEBAR_VISIBILITY_PREF = "sidebar.visibility";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [[SIDEBAR_VISIBILITY_PREF, "hide-sidebar"]],
  });
  // make sure the sidebar is reset after we're done
  registerCleanupFunction(async () => {
    await SidebarController.toggleExpanded(false);
    await SidebarController.sidebarMain.updateComplete;
    SidebarController.sidebarContainer.hidden = false;
  });
});

add_task(async function test_sidebar_view_commands() {
  const sidebar = document.querySelector("sidebar-main");
  const sidebarBox = document.querySelector("#sidebar-box");

  await sidebar.updateComplete;
  ok(sidebar && BrowserTestUtils.isVisible(sidebar), "Sidebar is shown.");

  // turn off animations for this bit
  await SpecialPowers.pushPrefEnv({
    set: [["sidebar.animation.enabled", false]],
  });

  document.getElementById("sidebar-button").doCommand();
  await sidebar.updateComplete;
  ok(BrowserTestUtils.isHidden(sidebar), "Sidebar is hidden.");

  const bookmarkMenuItem = document.getElementById("menu_bookmarksSidebar");
  bookmarkMenuItem.doCommand();
  await sidebar.updateComplete;

  ok(BrowserTestUtils.isVisible(sidebar), "Sidebar is visible");
  ok(BrowserTestUtils.isVisible(sidebarBox), "Sidebar box is visible");
  is(
    SidebarController.currentID,
    "viewBookmarksSidebar",
    "Sidebar controller has the correct currentID"
  );

  SidebarController.toggle(SidebarController.currentID);
  await sidebar.updateComplete;
  ok(BrowserTestUtils.isVisible(sidebar), "Sidebar is visible");
  ok(sidebar.expanded, "Sidebar is expanded when the view is closed");
  ok(BrowserTestUtils.isHidden(sidebarBox), "Sidebar box is hidden");

  document.getElementById("sidebar-button").doCommand();
  await sidebar.updateComplete;
  ok(BrowserTestUtils.isHidden(sidebar), "Sidebar is hidden.");
  ok(BrowserTestUtils.isHidden(sidebarBox), "Sidebar box is hidden.");

  // restore the animation pref
  SpecialPowers.popPrefEnv();
});
