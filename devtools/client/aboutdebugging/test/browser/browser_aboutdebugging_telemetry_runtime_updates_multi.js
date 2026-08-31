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
 * Test runtime update events when a device is connected/disconnected with multiple
 * runtimes available on the same device.
 */
add_task(async function () {
  // enable USB devices mocks
  const mocks = new Mocks();
  Services.fog.testResetFOG();

  const { tab, document } = await openAboutDebugging();

  const sessionId =
    Glean.devtoolsMain.openAdbgAboutdebugging.testGetValue()[0].extra
      .session_id;
  ok(!isNaN(sessionId), "Open event has a valid session id");

  info("Add two runtimes on the same device at the same time");
  mocks.createUSBRuntime(USB_RUNTIME_1.id, {
    deviceName: USB_RUNTIME_1.deviceName,
    name: USB_RUNTIME_1.name,
    shortName: USB_RUNTIME_1.shortName,
  });
  mocks.createUSBRuntime(USB_RUNTIME_2.id, {
    deviceName: USB_RUNTIME_2.deviceName,
    name: USB_RUNTIME_2.name,
    shortName: USB_RUNTIME_2.shortName,
  });
  mocks.emitUSBUpdate();
  await waitUntil(() =>
    findSidebarItemByText(USB_RUNTIME_1.shortName, document)
  );
  await waitUntil(() =>
    findSidebarItemByText(USB_RUNTIME_2.shortName, document)
  );

  const daEvents = Glean.devtoolsMain.deviceAddedAboutdebugging.testGetValue();
  Assert.equal(1, daEvents.length);
  assertExtras(
    { ...DEVICE_A_EXTRAS, session_id: sessionId },
    daEvents[0].extra
  );
  const raEvents = Glean.devtoolsMain.runtimeAddedAboutdebugging.testGetValue();
  Assert.equal(2, raEvents.length);
  assertExtras(
    { ...RUNTIME_1_EXTRAS, session_id: sessionId },
    raEvents[0].extra
  );
  assertExtras(
    { ...RUNTIME_2_EXTRAS, session_id: sessionId },
    raEvents[1].extra
  );

  info("Remove both runtimes at once to simulate a device disconnection");
  mocks.removeRuntime(USB_RUNTIME_1.id);
  mocks.removeRuntime(USB_RUNTIME_2.id);
  mocks.emitUSBUpdate();
  await waitUntil(
    () =>
      !findSidebarItemByText(USB_RUNTIME_1.name, document) &&
      !findSidebarItemByText(USB_RUNTIME_1.shortName, document)
  );
  await waitUntil(
    () =>
      !findSidebarItemByText(USB_RUNTIME_2.name, document) &&
      !findSidebarItemByText(USB_RUNTIME_2.shortName, document)
  );

  const rrEvents =
    Glean.devtoolsMain.runtimeRemovedAboutdebugging.testGetValue();
  Assert.equal(2, rrEvents.length);
  assertExtras(
    { ...RUNTIME_1_EXTRAS, session_id: sessionId },
    rrEvents[0].extra
  );
  assertExtras(
    { ...RUNTIME_2_EXTRAS, session_id: sessionId },
    rrEvents[1].extra
  );
  const drEvents =
    Glean.devtoolsMain.deviceRemovedAboutdebugging.testGetValue();
  Assert.equal(1, drEvents.length);
  assertExtras(
    { ...DEVICE_A_EXTRAS, session_id: sessionId },
    drEvents[0].extra
  );

  await removeTab(tab);
});
