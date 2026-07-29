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
  { identifier: "e" },
];

add_setup(async () => {
  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
});

let engineA;
let engineB;
let engineC;
let engineD;

add_task(async function test_move_engine() {
  await SearchService.init();

  engineA = SearchService.getEngineById("a");
  engineB = SearchService.getEngineById("b");
  engineC = SearchService.getEngineById("c");
  engineD = SearchService.getEngineById("d");

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["a", "b", "c", "d", "e"],
    "Should have the engines in their default order after init"
  );

  await SearchService.moveEngine(engineD, 0);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "a", "b", "c", "e"],
    "Should have moved 'd' up to be the first engine"
  );

  await SearchService.moveEngine(engineC, 2);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "a", "c", "b", "e"],
    "Should have moved 'c' up to be the third engine"
  );

  await SearchService.moveEngine(engineA, 3);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "c", "b", "a", "e"],
    "Should have moved 'a' down to be the penultimate engine"
  );

  await SearchService.moveEngine(engineC, 2);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["d", "b", "c", "a", "e"],
    "Should have moved 'c' down to be the third engine"
  );
});

add_task(async function test_move_engine_with_hidden() {
  // Re-uses the engine order from the previous task.

  engineC.hidden = true;

  await SearchService.moveEngine(engineD, 2);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["b", "c", "d", "a", "e"],
    "Should have moved 'd' down past the hidden engine"
  );

  await SearchService.moveEngine(engineA, 0);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["a", "b", "c", "d", "e"],
    "Should have moved 'a' up past the hidden engine"
  );

  await SearchService.moveEngine(engineC, 0);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["c", "a", "b", "d", "e"],
    "Should have moved the hidden engine 'c' to the top"
  );

  await SearchService.moveEngine(engineC, 1);

  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["a", "c", "b", "d", "e"],
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

async function resetEngines() {
  for (let engine of await SearchService.getEngines()) {
    engine.hidden = false;
  }
  for (let [index, id] of ["a", "b", "c", "d", "e"].entries()) {
    await SearchService.moveEngine(SearchService.getEngineById(id), index);
  }
}

add_task(async function test_move_engine_with_skip_engines() {
  await resetEngines();

  // Simulate the enterprise policy scenario: b and d are policy-removed
  // (hidden) and excluded from the displayed list, leaving visible
  // engines [a, c, e] at displayed indices 0, 1, 2.
  engineB.hidden = true;
  engineD.hidden = true;

  let skipEngines = new Set(["b", "d"]);

  // Move a to after c (displayed index 1). Without skipEngines this would
  // land at absolute index 1, placing a between b and c rather than after c.
  await SearchService.moveEngine(engineA, 1, skipEngines);

  Assert.deepEqual(
    (await SearchService.getVisibleEngines()).map(e => e.id),
    ["c", "a", "e"],
    "Should have moved 'a' to after 'c' in the visible list"
  );
  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["b", "c", "a", "d", "e"],
    "Should have moved 'a' to the correct absolute position past the skipped engines"
  );

  // Move c to the end of the visible list (displayed index 2). Without
  // skipEngines this would land at absolute index 2, before d rather than
  // after it.
  await SearchService.moveEngine(engineC, 2, skipEngines);

  Assert.deepEqual(
    (await SearchService.getVisibleEngines()).map(e => e.id),
    ["a", "e", "c"],
    "Should have moved 'c' to the end of the visible list"
  );
  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["b", "a", "d", "e", "c"],
    "Should have moved 'c' to the correct absolute position past the skipped engines"
  );
});

add_task(async function test_move_engine_skip_engines_errors() {
  // Re-uses the engine state from the previous task (b and d hidden).
  let skipEngines = new Set(["b", "d"]);
  await Assert.rejects(
    SearchService.moveEngine(engineB, 0, skipEngines),
    /Unable to move a skipped engine/,
    "Should have rejected moving an engine that is in the skipEngines set"
  );
});

add_task(async function test_move_engine_skip_engines_with_user_hidden() {
  await resetEngines();

  // b is enterprise-removed (hidden + in skipEngines).
  // c is user-hidden (hidden, NOT in skipEngines – it stays in the UI list).
  engineB.hidden = true;
  engineC.hidden = true;

  let skipEngines = new Set(["b"]);

  // Displayed list is [a, c, d, e] at displayed indices 0, 1, 2, 3.
  await SearchService.moveEngine(engineA, 3, skipEngines);

  Assert.deepEqual(
    (await SearchService.getEngines())
      .filter(e => !skipEngines.has(e.name))
      .map(e => e.id),
    ["c", "d", "e", "a"],
    "Should have moved 'a' to the end of the displayed list"
  );
  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["b", "c", "d", "e", "a"],
    "Should have moved 'a' to the correct absolute position"
  );
});

add_task(async function test_move_engine_skip_hidden() {
  // Tests the legacy `skipHidden = true` path used by the old preferences UI.
  await resetEngines();

  engineB.hidden = true;

  // Visible engines are [a, c, d, e] at displayed indices 0, 1, 2, 3.
  // Move a to displayed index 2 (d). skipHidden adjusts to account for b.
  await SearchService.moveEngine(engineA, 2, null, true);

  Assert.deepEqual(
    (await SearchService.getVisibleEngines()).map(e => e.id),
    ["c", "d", "a", "e"],
    "Should have moved 'a' past the hidden engine to the correct visible position"
  );
  Assert.deepEqual(
    (await SearchService.getEngines()).map(e => e.id),
    ["b", "c", "d", "a", "e"],
    "Should have moved 'a' to the correct absolute position past the hidden engine"
  );

  await Assert.rejects(
    SearchService.moveEngine(engineB, 0, null, true),
    /Unable to move a hidden engine/,
    "Should have rejected moving a hidden engine with skipHidden set"
  );
});
