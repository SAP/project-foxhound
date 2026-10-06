/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      [VERTICAL_TABS_PREF, true],
      ["sidebar.animation.enabled", false],
    ],
  });
  await SidebarTestUtils.waitForTabstripOrientation(window, "vertical");
});

add_task(async function test_splitter_hidden_with_hide_sidebar() {
  const launcherSplitter = document.getElementById("sidebar-launcher-splitter");
  const sidebarLauncher = SidebarController.sidebarContainer;

  await SidebarTestUtils.ensureLauncherVisible(
    window,
    "Launcher is initially visible with vertical tabs"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(launcherSplitter),
    "Launcher splitter is initially visible with vertical tabs"
  );

  await SpecialPowers.pushPrefEnv({
    set: [[SIDEBAR_VISIBILITY_PREF, "hide-sidebar"]],
  });

  await waitForElementHidden(sidebarLauncher);

  await SidebarTestUtils.ensureLauncherHidden(
    window,
    "Launcher is initially visible with vertical tabs"
  );
  Assert.ok(
    BrowserTestUtils.isHidden(launcherSplitter),
    "Launcher splitter is hidden in hide-sidebar mode"
  );
});
