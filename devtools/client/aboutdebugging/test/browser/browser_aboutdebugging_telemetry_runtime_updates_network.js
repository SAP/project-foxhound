/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const NETWORK_RUNTIME = {
  host: "localhost:1234",
  // No device name for network runtimes.
  name: "Local Network Runtime",
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
 * Test runtime update events for network runtimes.
 */
add_task(async function testNetworkRuntimeUpdates() {
  // enable USB devices mocks
  const mocks = new Mocks();
  Services.fog.testResetFOG();

  const { tab, document } = await openAboutDebugging();

  const sessionId =
    Glean.devtoolsMain.openAdbgAboutdebugging.testGetValue()[0].extra
      .session_id;
  ok(!isNaN(sessionId), "Open event has a valid session id");

  info("Add a network runtime");
  await addNetworkRuntime(NETWORK_RUNTIME, mocks, document);

  // Before the connection, we don't have any information about the runtime.
  // Device information is also not available to network runtimes.
  const networkRuntimeExtras = {
    connection_type: "network",
    device_name: "",
    runtime_name: "",
  };

  // Once connected we should be able to log a valid runtime name.
  const connectedNetworkRuntimeExtras = Object.assign(
    {},
    networkRuntimeExtras,
    {
      runtime_name: NETWORK_RUNTIME.name,
    }
  );

  // For network runtimes, we don't have any device information, so we shouldn't have any
  // device_added event.
  const raEvents = Glean.devtoolsMain.runtimeAddedAboutdebugging.testGetValue();
  Assert.equal(1, raEvents.length);
  assertExtras(
    { ...networkRuntimeExtras, session_id: sessionId },
    raEvents[0].extra
  );
  Services.fog.testResetFOG();

  await connectToRuntime(NETWORK_RUNTIME.host, document);
  const rcEvents =
    Glean.devtoolsMain.runtimeConnectedAboutdebugging.testGetValue();
  Assert.equal(1, rcEvents.length);
  assertExtras(
    { ...connectedNetworkRuntimeExtras, session_id: sessionId },
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

  info("Remove network runtime");
  mocks.removeRuntime(NETWORK_RUNTIME.host);
  await waitUntil(() => !findSidebarItemByText(NETWORK_RUNTIME.host, document));
  // Similarly we should not have any device removed event.
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
    { ...connectedNetworkRuntimeExtras, session_id: sessionId },
    rdEvents[0].extra
  );
  const rrEvents =
    Glean.devtoolsMain.runtimeRemovedAboutdebugging.testGetValue();
  Assert.equal(1, rrEvents.length);
  assertExtras(
    { ...networkRuntimeExtras, session_id: sessionId },
    rrEvents[0].extra
  );

  await removeTab(tab);
});

async function addNetworkRuntime(runtime, mocks, doc) {
  mocks.createNetworkRuntime(runtime.host, {
    name: runtime.name,
  });

  info("Wait for the Network Runtime to appear in the sidebar");
  await waitUntil(() => findSidebarItemByText(runtime.host, doc));
}
