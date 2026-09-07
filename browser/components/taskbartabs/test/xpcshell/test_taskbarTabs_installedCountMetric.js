/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// This test ensures that the installedWebAppCount metric is updated at
// startup. Remaining telemetry tests are in browser_taskbarTabs_telemetry.js;
// this one is separate since it needs to check behaviour when the browser
// starts, which we can't reliably do in a Mochitest.

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TaskbarTabsPin: "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs",
});

add_setup(function test_setup() {
  do_get_profile();
  Services.fog.initializeFOG();

  sinon.stub(TaskbarTabsPin, "pinTaskbarTab");
  sinon.stub(TaskbarTabsPin, "unpinTaskbarTab");
});

add_task(async function test_installedCounterMetric() {
  const value = () => Glean.webApp.installedWebAppCount.testGetValue();
  equal(value(), undefined, "Should not be set before initializing");

  // We do not want to import this unknowingly, since that would mess up the
  // telemetry count, so import it explicitly right now.
  const { TaskbarTabs } = ChromeUtils.importESModule(
    "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs"
  );

  // Initialization is asynchronous, so do something to wait for it.
  await TaskbarTabs.waitUntilReady();

  equal(value(), 0, "No taskbar tabs exist yet");

  const tt1 = await createTaskbarTab(
    TaskbarTabs,
    Services.io.newURI("https://example.com"),
    0
  );
  equal(value(), 1, "First new taskbar tab was accounted for");

  const tt2 = await createTaskbarTab(
    TaskbarTabs,
    Services.io.newURI("https://example.edu"),
    0
  );
  equal(value(), 2, "Second new taskbar tab was accounted for");

  await TaskbarTabs.removeTaskbarTab(tt1.id);
  equal(value(), 1, "Removing first taskbar tab was accounted for");

  await TaskbarTabs.removeTaskbarTab(tt2.id);
  equal(value(), 0, "Removing second taskbar tab was accounted for");
});
