/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ScheduledTask: "resource://gre/modules/ScheduledTask.sys.mjs",
});

add_task(async function testRunArmedAccordingToSchedule() {
  let isCalled = false;
  const scheduledTime = Date.now() + 1000;
  const task = new lazy.ScheduledTask(async () => {
    isCalled = true;
  }, scheduledTime).arm();
  await task.asPromise();
  Assert.greaterOrEqual(Date.now(), scheduledTime);
  Assert.ok(isCalled);
});

add_task(async function testNeverArmed() {
  let isCalled = false;
  const scheduledTime = Date.now() + 1000;
  const task = new lazy.ScheduledTask(async () => {
    isCalled = true;
  }, scheduledTime);
  await task.asPromise();
  Assert.ok(!isCalled);
});

add_task(async function testArmThenDisarm() {
  let isCalled = false;
  const scheduledTime = Date.now() + 1000;
  const task = new lazy.ScheduledTask(async () => {
    isCalled = true;
  }, scheduledTime)
    .arm()
    .disarm();
  await task.asPromise();
  Assert.ok(!isCalled);
});
