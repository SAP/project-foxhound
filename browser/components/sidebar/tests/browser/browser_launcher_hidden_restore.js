/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let sidebarLauncher;

add_setup(async () => {
  await SidebarController.waitUntilStable();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["sidebar.animation.enabled", false],
      // Note: "visibility" in the context of the sidebar launcher refers to the
      // pref-controlled behavior of when and how the launcher shows/hides, not
      // if it is currently showing or hiding. These tests are specifically for
      // the "hide-sidebar" behavior.
      [SIDEBAR_VISIBILITY_PREF, "hide-sidebar"],
    ],
  });
  await SidebarController.waitUntilStable();
  sidebarLauncher = SidebarController.sidebarContainer;
});

add_task(async function test_launcher_hidden_restored_after_panel_close() {
  // When the launcher is initially hidden, after opening and closing a panel it
  // should restore to hidden.
  await SidebarTestUtils.ensureLauncherHidden(window);

  await SidebarController.show("viewHistorySidebar");
  await SidebarController.waitUntilStable();
  Assert.ok(
    !SidebarController.sidebarContainer.hidden,
    "Launcher is visible while panel is open"
  );

  // close the panel
  SidebarController.hide();
  await waitForElementHidden(sidebarLauncher);
  Assert.ok(
    sidebarLauncher.hidden,
    "Launcher is hidden again after panel close"
  );
});

add_task(
  async function test_launcher_visible_stays_visible_after_panel_close() {
    // If the launcher was initially visible, after opening and closing a panel it
    // should restore to visible.
    await SidebarTestUtils.ensureLauncherVisible(window);

    await SidebarController.show("viewHistorySidebar");
    await SidebarController.waitUntilStable();

    SidebarController.hide();
    await SidebarController.waitUntilStable();
    Assert.ok(
      !sidebarLauncher.hidden,
      "Launcher stays visible after panel close when it was visible before"
    );
  }
);

add_task(
  async function test_launcher_hidden_restored_after_panel_switch_and_close() {
    // When the launcher is initially hidden, after opening a couple of sidebar panels
    // then closing the panel, it should restore to hidden.
    await SidebarTestUtils.ensureLauncherHidden(window);

    await SidebarController.show("viewHistorySidebar");
    await SidebarController.waitUntilStable();

    await SidebarController.show("viewBookmarksSidebar");
    await SidebarController.waitUntilStable();

    SidebarController.hide();
    await waitForElementHidden(sidebarLauncher);
    Assert.ok(
      sidebarLauncher.hidden,
      "Launcher is hidden again after switching panels and closing"
    );
  }
);

add_task(async function test_launcher_hidden_restored_via_toggle() {
  // When the launcher is initially hidden, after toggling a sidebar panel
  // open then closed, it should restore to hidden.
  await SidebarTestUtils.ensureLauncherHidden(window);

  await SidebarController.show("viewHistorySidebar");
  await SidebarController.waitUntilStable();

  SidebarController.toggle("viewHistorySidebar");
  await waitForElementHidden(sidebarLauncher);
  Assert.ok(
    sidebarLauncher.hidden,
    "Launcher is hidden again after toggling panel off"
  );
});

add_task(async function test_visibility_mode_change_while_panel_open() {
  // When the launcher is initially hidden, if the visibility pref changes to something
  // that isn't hide-sidebar, it should remain visible regardless of the origin state.
  await SidebarTestUtils.ensureLauncherHidden(window);

  await SidebarController.show("viewHistorySidebar");
  await SidebarController.waitUntilStable();

  await SpecialPowers.pushPrefEnv({
    set: [[SIDEBAR_VISIBILITY_PREF, "always-show"]],
  });
  await SidebarController.waitUntilStable();

  SidebarController.hide();
  await SidebarController.waitUntilStable();
  Assert.ok(
    !sidebarLauncher.hidden,
    "Launcher stays visible when visibility changed to always-show while panel was open"
  );

  await SpecialPowers.popPrefEnv();
});
