/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  FileTestUtils: "resource://testing-common/FileTestUtils.sys.mjs",
  TaskbarTabsRegistry:
    "resource:///modules/taskbartabs/TaskbarTabsRegistry.sys.mjs",
  TaskbarTabsWindowManager:
    "resource:///modules/taskbartabs/TaskbarTabsWindowManager.sys.mjs",
  TaskbarTabsPin: "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
  ShellService: "moz-src:///browser/components/shell/ShellService.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  MockRegistrar: "resource://testing-common/MockRegistrar.sys.mjs",
});

// We don't care about pinning or unpinning, so just do enough to fake errors.
let gShortcutPinResult = null;
const exposePinResult = () => {
  if (gShortcutPinResult !== null) {
    const error = new Error();
    error.name = gShortcutPinResult;
    throw error;
  }
};

// Similarly, we want to fake an error while deleting to check that telemetry
// reports it.
let gShortcutDeleteResult = null;
const exposeDeleteResult = async () => {
  if (gShortcutDeleteResult !== null) {
    const error = new Error();
    error.name = gShortcutDeleteResult;
    throw error;
  }
};

const proxyNativeShellService = {
  ...ShellService.shellService,
  createShortcut: sinon.stub().resolves("dummy_path"),
  deleteShortcut: sinon.stub().callsFake(exposeDeleteResult),
  pinShortcutToTaskbar: sinon.stub().callsFake(exposePinResult),
  unpinShortcutFromTaskbar: sinon.stub().callsFake(exposePinResult),
};

sinon.stub(ShellService, "shellService").value(proxyNativeShellService);
sinon.stub(ShellService, "createWindowsIcon").resolves();

registerCleanupFunction(() => {
  sinon.restore();
});

// Don't use the normal TaskbarTabs module, since we don't want it to pin
// automatically.
const gRegistry = new TaskbarTabsRegistry();
const gWindowManager = new TaskbarTabsWindowManager();

const BASE_URL = "https://example.org";
const PARSED_URL = Services.io.newURI(BASE_URL);

add_task(async function testInstallAndUninstallMetric() {
  Services.fog.testResetFOG();
  let snapshot;

  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);

  snapshot = Glean.webApp.install.testGetValue();
  is(snapshot.length, 1, "Should have recorded an 'install' event");

  gRegistry.removeTaskbarTab(taskbarTab.id);
  snapshot = Glean.webApp.uninstall.testGetValue();
  is(snapshot.length, 1, "Should have recorded an 'uninstall' event");
});

async function testPinMetricCustom(aPinResult, aPinMessage = null) {
  let snapshot;

  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);
  Services.fog.testResetFOG();

  gShortcutPinResult = aPinResult;

  await TaskbarTabsPin.pinTaskbarTab(
    taskbarTab,
    gRegistry,
    await TaskbarTabsUtils.getDefaultIcon()
  );

  snapshot = Glean.webApp.pin.testGetValue();
  is(snapshot.length, 1, "A single pin event was recorded");
  Assert.strictEqual(
    snapshot[0].extra.result,
    aPinMessage ?? aPinResult ?? "Success",
    `Should record the pin ${aPinResult ? "exception" : "success"}`
  );

  gRegistry.removeTaskbarTab(taskbarTab.id);
}

add_task(async function testPinMetricSuccess() {
  await testPinMetricCustom(null);
});

add_task(async function testPinMetricFail() {
  await testPinMetricCustom("Pin fail!");
});

add_task(async function testPinMetricInvalid() {
  await testPinMetricCustom(undefined, "Unknown exception");
});

async function testUnpinMetricCustom(
  aUnpinResult,
  aDeleteResult,
  aUnpinMessage = null,
  aDeleteMessage = null
) {
  let snapshot;

  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);
  Services.fog.testResetFOG();

  gShortcutPinResult = aUnpinResult;
  gShortcutDeleteResult = aDeleteResult;

  // We've mocked out so much that calling pinTaskbarTab should be irrelevant.

  await TaskbarTabsPin.unpinTaskbarTab(taskbarTab, gRegistry);
  snapshot = Glean.webApp.unpin.testGetValue();
  is(snapshot.length, 1, "A single unpin event was recorded");
  Assert.strictEqual(
    snapshot[0].extra.result,
    aUnpinMessage ?? aUnpinResult ?? "Success",
    `Should record the unpin ${aUnpinResult ? "exception" : "success"}`
  );
  Assert.strictEqual(
    snapshot[0].extra.removal_result,
    aDeleteMessage ?? aDeleteResult ?? "Success",
    `Should record the deletion ${aDeleteResult ? "exception" : "success"}`
  );

  gRegistry.removeTaskbarTab(taskbarTab.id);
}

add_task(async function testPinAndUnpinMetric_UnpinSuccessDeleteSuccess() {
  await testUnpinMetricCustom(null, null);
});

add_task(async function testPinAndUnpinMetric_UnpinFailDeleteSuccess() {
  await testUnpinMetricCustom("Unpin fail!", null);
});

add_task(async function testPinAndUnpinMetric_UnpinSuccessDeleteFail() {
  await testUnpinMetricCustom(null, "Deletion fail!");
});

add_task(async function testPinAndUnpinMetric_UnpinSuccessDeleteFail() {
  await testUnpinMetricCustom("Unpin fail!", "Deletion fail!");
});

add_task(async function testPinAndUnpinMetric_UnpinInvalid() {
  await testUnpinMetricCustom(undefined, null, "Unknown exception", null);
});

add_task(async function testPinAndUnpinMetric_DeleteInvalid() {
  await testUnpinMetricCustom(null, undefined, null, "Unknown exception");
});

add_task(async function testActivateWhenWindowOpened() {
  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);
  Services.fog.testResetFOG();

  const win1 = await gWindowManager.openWindow(taskbarTab);
  const win2 = await gWindowManager.openWindow(taskbarTab);

  const snapshot = Glean.webApp.activate.testGetValue();
  is(snapshot.length, 2, "Should record an activate event each time");

  await Promise.all([
    BrowserTestUtils.closeWindow(win1),
    BrowserTestUtils.closeWindow(win2),
  ]);

  gRegistry.removeTaskbarTab(taskbarTab.id);
});

add_task(async function testMoveToTaskbarLowLevelMetric() {
  Services.fog.testResetFOG();
  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);
  is(
    Glean.webApp.moveToTaskbar.testGetValue(),
    null,
    "Should start with no events"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    BASE_URL,
    false,
    true
  );
  const win = await gWindowManager.replaceTabWithWindow(taskbarTab, tab);

  const snapshot = Glean.webApp.moveToTaskbar.testGetValue();
  is(snapshot.length, 1, "Should have recorded an event on replacement");

  await BrowserTestUtils.closeWindow(win);
  gRegistry.removeTaskbarTab(taskbarTab.id);
});

add_task(async function testMoveToTaskbarHighLevelMetric() {
  // moveTabIntoTaskbarTab is implemented in the TaskbarTabs module itself, so
  // we need to stub out system interaction.
  const sandbox = sinon.createSandbox();
  sandbox.stub(TaskbarTabsPin, "pinTaskbarTab");
  sandbox.stub(TaskbarTabsPin, "unpinTaskbarTab");
  const { TaskbarTabs } = ChromeUtils.importESModule(
    "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs"
  );

  Services.fog.testResetFOG();
  is(
    Glean.webApp.moveToTaskbar.testGetValue(),
    null,
    "Should start with no events"
  );

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, BASE_URL);
  let win = (await TaskbarTabs.moveTabIntoTaskbarTab(tab)).window;

  let snapshot = Glean.webApp.moveToTaskbar.testGetValue();
  is(snapshot.length, 1, "Should have recorded an event on replacement");
  await BrowserTestUtils.closeWindow(win);

  // Do it a second time to make sure it isn't connected to creation.
  tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, BASE_URL);
  win = (await TaskbarTabs.moveTabIntoTaskbarTab(tab)).window;

  snapshot = Glean.webApp.moveToTaskbar.testGetValue();
  is(snapshot.length, 2, "Should have recorded an event on replacement");
  await BrowserTestUtils.closeWindow(win);

  await TaskbarTabs.resetForTests();
  sandbox.restore();
});

add_task(async function testEjectMetric() {
  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);
  Services.fog.testResetFOG();

  const win = await gWindowManager.openWindow(taskbarTab);

  is(Glean.webApp.eject.testGetValue(), null, "Should start with no events");

  await gWindowManager.ejectWindow(win);

  const snapshot = Glean.webApp.eject.testGetValue();
  is(snapshot.length, 1, "Should have recorded an event on ejection");

  const ejected = gBrowser.tabs[gBrowser.tabs.length - 1];
  const promise = BrowserTestUtils.waitForTabClosing(ejected);
  gBrowser.removeTab(ejected);
  await promise;

  gRegistry.removeTaskbarTab(taskbarTab.id);
});

add_task(async function testUsageTimeMetricSingleWindow() {
  const taskbarTab = createTaskbarTab(gRegistry, PARSED_URL, 0);
  Services.fog.testResetFOG();

  const win = await gWindowManager.openWindow(taskbarTab);
  let promise;

  // Take focus away from that window.
  promise = BrowserTestUtils.waitForEvent(window, "focus");
  window.focus();
  await promise;

  // ...and give it back.
  promise = BrowserTestUtils.waitForEvent(win, "focus");
  win.focus();
  await promise;

  // now close it.
  await BrowserTestUtils.closeWindow(win);
  window.focus(); // for good measure

  const snapshot = Glean.webApp.usageTime.testGetValue();
  is(snapshot.count, 2, "Two separate intervals should be made");
  Assert.greater(snapshot.sum, 0, "Measured time should be nonzero");

  gRegistry.removeTaskbarTab(taskbarTab.id);
});
