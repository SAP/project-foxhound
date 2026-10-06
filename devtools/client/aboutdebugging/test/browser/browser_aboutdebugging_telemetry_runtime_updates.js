/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const DEVICE_A = "Device A";
const USB_RUNTIME_1 = {
  id: "runtime-id-1",
  deviceName: DEVICE_A,
  name: "Runtime 1",
  shortName: "R1",
};

const USB_RUNTIME_2 = {
  id: "runtime-id-2",
  deviceName: DEVICE_A,
  name: "Runtime 2",
  shortName: "R2",
};

const DEVICE_A_EXTRAS = {
  connection_type: "usb",
  device_name: DEVICE_A,
};

const RUNTIME_1_EXTRAS = {
  connection_type: "usb",
  device_name: USB_RUNTIME_1.deviceName,
  runtime_name: USB_RUNTIME_1.shortName,
};

const RUNTIME_2_EXTRAS = {
  connection_type: "usb",
  device_name: USB_RUNTIME_2.deviceName,
  runtime_name: USB_RUNTIME_2.shortName,
};

/**
 * Assert that the expected keys are present in actual and have the same value.
 */
function assertExtras(expected, actual) {
  for (const [k, v] of Object.entries(expected)) {
    Assert.equal(v, actual[k], `Key ${k} matches.`);
  }
}

/**
 * Check that telemetry events are recorded for USB runtimes when:
 * - adding a device/runtime
 * - removing a device/runtime
 * - connecting to a runtime
 */
add_task(async function testUsbRuntimeUpdates() {
  // enable USB devices mocks
  const mocks = new Mocks();
  Services.fog.testResetFOG();

  const { tab, document } = await openAboutDebugging();

  const sessionId =
    Glean.devtoolsMain.openAdbgAboutdebugging.testGetValue()[0].extra
      .session_id;
  ok(!isNaN(sessionId), "Open event has a valid session id");

  await addUsbRuntime(USB_RUNTIME_1, mocks, document);

  const devEvents = Glean.devtoolsMain.deviceAddedAboutdebugging.testGetValue();
  Assert.equal(1, devEvents.length);
  assertExtras(
    { ...DEVICE_A_EXTRAS, session_id: sessionId },
    devEvents[0].extra
  );
  const r1Events = Glean.devtoolsMain.runtimeAddedAboutdebugging.testGetValue();
  Assert.equal(1, r1Events.length);
  assertExtras(
    { ...RUNTIME_1_EXTRAS, session_id: sessionId },
    r1Events[0].extra
  );
  Services.fog.testResetFOG();

  // Now that a first telemetry event has been logged for RUNTIME_1, retrieve the id
  // generated for telemetry, and check that we keep logging the same id for all events
  // related to runtime 1.
  const runtime1Id = r1Events[0].extra.runtime_id;
  const runtime1Extras = Object.assign({}, RUNTIME_1_EXTRAS, {
    runtime_id: runtime1Id,
  });
  // Same as runtime1Extras, but the runtime name should be the complete one.
  const runtime1ConnectedExtras = Object.assign({}, runtime1Extras, {
    runtime_name: USB_RUNTIME_1.name,
  });

  await connectToRuntime(USB_RUNTIME_1.deviceName, document);

  const rcEvents =
    Glean.devtoolsMain.runtimeConnectedAboutdebugging.testGetValue();
  Assert.equal(1, rcEvents.length);
  assertExtras(
    { ...runtime1ConnectedExtras, session_id: sessionId },
    rcEvents[0].extra
  );
  const caEvents =
    Glean.devtoolsMain.connectionAttemptAboutdebugging.testGetValue();
  Assert.equal(2, caEvents.length);
  assertExtras({ status: "start", session_id: sessionId }, caEvents[0].extra);
  assertExtras({ status: "success", session_id: sessionId }, caEvents[1].extra);
  let spEvents = Glean.devtoolsMain.selectPageAboutdebugging.testGetValue();
  Assert.equal(1, spEvents.length);
  assertExtras(
    { page_type: "runtime", session_id: sessionId },
    spEvents[0].extra
  );
  Services.fog.testResetFOG();

  info("Add a second runtime");
  await addUsbRuntime(USB_RUNTIME_2, mocks, document);
  const r2Events = Glean.devtoolsMain.runtimeAddedAboutdebugging.testGetValue();
  Assert.equal(1, r2Events.length);
  assertExtras(
    { ...RUNTIME_2_EXTRAS, session_id: sessionId },
    r2Events[0].extra
  );
  Services.fog.testResetFOG();

  // Similar to what we did for RUNTIME_1, we want to check we reuse the same telemetry id
  // for all the events related to RUNTIME_2.
  const runtime2Id = r2Events[0].extra.runtime_id;
  const runtime2Extras = Object.assign({}, RUNTIME_2_EXTRAS, {
    runtime_id: runtime2Id,
  });

  info("Remove runtime 1");
  await removeUsbRuntime(USB_RUNTIME_1, mocks, document);

  spEvents = Glean.devtoolsMain.selectPageAboutdebugging.testGetValue();
  Assert.equal(1, spEvents.length);
  assertExtras(
    { page_type: "runtime", session_id: sessionId },
    spEvents[0].extra
  );
  const rdEvents =
    Glean.devtoolsMain.runtimeDisconnectedAboutdebugging.testGetValue();
  Assert.equal(1, rdEvents.length);
  assertExtras(
    { ...runtime1ConnectedExtras, session_id: sessionId },
    rdEvents[0].extra
  );
  let rrEvents = Glean.devtoolsMain.runtimeRemovedAboutdebugging.testGetValue();
  Assert.equal(1, rrEvents.length);
  assertExtras({ ...runtime1Extras, session_id: sessionId }, rrEvents[0].extra);
  Services.fog.testResetFOG();

  info("Remove runtime 2");
  await removeUsbRuntime(USB_RUNTIME_2, mocks, document);

  rrEvents = Glean.devtoolsMain.runtimeRemovedAboutdebugging.testGetValue();
  Assert.equal(1, rrEvents.length);
  assertExtras({ ...runtime2Extras, session_id: sessionId }, rrEvents[0].extra);
  const drEvents =
    Glean.devtoolsMain.deviceRemovedAboutdebugging.testGetValue();
  Assert.equal(1, drEvents.length);
  assertExtras(
    { ...DEVICE_A_EXTRAS, session_id: sessionId },
    drEvents[0].extra
  );

  await removeTab(tab);
});

async function addUsbRuntime(runtime, mocks, doc) {
  mocks.createUSBRuntime(runtime.id, {
    deviceName: runtime.deviceName,
    name: runtime.name,
    shortName: runtime.shortName,
  });
  mocks.emitUSBUpdate();

  info("Wait for the runtime to appear in the sidebar");
  await waitUntil(() => findSidebarItemByText(runtime.shortName, doc));
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
