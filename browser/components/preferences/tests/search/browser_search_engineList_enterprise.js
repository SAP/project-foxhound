/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// This tests the search engine list in about:preferences#search when an
// enterprise policy removes some engines.

"use strict";

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);
const { SearchUtils } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/search/SearchUtils.sys.mjs"
);

SearchTestUtils.init(this);

const CONFIG = [
  { identifier: "engine-a" },
  { identifier: "engine-b" },
  { identifier: "engine-c" },
  { identifier: "engine-d" },
  { identifier: "engine-e" },
];

const REMOVED_ENGINE_NAMES = ["engine-b", "engine-d"];
const CONFIG_ENGINE_NAMES = CONFIG.map(e => e.identifier);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
  PoliciesPrefTracker.start();
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);

  registerCleanupFunction(async () => {
    await EnterprisePolicyTesting.setupPolicyEngineWithJsonForSearch("");
    EnterprisePolicyTesting.resetRunOnceState();
    PoliciesPrefTracker.stop();
  });
});

async function withSearchEnginesRemoved(fn) {
  await EnterprisePolicyTesting.setupPolicyEngineWithJsonForSearch({
    policies: {
      SearchEngines: {
        Remove: REMOVED_ENGINE_NAMES,
      },
    },
  });

  Assert.deepEqual(
    (await Services.policies.getActivePolicies()).SearchEngines.Remove,
    REMOVED_ENGINE_NAMES,
    "Enterprise policy is active with the expected removed engine names"
  );

  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });
  let win = gBrowser.selectedBrowser.contentWindow;
  let boxGroupControl = await settingControlRenders("engineList", win);
  let boxGroup = boxGroupControl.controlEl;
  await boxGroup.updateComplete;

  try {
    await fn({ win, boxGroup });
  } finally {
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    await EnterprisePolicyTesting.setupPolicyEngineWithJsonForSearch("");
    EnterprisePolicyTesting.resetRunOnceState();
  }
}

add_task(async function test_enterprise_removed_engines_not_displayed() {
  await withSearchEnginesRemoved(async ({ boxGroup }) => {
    for (let name of REMOVED_ENGINE_NAMES) {
      Assert.equal(
        boxGroup.querySelector(`moz-box-item[label="${name}"]`),
        null,
        `Policy-removed engine "${name}" should not appear in the list`
      );
      Assert.ok(
        SearchService.getEngineByName(name),
        `Engine "${name}" still exists in the search service`
      );
    }

    for (let name of CONFIG_ENGINE_NAMES.filter(
      n => !REMOVED_ENGINE_NAMES.includes(n)
    )) {
      Assert.ok(
        boxGroup.querySelector(`moz-box-item[label="${name}"]`),
        `Engine "${name}" should appear in the list`
      );
    }
  });
});

add_task(async function test_reorder_with_removed_engines() {
  await withSearchEnginesRemoved(async ({ win, boxGroup }) => {
    // Displayed list is [engine-a, engine-c, engine-e].
    // Drag engine-a to after engine-c; the expected displayed result is
    // [engine-c, engine-a, engine-e].
    let draggedEngine = SearchService.getEngineByName("engine-a");
    let targetEngine = SearchService.getEngineByName("engine-c");

    let draggedItem = boxGroup.querySelector(
      `moz-box-item[label="${draggedEngine.name}"]`
    );
    let targetItem = boxGroup.querySelector(
      `moz-box-item[label="${targetEngine.name}"]`
    );

    let changed = SearchTestUtils.promiseSearchNotification(
      SearchUtils.MODIFIED_TYPE.CHANGED,
      SearchUtils.TOPIC_ENGINE_MODIFIED
    );

    performDragAndDrop({
      contentWindow: win,
      dragItem: draggedItem.handleEl,
      targetItem,
      position: "after",
    });

    await changed;
    await boxGroup.updateComplete;

    let displayedNames = [...boxGroup.querySelectorAll("moz-box-item")]
      .map(item => item.label)
      .filter(name => CONFIG_ENGINE_NAMES.includes(name));

    Assert.deepEqual(
      displayedNames,
      ["engine-c", "engine-a", "engine-e"],
      "engine-a should be displayed after engine-c following the reorder"
    );
  });
});

add_task(async function test_reorder_with_removed_and_user_hidden_engines() {
  await withSearchEnginesRemoved(async ({ win, boxGroup }) => {
    // engine-b and engine-d are enterprise-removed
    // engine-c is user-hidden.
    // Displayed list is [engine-a, engine-c, engine-e].
    let engineC = SearchService.getEngineByName("engine-c");
    engineC.hidden = true;
    await boxGroup.updateComplete;

    Assert.ok(
      boxGroup.querySelector(`moz-box-item[label="${engineC.name}"]`),
      "user-hidden engine-c should still appear in the displayed list"
    );

    // Drag engine-a to the end (after engine-e).
    let draggedEngine = SearchService.getEngineByName("engine-a");
    let targetEngine = SearchService.getEngineByName("engine-e");

    let draggedItem = boxGroup.querySelector(
      `moz-box-item[label="${draggedEngine.name}"]`
    );
    let targetItem = boxGroup.querySelector(
      `moz-box-item[label="${targetEngine.name}"]`
    );

    let changed = SearchTestUtils.promiseSearchNotification(
      SearchUtils.MODIFIED_TYPE.CHANGED,
      SearchUtils.TOPIC_ENGINE_MODIFIED
    );

    performDragAndDrop({
      contentWindow: win,
      dragItem: draggedItem.handleEl,
      targetItem,
      position: "after",
    });

    await changed;
    await boxGroup.updateComplete;

    let displayedNames = [...boxGroup.querySelectorAll("moz-box-item")]
      .map(item => item.label)
      .filter(name => CONFIG_ENGINE_NAMES.includes(name));

    Assert.deepEqual(
      displayedNames,
      ["engine-c", "engine-e", "engine-a"],
      "engine-a should be at the end after dragging past the user-hidden engine"
    );
  });
});
