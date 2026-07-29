/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const USB_RUNTIME = {
  id: "runtime-id-1",
  deviceName: "Device A",
  name: "Runtime 1",
  shortName: "R1",
};

/**
 * Check that telemetry events for connection attempts are correctly recorded in various
 * scenarios:
 * - successful connection
 * - successful connection after showing the timeout warning
 * - failed connection
 * - connection timeout
 */
add_task(async function testSuccessfulConnectionAttempt() {
  const { doc, mocks, runtimeId, sessionId, tab } =
    await setupConnectionAttemptTest();

  await connectToRuntime(USB_RUNTIME.deviceName, doc);

  const rcEvents =
    Glean.devtoolsMain.runtimeConnectedAboutdebugging.testGetValue();
  Assert.equal(1, rcEvents.length);
  Assert.equal(runtimeId, rcEvents[0].extra.runtime_id);
  Assert.equal(sessionId, rcEvents[0].extra.session_id);
  const conEvents =
    Glean.devtoolsMain.connectionAttemptAboutdebugging.testGetValue();
  Assert.equal(2, conEvents.length);
  conEvents.forEach(ev => {
    Assert.equal(ev.extra.runtime_id, runtimeId);
    Assert.equal(ev.extra.connection_id, conEvents[0].extra.connection_id);
    Assert.equal(ev.extra.connection_type, "usb");
    Assert.equal(ev.extra.session_id, sessionId);
  });
  Assert.equal("start", conEvents[0].extra.status);
  Assert.equal("success", conEvents[1].extra.status);
  const selEvents = Glean.devtoolsMain.selectPageAboutdebugging.testGetValue();
  Assert.deepEqual(1, selEvents.length);
  Assert.deepEqual(
    { page_type: "runtime", session_id: sessionId },
    selEvents[0].extra
  );

  await removeUsbRuntime(USB_RUNTIME, mocks, doc);
  await removeTab(tab);
});

add_task(async function testFailedConnectionAttempt() {
  const { doc, mocks, runtimeId, sessionId, tab } =
    await setupConnectionAttemptTest();
  mocks.runtimeClientFactoryMock.createClientForRuntime = async () => {
    throw new Error("failed");
  };

  info(
    "Try to connect to the runtime and wait for the connection error message"
  );
  const usbRuntimeSidebarItem = findSidebarItemByText(
    USB_RUNTIME.deviceName,
    doc
  );
  const connectButton =
    usbRuntimeSidebarItem.querySelector(".qa-connect-button");
  connectButton.click();
  await waitUntil(() =>
    usbRuntimeSidebarItem.querySelector(".qa-connection-error")
  );

  const conEvents =
    Glean.devtoolsMain.connectionAttemptAboutdebugging.testGetValue();
  Assert.equal(2, conEvents.length);
  conEvents.forEach(ev => {
    Assert.equal(ev.extra.runtime_id, runtimeId);
    Assert.equal(ev.extra.connection_id, conEvents[0].extra.connection_id);
    Assert.equal(ev.extra.connection_type, "usb");
    Assert.equal(ev.extra.session_id, sessionId);
  });
  Assert.equal("start", conEvents[0].extra.status);
  Assert.equal("failed", conEvents[1].extra.status);

  await removeUsbRuntime(USB_RUNTIME, mocks, doc);
  await removeTab(tab);
});

add_task(async function testPendingConnectionAttempt() {
  info("Set timeout preferences to avoid cancelling the connection");
  await pushPref(
    "devtools.aboutdebugging.test-connection-timing-out-delay",
    100
  );
  await pushPref(
    "devtools.aboutdebugging.test-connection-cancel-delay",
    100000
  );

  const { doc, mocks, runtimeId, sessionId, tab } =
    await setupConnectionAttemptTest();

  info("Simulate a pending connection");
  let resumeConnection;
  const resumeConnectionPromise = new Promise(r => {
    resumeConnection = r;
  });
  mocks.runtimeClientFactoryMock.createClientForRuntime = async runtime => {
    await resumeConnectionPromise;
    return mocks._clients[runtime.type][runtime.id];
  };

  info("Click on the connect button and wait for the warning message");
  const usbRuntimeSidebarItem = findSidebarItemByText(
    USB_RUNTIME.deviceName,
    doc
  );
  const connectButton =
    usbRuntimeSidebarItem.querySelector(".qa-connect-button");
  connectButton.click();
  await waitUntil(() => doc.querySelector(".qa-connection-not-responding"));

  info("Resume the connection and wait for the connection to succeed");
  resumeConnection();
  await waitUntil(
    () => !usbRuntimeSidebarItem.querySelector(".qa-connect-button")
  );

  const rcEvents =
    Glean.devtoolsMain.runtimeConnectedAboutdebugging.testGetValue();
  Assert.equal(1, rcEvents.length);
  Assert.equal(runtimeId, rcEvents[0].extra.runtime_id);
  Assert.equal(sessionId, rcEvents[0].extra.session_id);
  const conEvents =
    Glean.devtoolsMain.connectionAttemptAboutdebugging.testGetValue();
  Assert.equal(3, conEvents.length);
  conEvents.forEach(ev => {
    Assert.equal(ev.extra.runtime_id, runtimeId);
    Assert.equal(ev.extra.connection_id, conEvents[0].extra.connection_id);
    Assert.equal(ev.extra.connection_type, "usb");
    Assert.equal(ev.extra.session_id, sessionId);
  });
  Assert.equal("start", conEvents[0].extra.status);
  Assert.equal("not responding", conEvents[1].extra.status);
  Assert.equal("success", conEvents[2].extra.status);
  const selEvents = Glean.devtoolsMain.selectPageAboutdebugging.testGetValue();
  Assert.deepEqual(1, selEvents.length);
  Assert.deepEqual(
    { page_type: "runtime", session_id: sessionId },
    selEvents[0].extra
  );

  await removeUsbRuntime(USB_RUNTIME, mocks, doc);
  await removeTab(tab);
});

add_task(async function testCancelledConnectionAttempt() {
  info("Set timeout preferences to quickly cancel the connection");
  await pushPref(
    "devtools.aboutdebugging.test-connection-timing-out-delay",
    100
  );
  await pushPref("devtools.aboutdebugging.test-connection-cancel-delay", 1000);

  const { doc, mocks, runtimeId, sessionId, tab } =
    await setupConnectionAttemptTest();

  info("Simulate a connection timeout");
  mocks.runtimeClientFactoryMock.createClientForRuntime = async () => {
    await new Promise(() => {});
  };

  info("Click on the connect button and wait for the error message");
  const usbRuntimeSidebarItem = findSidebarItemByText(
    USB_RUNTIME.deviceName,
    doc
  );
  const connectButton =
    usbRuntimeSidebarItem.querySelector(".qa-connect-button");
  connectButton.click();
  await waitUntil(() =>
    usbRuntimeSidebarItem.querySelector(".qa-connection-timeout")
  );

  const conEvents =
    Glean.devtoolsMain.connectionAttemptAboutdebugging.testGetValue();
  Assert.equal(3, conEvents.length);
  conEvents.forEach(ev => {
    Assert.equal(ev.extra.runtime_id, runtimeId);
    Assert.equal(ev.extra.connection_id, conEvents[0].extra.connection_id);
    Assert.equal(ev.extra.connection_type, "usb");
    Assert.equal(ev.extra.session_id, sessionId);
  });
  Assert.equal("start", conEvents[0].extra.status);
  Assert.equal("not responding", conEvents[1].extra.status);
  Assert.equal("cancelled", conEvents[2].extra.status);

  await removeUsbRuntime(USB_RUNTIME, mocks, doc);
  await removeTab(tab);
});

// Open about:debugging, setup telemetry, mocks and create a mocked USB runtime.
async function setupConnectionAttemptTest() {
  const mocks = new Mocks();
  Services.fog.testResetFOG();

  const { tab, document } = await openAboutDebugging();

  const sessionId =
    Glean.devtoolsMain.openAdbgAboutdebugging.testGetValue()[0].extra
      .session_id;
  ok(!isNaN(sessionId), "Open event has a valid session id");

  mocks.createUSBRuntime(USB_RUNTIME.id, {
    deviceName: USB_RUNTIME.deviceName,
    name: USB_RUNTIME.name,
    shortName: USB_RUNTIME.shortName,
  });
  mocks.emitUSBUpdate();

  info("Wait for the runtime to appear in the sidebar");
  await waitUntil(() => findSidebarItemByText(USB_RUNTIME.shortName, document));
  const deviceEvents =
    Glean.devtoolsMain.deviceAddedAboutdebugging.testGetValue();
  Assert.equal(deviceEvents.length, 1);
  Assert.equal(sessionId, deviceEvents[0].extra.session_id);
  const rtEvents = Glean.devtoolsMain.runtimeAddedAboutdebugging.testGetValue();
  Assert.equal(rtEvents.length, 1);
  Assert.equal(sessionId, rtEvents[0].extra.session_id);

  Services.fog.testResetFOG();

  const runtimeId = rtEvents[0].extra.runtime_id;
  return { doc: document, mocks, runtimeId, sessionId, tab };
}

async function removeUsbRuntime(runtime, mocks, doc) {
  mocks.removeRuntime(runtime.id);
  mocks.emitUSBUpdate();
  await waitUntil(
    () =>
      !findSidebarItemByText(runtime.name, doc) &&
      !findSidebarItemByText(runtime.shortName, doc)
  );
}
