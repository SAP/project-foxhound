/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const RUNTIME_ID = "test-runtime-id";
const RUNTIME_NAME = "Test Runtime";
const RUNTIME_DEVICE_NAME = "Test Device";

/**
 * Test that runtime specific actions are logged as telemetry events with the expected
 * runtime id and action type.
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

  const usbClient = mocks.createUSBRuntime(RUNTIME_ID, {
    deviceName: RUNTIME_DEVICE_NAME,
    name: RUNTIME_NAME,
    shortName: RUNTIME_NAME,
  });
  mocks.emitUSBUpdate();

  info("Wait for the runtime to appear in the sidebar");
  await waitUntil(() => findSidebarItemByText(RUNTIME_NAME, document));
  await connectToRuntime(RUNTIME_DEVICE_NAME, document);
  await waitForRuntimePage(RUNTIME_NAME, document);

  info("Read telemetry events to flush unrelated events");
  const telemetryRuntimeId =
    Glean.devtoolsMain.runtimeAddedAboutdebugging.testGetValue()[0].extra
      .runtime_id;
  Services.fog.testResetFOG();

  info("Click on the toggle button and wait until the text is updated");
  const promptButton = document.querySelector(
    ".qa-connection-prompt-toggle-button"
  );
  promptButton.click();
  await waitUntil(() => promptButton.textContent.includes("Enable"));

  let upEvents =
    Glean.devtoolsMain.updateConnPromptAboutdebugging.testGetValue();
  Assert.equal(1, upEvents.length);
  Assert.equal("false", upEvents[0].extra.prompt_enabled);
  Assert.equal(telemetryRuntimeId, upEvents[0].extra.runtime_id);
  Assert.equal(sessionId, upEvents[0].extra.session_id);
  Services.fog.testResetFOG();

  info("Click on the toggle button again and check we log the correct value");
  promptButton.click();
  await waitUntil(() => promptButton.textContent.includes("Disable"));

  upEvents = Glean.devtoolsMain.updateConnPromptAboutdebugging.testGetValue();
  Assert.equal(1, upEvents.length);
  Assert.equal("true", upEvents[0].extra.prompt_enabled);
  Assert.equal(telemetryRuntimeId, upEvents[0].extra.runtime_id);
  Assert.equal(sessionId, upEvents[0].extra.session_id);
  Services.fog.testResetFOG();

  info("Open the profiler dialog");
  await openProfilerDialog(usbClient, document);

  const proEvents =
    Glean.devtoolsMain.showProfilerAboutdebugging.testGetValue();
  Assert.equal(1, proEvents.length);
  Assert.equal(telemetryRuntimeId, proEvents[0].extra.runtime_id);
  Assert.equal(sessionId, proEvents[0].extra.session_id);

  info("Remove runtime");
  mocks.removeRuntime(RUNTIME_ID);
  mocks.emitUSBUpdate();
  await waitUntil(() => !findSidebarItemByText(RUNTIME_NAME, document));

  await removeTab(tab);
});
