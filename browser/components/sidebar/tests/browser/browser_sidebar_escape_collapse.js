/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      [VERTICAL_TABS_PREF, true],
      ["sidebar.visibility", "expand-on-hover"],
    ],
  });
  await SidebarController.promiseInitialized;
  await SidebarController.toggleExpandOnHover(true);
  await SidebarController.waitUntilStable();
});

registerCleanupFunction(async () => {
  await SidebarController.toggleExpandOnHover(false);
  await SidebarController.waitUntilStable();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_escape_collapses_hover_expanded_sidebar() {
  // Disable non-test mouse events
  window.windowUtils.disableNonTestMouseEvents(true);

  EventUtils.synthesizeMouse(SidebarController.sidebarContainer, 1, 150, {
    type: "mousemove",
  });

  await BrowserTestUtils.waitForMutationCondition(
    SidebarController.sidebarContainer,
    { attributes: true },
    async () => {
      await SidebarController.waitUntilStable();
      return (
        SidebarController.sidebarContainer.hasAttribute(
          "sidebar-launcher-expanded"
        ) &&
        SidebarController.sidebarMain.expanded &&
        SidebarController._state.launcherExpanded &&
        window.getComputedStyle(SidebarController.sidebarContainer).position ===
          "absolute"
      );
    },
    "The sidebar launcher is expanded on mouse over"
  );

  info("The sidebar launcher is expanded, now pressing Escape");

  EventUtils.synthesizeKey("KEY_Escape", {}, window);

  await BrowserTestUtils.waitForMutationCondition(
    SidebarController.sidebarContainer,
    { attributes: true },
    async () => {
      await SidebarController.waitUntilStable();
      return (
        !SidebarController.sidebarContainer.hasAttribute(
          "sidebar-launcher-expanded"
        ) &&
        !SidebarController.sidebarMain.expanded &&
        !SidebarController._state.launcherExpanded
      );
    },
    "The sidebar launcher is collapsed after Escape"
  );

  ok(
    !SidebarController._state.launcherExpanded,
    "Sidebar is collapsed after pressing Escape even with mouse still hovering"
  );

  window.windowUtils.disableNonTestMouseEvents(false);
});
