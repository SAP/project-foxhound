/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests the ``SearchService.moveEngine`` function.
 */

"use strict";

const CONFIG = [
  { identifier: "a" },
  { identifier: "b" },
  { identifier: "c" },
  { identifier: "d" },
];

add_setup(async () => {
  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
});

let engineA;
let engineC;
let engineD;

add_task(async function test_move_engine() {
  await SearchService.init();

  engineA = SearchService.getEngineById("a");
  engineC = SearchService.getEngineById("c");
  engineD = SearchService.getEngineById("d");

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["a", "b", "c", "d"],
    "Should have the engines in their default order after init"
  );

  await SearchService.moveEngine(engineD, 0);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "a", "b", "c"],
    "Should have moved 'd' up to be the first engine"
  );

  await SearchService.moveEngine(engineC, 2);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "a", "c", "b"],
    "Should have moved 'c' up to be the third engine"
  );

  await SearchService.moveEngine(engineA, 3);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "c", "b", "a"],
    "Should have moved 'a' down to be the last engine"
  );

  await SearchService.moveEngine(engineC, 2);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "b", "c", "a"],
    "Should have moved 'c' down to be the third engine"
  );
});

add_task(async function test_move_engine_with_hidden() {
  // Re-uses the engine order from the previous task.

  engineC.hidden = true;

  await SearchService.moveEngine(engineD, 2);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["b", "c", "d", "a"],
    "Should have moved 'd' down past the hidden engine"
  );

  await SearchService.moveEngine(engineA, 0);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["a", "b", "c", "d"],
    "Should have moved 'a' up past the hidden engine"
  );

  await SearchService.moveEngine(engineC, 0);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["c", "a", "b", "d"],
    "Should have moved the hidden engine 'c' to the top"
  );

  await SearchService.moveEngine(engineC, 1);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["a", "c", "b", "d"],
    "Should have moved the hidden engine 'c' to the middle"
  );
});

add_task(async function test_move_engine_errors() {
  await Assert.rejects(
    SearchService.moveEngine({}, 1),
    /not a SearchEngine instance/,
    "Should have rejected moving something that isn't a search engine"
  );
  await Assert.rejects(
    SearchService.moveEngine(engineA, -1),
    /newIndex out of bounds/,
    "Should have rejected moving something to an out of bounds index"
  );
  await Assert.rejects(
    SearchService.moveEngine(
      engineA,
      (await SearchService.getEngines()).length + 1
    ),
    /newIndex out of bounds/,
    "Should have rejected moving something to an out of bounds index (2)"
  );
});
