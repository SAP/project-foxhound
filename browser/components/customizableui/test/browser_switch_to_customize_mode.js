"use strict";

function isMenubarVisible() {
  return BrowserTestUtils.isVisible(document.getElementById("toolbar-menubar"));
}

add_task(async function () {
  let menubarVisible = isMenubarVisible();

  await startCustomizing();
  is(gBrowser.tabs.length, 2, "Should have 2 tabs");

  is(
    isMenubarVisible(),
    menubarVisible,
    "Menubar visibility shouldn't change during customize mode"
  );

  let paletteKidCount = document.getElementById(
    "customization-palette"
  ).childElementCount;
  let nonCustomizingTab = gBrowser.tabContainer.querySelector(
    "tab:not([customizemode=true])"
  );
  let finishedCustomizing = BrowserTestUtils.waitForEvent(
    gNavToolbox,
    "aftercustomization"
  );
  await BrowserTestUtils.switchTab(gBrowser, nonCustomizingTab);
  await finishedCustomizing;

  let startedCount = 0;
  let handler = () => startedCount++;
  gNavToolbox.addEventListener("customizationstarting", handler);
  await startCustomizing();
  CustomizableUI.removeWidgetFromArea("stop-reload-button");
  await gCustomizeMode.reset().catch(e => {
    ok(
      false,
      "Threw an exception trying to reset after making modifications in customize mode: " +
        e
    );
  });

  let newKidCount = document.getElementById(
    "customization-palette"
  ).childElementCount;
  is(
    newKidCount,
    paletteKidCount,
    "Should have just as many items in the palette as before."
  );
  await endCustomizing();

  is(
    isMenubarVisible(),
    menubarVisible,
    "Menubar visibility shouldn't change exiting customize mode"
  );
  is(startedCount, 1, "Should have only started once");
  gNavToolbox.removeEventListener("customizationstarting", handler);
  let toolbars = document.querySelectorAll("toolbar");
  for (let toolbar of toolbars) {
    ok(
      !toolbar.hasAttribute("customizing"),
      "Toolbar " + toolbar.id + " is no longer customizing"
    );
  }
});
