/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  registerCleanupFunction(() => resetState());
});

add_task(async function test_test_condition_true() {
  await checkNotification({ type: "test", ret: true }, true);
});

add_task(async function test_test_condition_false() {
  await checkNotification({ type: "test", ret: false }, false);
});

add_task(async function test_and_all_true() {
  await checkNotification(
    {
      type: "and",
      conditions: [
        { type: "test", ret: true },
        { type: "test", ret: true },
      ],
    },
    true
  );
});

add_task(async function test_and_one_false() {
  await checkNotification(
    {
      type: "and",
      conditions: [
        { type: "test", ret: true },
        { type: "test", ret: false },
      ],
    },
    false
  );
});

add_task(async function test_or_one_true() {
  await checkNotification(
    {
      type: "or",
      conditions: [
        { type: "test", ret: false },
        { type: "test", ret: true },
      ],
    },
    true
  );
});

add_task(async function test_or_all_false() {
  await checkNotification(
    {
      type: "or",
      conditions: [
        { type: "test", ret: false },
        { type: "test", ret: false },
      ],
    },
    false
  );
});

add_task(async function test_not_true() {
  await checkNotification(
    { type: "not", condition: { type: "test", ret: true } },
    false
  );
});

add_task(async function test_not_false() {
  await checkNotification(
    { type: "not", condition: { type: "test", ret: false } },
    true
  );
});

add_task(async function test_nested_and_or_not() {
  await checkNotification(
    {
      type: "and",
      conditions: [
        { type: "test", ret: true },
        {
          type: "or",
          conditions: [
            { type: "test", ret: false },
            { type: "not", condition: { type: "test", ret: false } },
          ],
        },
      ],
    },
    true
  );
});
