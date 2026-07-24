const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);
const { UptakeTelemetry } = ChromeUtils.importESModule(
  "resource://services-common/uptake-telemetry.sys.mjs"
);

const COMPONENT = "remotesettings";
const GLEAN_COMPONENT = "Remotesettings";

add_task(async function test_unknown_status_is_not_reported() {
  const source = "update-source";
  const startSnapshot = getUptakeTelemetrySnapshot(COMPONENT, source);

  try {
    await UptakeTelemetry.report(GLEAN_COMPONENT, "unknown-status", { source });
  } catch (e) {}

  const endSnapshot = getUptakeTelemetrySnapshot(COMPONENT, source);
  Assert.deepEqual(startSnapshot, endSnapshot);
});

add_task(async function test_age_is_converted_to_string_and_reported() {
  const status = UptakeTelemetry.STATUS.SUCCESS;
  const age = 42;

  await UptakeTelemetry.report(GLEAN_COMPONENT, status, { source: "s", age });

  TelemetryTestUtils.assertEvents([
    [
      "uptake.remotecontent.result",
      "uptake",
      COMPONENT,
      status,
      { source: "s", age: `${age}` },
    ],
  ]);
});

add_task(async function test_each_status_can_be_caught_in_snapshot() {
  const source = "some-source";
  const startSnapshot = getUptakeTelemetrySnapshot(COMPONENT, source);

  const expectedIncrements = {};
  for (const status of Object.values(UptakeTelemetry.STATUS)) {
    expectedIncrements[status] = 1;
    await UptakeTelemetry.report(GLEAN_COMPONENT, status, { source });
  }

  const endSnapshot = getUptakeTelemetrySnapshot(COMPONENT, source);
  checkUptakeTelemetry(startSnapshot, endSnapshot, expectedIncrements);
});
