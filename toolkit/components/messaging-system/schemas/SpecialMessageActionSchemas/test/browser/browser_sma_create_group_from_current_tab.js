/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let resetTelemetry = async () => {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
};

registerCleanupFunction(async () => {
  await resetTelemetry();
});

/**
 * Removes a tab group, along with its tabs. Resolves when the tab group
 * is gone.
 *
 * @param {MozTabbrowserTabGroup} group group to be removed
 * @returns {Promise<void>}
 */
async function removeTabGroup(group) {
  if (!group.parentNode) {
    // group was already removed
    return;
  }
  let removePromise = BrowserTestUtils.waitForEvent(group, "TabGroupRemoved");
  await group.documentGlobal.gBrowser.removeTabGroup(group, { animate: false });
  await removePromise;
}

/**
 * Executes the `CREATE_GROUP_FROM_CURRENT_TAB` action and resolves to the
 * tab group that was created from the action.
 *
 * Also waits for the tab group creation panel to open because:
 * 1. we expect the messaging action to open it, and
 * 2. removing a group while the panel is opening can cause the grouped
 *    tab to be prematurely booted from the group.
 *
 * @param {MozTabbrowserTab} [explicitTab=undefined]
 * @returns {Promise<MozTabbrowserTabGroup>}
 */
async function createGroupFromCurrentTab(explicitTab = undefined) {
  let tabGroupCreated = BrowserTestUtils.waitForEvent(
    window,
    "TabGroupCreateByUser"
  );
  let tabGroupMenuPanel = gBrowser.tabGroupMenu.panel;
  let tabGroupMenuShown = BrowserTestUtils.waitForPopupEvent(
    tabGroupMenuPanel,
    "shown"
  );

  await SMATestUtils.executeAndValidateAction(
    {
      type: "CREATE_GROUP_FROM_CURRENT_TAB",
    },
    explicitTab?.linkedBrowser
  );

  let [tabGroupCreatedEvent] = await Promise.all([
    tabGroupCreated,
    tabGroupMenuShown,
  ]);
  return tabGroupCreatedEvent.target;
}

// Test the happy path when the current tab is not already in a tab group.
add_task(async function test_CREATE_GROUP_FROM_CURRENT_TAB_not_in_group() {
  let tab = BrowserTestUtils.addTab(gBrowser, "about:blank");
  ok(!tab.group, "tab should not be in a group initially");

  let tabCountBefore = gBrowser.tabs.length;

  let newTabGroup = await createGroupFromCurrentTab(tab);

  ok(tab.group, "tab should now be in a group");
  is(tab.group.tabs.length, 1, "group should contain only the current tab");
  is(tab.group.tabs[0], tab, "group should contain only the current tab");
  is(
    gBrowser.tabs.length,
    tabCountBefore,
    "no new tabs should have been created"
  );

  await removeTabGroup(newTabGroup);
});

// Test that the action does nothing when the current tab is already in a tab group.
add_task(async function test_CREATE_GROUP_FROM_CURRENT_TAB_already_in_group() {
  let tab = BrowserTestUtils.addTab(gBrowser, "about:blank");
  let existingGroup = gBrowser.addTabGroup([tab], { insertBefore: tab });
  is(tab.group, existingGroup, "tab should be in a group");

  let tabCountBefore = gBrowser.tabs.length;

  let newTabGroup = await createGroupFromCurrentTab(tab);

  is(tab.group, existingGroup, "tab should still be in its original group");
  is(
    gBrowser.tabs.length,
    tabCountBefore + 1,
    "a new tab should have been created"
  );
  is(newTabGroup.tabs.length, 1, "new tab should be in the new tab group");
  isnot(existingGroup, newTabGroup, "the new tab group should actually be new");
  is(
    newTabGroup.tabs[0].linkedBrowser.currentURI.spec,
    window.BROWSER_NEW_TAB_URL,
    "new tab should use the new tab URL"
  );

  await removeTabGroup(existingGroup);
  await removeTabGroup(newTabGroup);
});

// Test that the action falls back to using the active tab (gBrowser.selectedTab)
// if the action is not performed inside of the context of a specific tab.
add_task(
  async function test_CREATE_GROUP_FROM_CURRENT_TAB_implicit_active_tab() {
    let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
    ok(!tab.group, "tab should not be in a group initially");
    is(tab, gBrowser.selectedTab, "tab should be the active tab");

    let newTabGroup = await createGroupFromCurrentTab();

    ok(tab.group, "tab should now be in a group");
    is(tab.group, newTabGroup, "tab is in the tab group created by the action");
    is(tab, gBrowser.selectedTab, "tab should still be the active tab");
    is(tab.group.tabs.length, 1, "group should contain only the active tab");

    await removeTabGroup(newTabGroup);
  }
);

// Test that existing tab group creation telemetry records that a messaging system
// surface was the source of the action.
add_task(
  async function test_CREATE_GROUP_FROM_CURRENT_TAB_should_record_messaging_telemetry() {
    await resetTelemetry();
    BrowserTestUtils.addTab(gBrowser, "about:blank");

    let newTabGroup = await createGroupFromCurrentTab();

    let tabGroupCreateEvents = Glean.tabgroup.createGroup.testGetValue();

    is(
      tabGroupCreateEvents.length,
      1,
      "should have recorded 1 tab group create event"
    );
    is(
      tabGroupCreateEvents[0].extra.source,
      "messaging",
      "telemetry source should be the messaging system"
    );

    await removeTabGroup(newTabGroup);
  }
);
