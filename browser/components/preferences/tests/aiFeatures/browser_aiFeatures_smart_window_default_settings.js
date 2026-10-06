/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_smart_window.js", gTestPath).href,
  this
);

describe("settings ai features - Smart Window default settings", () => {
  beforeEach(async function setup() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.preferences.aiControls", true],
        ["browser.smartwindow.enabled", true],
        ["browser.smartwindow.tos.consentTime", 1770830464],
        ["browser.smartwindow.sidebar.openByDefault", false],
      ],
    });
  });

  afterEach(async () => {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    await SpecialPowers.popPrefEnv();
  });

  it("toggles the open sidebar by default pref when checkbox is clicked", async () => {
    const { doc, win } = await openSmartWindowPanel();

    const checkbox = doc.getElementById("openSidebarByDefault");
    Assert.ok(
      BrowserTestUtils.isVisible(checkbox),
      "openSidebarByDefault checkbox is visible"
    );
    Assert.ok(
      !checkbox.checked,
      "Checkbox is unchecked when sidebar.openByDefault pref is false"
    );

    checkbox.scrollIntoView();
    EventUtils.synthesizeMouseAtCenter(checkbox.labelEl, {}, win);
    await checkbox.updateComplete;

    Assert.ok(
      Services.prefs.getBoolPref("browser.smartwindow.sidebar.openByDefault"),
      "sidebar.openByDefault pref is true after checking"
    );
    Assert.ok(checkbox.checked, "Checkbox is now checked");

    checkbox.labelEl.click();
    await checkbox.updateComplete;

    Assert.ok(
      !Services.prefs.getBoolPref("browser.smartwindow.sidebar.openByDefault"),
      "sidebar.openByDefault pref is false after unchecking"
    );
    Assert.ok(!checkbox.checked, "Checkbox is now unchecked");
  });
});
