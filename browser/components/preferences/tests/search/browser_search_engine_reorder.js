/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { SearchTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/SearchTestUtils.sys.mjs"
);
const { SearchUtils } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/search/SearchUtils.sys.mjs"
);

SearchTestUtils.init(this);

const CONFIG = [
  { identifier: "a" },
  { identifier: "b" },
  { identifier: "c" },
  { identifier: "d" },
  { identifier: "e" },
];

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
  await SearchTestUtils.updateRemoteSettingsConfig(CONFIG);
});

async function openSearchPane() {
  await openPreferencesViaOpenPreferencesAPI("search", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  return { win: gBrowser.contentWindow, doc, tab: gBrowser.selectedTab };
}

async function reorderEngine({
  win,
  boxGroup,
  draggedEngine,
  targetEngine,
  position,
}) {
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
    position,
  });

  await changed;
}

async function reorderEngineWithKeyboard({
  win,
  boxGroup,
  draggedEngine,
  direction,
}) {
  let draggedItem = boxGroup.querySelector(
    `moz-box-item[label="${draggedEngine.name}"]`
  );

  let updatedPromise = SearchTestUtils.promiseSearchNotification(
    SearchUtils.MODIFIED_TYPE.CHANGED,
    SearchUtils.TOPIC_ENGINE_MODIFIED
  );

  draggedItem.focus();
  EventUtils.synthesizeKey(
    direction == "up" ? "KEY_ArrowUp" : "KEY_ArrowDown",
    { ctrlKey: true, shiftKey: true },
    win
  );

  await updatedPromise;
}

add_task(async function test_reordering_engines_position_before() {
  let { win, tab } = await openSearchPane();

  let boxGroupControl = await settingControlRenders("engineList", win);
  let boxGroup = boxGroupControl.controlEl;

  let engines = await SearchService.getEngines();
  await boxGroup.updateComplete;

  const expectedOrder = [
    engines[1].id,
    engines[2].id,
    engines[0].id,
    engines[3].id,
    engines[4].id,
  ];

  await reorderEngine({
    win,
    boxGroup,
    draggedEngine: engines[0],
    targetEngine: engines[3],
    position: "before",
  });

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    expectedOrder,
    `${engines[0].id} should land before ${engines[3].id}`
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_reordering_engines_position_after_from_end() {
  let { win, tab } = await openSearchPane();

  let boxGroupControl = await settingControlRenders("engineList", win);
  let boxGroup = boxGroupControl.controlEl;

  let engines = await SearchService.getEngines();
  await boxGroup.updateComplete;

  const expectedOrder = [
    engines[0].id,
    engines[1].id,
    engines[4].id,
    engines[2].id,
    engines[3].id,
  ];
  await reorderEngine({
    win,
    boxGroup,
    draggedEngine: engines[4],
    targetEngine: engines[1],
    position: "after",
  });

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    expectedOrder,
    `${engines[4].id} should land after ${engines[1].id}`
  );

  await BrowserTestUtils.removeTab(tab);
});

async function testKeyboardReorder({ draggedIndex, direction }) {
  let { win, tab } = await openSearchPane();

  let boxGroupControl = await settingControlRenders("engineList", win);
  let boxGroup = boxGroupControl.controlEl;

  let engines = await SearchService.getEngines();
  await boxGroup.updateComplete;

  let expectedOrder = engines.map(e => e.id);
  let [movingEngineId] = expectedOrder.splice(draggedIndex, 1);
  expectedOrder.splice(
    draggedIndex + (direction == "up" ? -1 : 1),
    0,
    movingEngineId
  );

  await reorderEngineWithKeyboard({
    win,
    boxGroup,
    draggedEngine: engines[draggedIndex],
    direction,
  });

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    expectedOrder,
    `${engines[draggedIndex].id} should move ${direction} one position`
  );

  await BrowserTestUtils.removeTab(tab);
}

add_task(function test_reordering_engines_keyboard_arrow_down() {
  return testKeyboardReorder({ draggedIndex: 0, direction: "down" });
});

add_task(function test_reordering_engines_keyboard_arrow_up() {
  return testKeyboardReorder({ draggedIndex: 4, direction: "up" });
});
