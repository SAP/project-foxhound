/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/* This test verifies that the Smart Tab Grouping suggestions checkbox
 * correctly tracks the *tab* objects, not the moz-checkbox "value"
 * string ("on"), and that unchecking a suggestion causes it to be
 * excluded from the final addTabs() call.
 */

"use strict";
/**
 * Helper that opens the tab group editor in "create" mode for the given tab
 * and waits for the panel to be shown.
 *
 * @param {XULElement} tabgroupPanel
 * @param {MozTabbrowserTab} tab
 */
async function openCreatePanel(tabgroupPanel, tab) {
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabgroupPanel, "shown");
  gBrowser.addTabGroup([tab], {
    isUserTriggered: true,
  });
  await panelShown;
}

add_task(async function test_smart_tab_group_suggestions_checkbox_selection() {
  // Make sure we start from a clean telemetry state so we don't interfere
  // with the dedicated telemetry tests in this directory.
  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [
      // Enable tab groups + smart tab groups + ML.
      ["browser.tabs.groups.enabled", true],
      ["browser.tabs.groups.smart.enabled", true],
      ["browser.tabs.groups.smart.userEnabled", true],
      ["browser.tabs.groups.smart.optin", true],
      ["browser.ml.enable", true],
    ],
  });

  // ---- SmartTabGroupingManager stubs ------------------------------------
  //
  // We want:
  //  - full control over which tabs are "suggested"
  //  - no Glean telemetry emitted from this test

  const origSmartTabGroupingForGroup =
    SmartTabGroupingManager.prototype.smartTabGroupingForGroup;
  const origHandleSuggestTelemetry =
    SmartTabGroupingManager.prototype.handleSuggestTelemetry;
  const origHandleLabelTelemetry =
    SmartTabGroupingManager.prototype.handleLabelTelemetry;

  let suggestedTabs;

  SmartTabGroupingManager.prototype.smartTabGroupingForGroup = async function (
    _group,
    _tabs
  ) {
    // Just return our test-controlled list.
    return suggestedTabs;
  };

  SmartTabGroupingManager.prototype.handleSuggestTelemetry = function () {};
  SmartTabGroupingManager.prototype.handleLabelTelemetry = function () {};

  registerCleanupFunction(() => {
    SmartTabGroupingManager.prototype.smartTabGroupingForGroup =
      origSmartTabGroupingForGroup;
    SmartTabGroupingManager.prototype.handleSuggestTelemetry =
      origHandleSuggestTelemetry;
    SmartTabGroupingManager.prototype.handleLabelTelemetry =
      origHandleLabelTelemetry;

    // Clean up any telemetry from this test so subsequent tests
    // (especially the telemetry-focused ones) see a clean slate.
    Services.fog.testResetFOG();
  });

  // ---- Tab setup --------------------------------------------------------

  // Base tab that will start in the group.
  let baseTab = BrowserTestUtils.addTab(gBrowser, "about:blank");
  // Tabs that will be "suggested" by SmartTabGroupingManager.
  let tab1 = BrowserTestUtils.addTab(gBrowser, "https://example.com/1");
  let tab2 = BrowserTestUtils.addTab(gBrowser, "https://example.com/2");
  let tab3 = BrowserTestUtils.addTab(gBrowser, "https://example.com/3");

  suggestedTabs = [tab1, tab2, tab3];

  registerCleanupFunction(() => {
    for (let t of [baseTab, tab1, tab2, tab3]) {
      if (t && !t.closing && gBrowser.tabs.includes(t)) {
        BrowserTestUtils.removeTab(t);
      }
    }
  });

  // ---- Use the real tab group editor UI ---------------------------------

  let tabgroupEditor = document.getElementById("tab-group-editor");
  Assert.ok(
    tabgroupEditor,
    "We should have the built-in <tabgroup-menu id='tab-group-editor'> element"
  );

  let tabgroupPanel = tabgroupEditor.panel;
  Assert.ok(tabgroupPanel, "tab-group-editor should expose a panel property");

  // Open the editor panel in "create" mode for baseTab.
  await openCreatePanel(tabgroupPanel, baseTab);

  // activeGroup is wired up by the tabgroup-menu implementation.
  let group = tabgroupEditor.activeGroup;
  Assert.ok(group, "tabgroup-editor should have an activeGroup after open");

  // Kick off the AI suggestions flow via the button in the panel.
  let suggestButton = tabgroupPanel.querySelector(
    "#tab-group-suggestion-button"
  );
  Assert.ok(
    suggestButton,
    "Suggestion button should exist in the tab group panel"
  );
  Assert.ok(
    !suggestButton.hidden,
    "Suggestion button should be visible when smart tab groups is enabled"
  );

  suggestButton.click();

  // Wait for moz-checkbox suggestion rows to be created.
  await BrowserTestUtils.waitForCondition(
    () =>
      tabgroupPanel.querySelectorAll(".tab-group-suggestion-checkbox")
        .length === suggestedTabs.length,
    "Waiting for suggestion checkboxes to be created"
  );

  let checkboxes = tabgroupPanel.querySelectorAll(
    ".tab-group-suggestion-checkbox"
  );
  Assert.equal(
    checkboxes.length,
    suggestedTabs.length,
    "We should have one checkbox per suggested tab"
  );

  // Initially, all suggestions are checked.
  for (let checkbox of checkboxes) {
    Assert.ok(checkbox.checked, "Each suggestion checkbox starts checked");
  }

  // Uncheck the second suggested tab.
  //
  // The bug this test guards against:
  //   - moz-checkbox .value defaults to "on"
  //   - Using checkbox.value in the change handler stores "on" instead of
  //     the actual Tab object, so filtering by that later fails.
  checkboxes[1].click();
  Assert.ok(
    !checkboxes[1].checked,
    "Second suggestion checkbox should now be unchecked"
  );

  // Confirm the suggestions. Internally this calls:
  //   this.activeGroup.addTabs(this.#selectedSuggestedTabs);
  let doneButton = tabgroupPanel.querySelector(
    "#tab-group-create-suggestions-button"
  );
  Assert.ok(doneButton, "Should find the 'Done' suggestions button");

  // Listen for TabGrouped events for the selected tabs before clicking Done.
  let tab1Grouped = BrowserTestUtils.waitForEvent(
    group,
    "TabGrouped",
    false,
    e => e.detail == tab1
  );
  let tab3Grouped = BrowserTestUtils.waitForEvent(
    group,
    "TabGrouped",
    false,
    e => e.detail == tab3
  );

  let panelHidden = BrowserTestUtils.waitForPopupEvent(tabgroupPanel, "hidden");
  doneButton.click();

  await Promise.all([panelHidden, tab1Grouped, tab3Grouped]);

  Assert.ok(
    !tab2.group,
    "tab 2 should not have been grouped because it was deselected"
  );
});
