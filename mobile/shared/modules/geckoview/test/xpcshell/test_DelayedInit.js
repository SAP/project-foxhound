/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { DelayedInit } = ChromeUtils.importESModule(
  "resource://gre/modules/DelayedInit.sys.mjs"
);

add_task(async function test_delayed_init_continues_queue_on_failure() {
  const results = [];
  const waitMs = 0;

  DelayedInit.schedule(
    () => {
      results.push("first");
    },
    null,
    null,
    waitMs
  );

  DelayedInit.schedule(
    () => {
      results.push("second");
      throw new Error("Deliberate error for testing");
    },
    null,
    null,
    waitMs
  );

  DelayedInit.schedule(
    () => {
      results.push("third");
    },
    null,
    null,
    waitMs
  );

  await new Promise(resolve => ChromeUtils.idleDispatch(resolve));

  Assert.deepEqual(
    results,
    ["first", "second", "third"],
    "Queue processes all inits even when one fails"
  );
});
