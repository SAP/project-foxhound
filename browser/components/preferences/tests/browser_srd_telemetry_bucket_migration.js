/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Regression guard for the telemetry-bucket-flip class:
// When a setting migrates to a new SRD pane, interacting with it must record
// under the new pane's Glean.browserUiInteraction.preferencesPane* bucket,
// NOT under preferencesPaneGeneral.
//
// Each task below tests one migrated setting from a different destination pane.
// Reference pattern: browser_tabs_open_external_next_to_active_tab.js.

async function resetTelemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
}

registerCleanupFunction(resetTelemetry);

// useSmoothScrolling: paneGeneral (legacy) -> paneAccessibility (SRD).
add_task(
  async function test_useSmoothScrolling_records_in_accessibility_bucket() {
    await resetTelemetry();

    let tab = await openPrefsTab("accessibility");
    let doc = tab.linkedBrowser.contentDocument;

    await TestUtils.waitForCondition(
      () => doc.getElementById("useSmoothScrolling"),
      "useSmoothScrolling rendered"
    );
    doc.getElementById("useSmoothScrolling").click();

    await TestUtils.waitForCondition(
      () =>
        Glean.browserUiInteraction.preferencesPaneAccessibility.useSmoothScrolling?.testGetValue() >=
        1,
      "useSmoothScrolling recorded in accessibility bucket"
    );
    Assert.greaterOrEqual(
      Glean.browserUiInteraction.preferencesPaneAccessibility.useSmoothScrolling.testGetValue(),
      1,
      "useSmoothScrolling interaction recorded in preferencesPaneAccessibility"
    );
    Assert.ok(
      !Glean.browserUiInteraction.preferencesPaneGeneral.useSmoothScrolling?.testGetValue(),
      "useSmoothScrolling did NOT record in preferencesPaneGeneral"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);

// browserLayoutShowSidebar: paneGeneral (legacy) -> paneTabsBrowsing (SRD).
// sidebar.revamp is pre-enabled so clicking unchecks it, avoiding the
// SidebarController.enabledViaSettings(true) side-effect.
add_task(
  async function test_browserLayoutShowSidebar_records_in_tabsBrowsing_bucket() {
    await SpecialPowers.pushPrefEnv({
      set: [["sidebar.revamp", true]],
    });
    await resetTelemetry();

    let tab = await openPrefsTab("tabsBrowsing");
    let doc = tab.linkedBrowser.contentDocument;

    await TestUtils.waitForCondition(
      () => doc.getElementById("browserLayoutShowSidebar"),
      "browserLayoutShowSidebar rendered"
    );
    doc.getElementById("browserLayoutShowSidebar").click();

    await TestUtils.waitForCondition(
      () =>
        Glean.browserUiInteraction.preferencesPaneTabsBrowsing.browserLayoutShowSidebar?.testGetValue() >=
        1,
      "browserLayoutShowSidebar recorded in tabsBrowsing bucket"
    );
    Assert.greaterOrEqual(
      Glean.browserUiInteraction.preferencesPaneTabsBrowsing.browserLayoutShowSidebar.testGetValue(),
      1,
      "browserLayoutShowSidebar interaction recorded in preferencesPaneTabsBrowsing"
    );
    Assert.ok(
      !Glean.browserUiInteraction.preferencesPaneGeneral.browserLayoutShowSidebar?.testGetValue(),
      "browserLayoutShowSidebar did NOT record in preferencesPaneGeneral"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);
