/* Any copyright is dedicated to the Public Domain.
 *http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// This test ensures that the installedWebAppCount metric is updated at
// startup even if it is nonzero. Refer to
// test_taskbarTabs_installedCountMetric.js for more details. (This needs to
// be in a different test so TaskbarTabs initializes a second time.)

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

  const taskbarTabsJSON = do_get_profile();
  taskbarTabsJSON.append("taskbartabs");
  taskbarTabsJSON.append("taskbartabs.json");
  const kId = "4186657a-0fe5-492a-af64-dc628c232c4c";
  await IOUtils.writeJSON(taskbarTabsJSON.path, {
    version: 1,
    taskbarTabs: [
      {
        id: kId,
        scopes: [{ hostname: "www.test.com" }],
        userContextId: 0,
        startUrl: "https://www.test.com/start",
      },
    ],
  });

  // We do not want to import this unknowingly, since that would mess up the
  // telemetry count, so import it explicitly right now.
  const { TaskbarTabs } = ChromeUtils.importESModule(
    "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs"
  );

  // Initialization is asynchronous, so do something to wait for it.
  await TaskbarTabs.waitUntilReady();

  equal(value(), 1, "The existing Taskbar Tab was counted");

  const { taskbarTab, created } = await TaskbarTabs.findOrCreateTaskbarTab(
    Services.io.newURI("https://www.test.com"),
    0
  );
  equal(created, false, "No new Taskbar Tab was created");
  equal(taskbarTab.id, kId, "Correct Taskbar Tab was found");
  equal(value(), 1, "Finding a Taskbar Tab does not affect the count");

  await TaskbarTabs.removeTaskbarTab(taskbarTab.id);
  equal(value(), 0, "Removing the taskbar tab was accounted for");
});
