/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { SmartTabGroupingManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabbrowser/SmartTabGrouping.sys.mjs"
);

// Simple helper to construct tab-like objects for tests.
function makeTab(id, { pinned = false, hasURL = true } = {}) {
  return {
    id,
    label: `Tab ${id}`,
    pinned,
    linkedBrowser: hasURL
      ? { currentURI: { spec: `https://example.com/${id}` } }
      : null,
  };
}

add_task(
  function test_tabs_to_process_includes_group_first_and_respects_limit() {
    const manager = new SmartTabGroupingManager();

    const groupTab1 = makeTab("group-1");
    const groupTab2 = makeTab("group-2");
    const other1 = makeTab("other-1");
    const other2 = makeTab("other-2");
    const other3 = makeTab("other-3");

    const tabsInGroup = [groupTab1, groupTab2];
    const allTabs = [groupTab1, other1, groupTab2, other2, other3];

    // Limit 4: should be [group tabs] first, then fill with window tabs.
    let resultIds = manager
      .getTabsToProcess(tabsInGroup, allTabs, 4)
      .map(t => t.id);

    Assert.deepEqual(
      resultIds,
      ["group-1", "group-2", "other-1", "other-2"],
      "Group tabs should come first, then window tabs, up to the limit"
    );

    // Limit 2: should only include the group tabs.
    resultIds = manager
      .getTabsToProcess(tabsInGroup, allTabs, 2)
      .map(t => t.id);

    Assert.deepEqual(
      resultIds,
      ["group-1", "group-2"],
      "When limit equals number of group tabs, only group tabs are returned"
    );
  }
);

add_task(
  function test_tabs_to_process_limits_anchor_tabs_to_max_nn_grouped_tabs() {
    const manager = new SmartTabGroupingManager();

    // More than MAX_NN_GROUPED_TABS (4) tabs in the group.
    const groupTabs = [];
    for (let i = 0; i < 6; i++) {
      groupTabs.push(makeTab(`group-${i}`));
    }
    const extraTab = makeTab("other");
    const allTabs = [...groupTabs, extraTab];

    const resultIds = manager
      .getTabsToProcess(groupTabs, allTabs, 10)
      .map(t => t.id);

    Assert.deepEqual(
      resultIds,
      ["group-0", "group-1", "group-2", "other"],
      "Only the first MAX_NN_GROUPED_TABS group tabs should be kept, then window tabs"
    );
  }
);

add_task(function test_tabs_to_process_deduplicates_group_tabs_in_all_tabs() {
  const manager = new SmartTabGroupingManager();

  const groupTab1 = makeTab("group-1");
  const groupTab2 = makeTab("group-2");
  const other1 = makeTab("other-1");

  // group tabs also appear in allTabs
  const tabsInGroup = [groupTab1, groupTab2];
  const allTabs = [groupTab1, groupTab2, other1];

  const resultIds = manager
    .getTabsToProcess(tabsInGroup, allTabs, 10)
    .map(t => t.id);

  Assert.deepEqual(
    resultIds,
    ["group-1", "group-2", "other-1"],
    "Tabs already in the group should not be duplicated when iterating allTabs"
  );
});

add_task(function test_tabs_to_process_more_non_group_tabs_than_limit() {
  const manager = new SmartTabGroupingManager();

  const groupTab1 = makeTab("group-1");
  const groupTab2 = makeTab("group-2");

  const tabsInGroup = [groupTab1, groupTab2];

  // 10 non-group tabs
  const nonGroupTabs = [];
  for (let i = 0; i < 10; i++) {
    nonGroupTabs.push(makeTab(`other-${i}`));
  }

  const allTabs = [groupTab1, ...nonGroupTabs, groupTab2];

  // Limit 6 => 2 group tabs + first 4 non-group tabs (in allTabs order)
  const resultIds = manager
    .getTabsToProcess(tabsInGroup, allTabs, 6)
    .map(t => t.id);

  Assert.deepEqual(
    resultIds,
    ["group-1", "group-2", "other-0", "other-1", "other-2", "other-3"],
    "When there are more non-group tabs than the limit, only the first ones (by window order) are included after the group tabs"
  );
});

add_task(function test_tabs_to_process_with_no_group_tabs() {
  const manager = new SmartTabGroupingManager();

  const allTabs = [];
  for (let i = 0; i < 8; i++) {
    allTabs.push(makeTab(`tab-${i}`));
  }

  const tabsInGroup = [];

  const resultIds = manager
    .getTabsToProcess(tabsInGroup, allTabs, 5)
    .map(t => t.id);

  Assert.deepEqual(
    resultIds,
    ["tab-0", "tab-1", "tab-2", "tab-3", "tab-4"],
    "When there are no group tabs, we should just take up to the limit from window tabs"
  );
});

add_task(function test_tabs_to_process_uses_default_max_limit() {
  const manager = new SmartTabGroupingManager();

  // 350 non-group tabs, all valid
  const allTabs = [];
  for (let i = 0; i < 350; i++) {
    allTabs.push(makeTab(`tab-${i}`));
  }

  const tabsInGroup = [];

  // Use default max_limit_to_process (should be 100)
  const result = manager.getTabsToProcess(tabsInGroup, allTabs);
  const resultIds = result.map(t => t.id);

  Assert.equal(
    resultIds.length,
    300,
    "Default max limit should cap the number of processed tabs to 300"
  );

  Assert.deepEqual(
    resultIds.slice(0, 5),
    ["tab-0", "tab-1", "tab-2", "tab-3", "tab-4"],
    "Default behavior should preserve window order for the first tabs"
  );
});

add_task(function test_tabs_to_process_all_tabs_filtered_out() {
  const manager = new SmartTabGroupingManager();

  // All pinned
  const pinned1 = makeTab("pinned-1", { pinned: true });
  const pinned2 = makeTab("pinned-2", { pinned: true });

  // All missing URL
  const noUrl1 = makeTab("no-url-1", { hasURL: false });
  const noUrl2 = makeTab("no-url-2", { hasURL: false });

  const tabsInGroup = [pinned1];
  const allTabs = [pinned1, pinned2, noUrl1, noUrl2];

  const result = manager.getTabsToProcess(tabsInGroup, allTabs, 10);

  Assert.deepEqual(
    result,
    [],
    "If all tabs are filtered out (pinned or no URL), we should return an empty list"
  );
});

add_task(function test_tabs_to_process_group_tabs_not_in_allTabs() {
  const manager = new SmartTabGroupingManager();

  const externalGroupTab = makeTab("external-group"); // not in allTabs
  const other1 = makeTab("other-1");
  const other2 = makeTab("other-2");

  const tabsInGroup = [externalGroupTab];
  const allTabs = [other1, other2];

  const resultIds = manager
    .getTabsToProcess(tabsInGroup, allTabs, 3)
    .map(t => t.id);

  Assert.deepEqual(
    resultIds,
    ["external-group", "other-1", "other-2"],
    "Tabs in the group should still be included even if they don't appear in allTabs"
  );
});
