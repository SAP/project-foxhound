/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const { PrivateAttributionService } = ChromeUtils.importESModule(
  "resource://gre/modules/PrivateAttributionService.sys.mjs"
);

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const BinaryInputStream = Components.Constructor(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream"
);

const BinaryOutputStream = Components.Constructor(
  "@mozilla.org/binaryoutputstream;1",
  "nsIBinaryOutputStream",
  "setOutputStream"
);

const PREF_LEADER = "toolkit.telemetry.dap_leader";
const PREF_HELPER = "toolkit.telemetry.dap_helper";
const TASK_ID = "DSZGMFh26hBYXNaKvhL_N4AHA3P5lDn19on1vFPBxJM";
const MAX_CONVERSIONS = 2;
const DAY_IN_MILLI = 1000 * 60 * 60 * 24;
const LOOKBACK_DAYS = 1;
const HISTOGRAM_SIZE = 5;

class MockDateProvider {
  constructor() {
    this._now = Date.now();
  }

  now() {
    return this._now;
  }

  add(interval_ms) {
    this._now += interval_ms;
  }
}

class MockDAPTelemetrySender {
  constructor() {
    this.receivedMeasurements = [];
  }

  async sendDAPMeasurement(task, measurement, timeout, reason) {
    this.receivedMeasurements.push({
      task,
      measurement,
      timeout,
      reason,
    });
  }
}

class MockServer {
  constructor() {
    this.receivedReports = [];

    const server = new HttpServer();
    server.registerPathHandler(
      "/leader_endpoint/hpke_config",
      this.hpkeConfigHandler
    );
    server.registerPathHandler(
      "/helper_endpoint/hpke_config",
      this.hpkeConfigHandler
    );

    server.registerPrefixHandler(
      "/leader_endpoint/tasks/",
      this.uploadHandler.bind(this)
    );

    this._server = server;
  }

  start() {
    this._server.start(-1);

    this.orig_leader = Services.prefs.getStringPref(PREF_LEADER);
    this.orig_helper = Services.prefs.getStringPref(PREF_HELPER);

    const i = this._server.identity;
    const serverAddr =
      i.primaryScheme + "://" + i.primaryHost + ":" + i.primaryPort;
    Services.prefs.setStringPref(PREF_LEADER, serverAddr + "/leader_endpoint");
    Services.prefs.setStringPref(PREF_HELPER, serverAddr + "/helper_endpoint");
  }

  async stop() {
    Services.prefs.setStringPref(PREF_LEADER, this.orig_leader);
    Services.prefs.setStringPref(PREF_HELPER, this.orig_helper);

    await this._server.stop();
  }

  hpkeConfigHandler(request, response) {
    let config_bytes;
    if (request.path.startsWith("/leader")) {
      config_bytes = new Uint8Array([
        0, 41, 47, 0, 32, 0, 1, 0, 1, 0, 32, 11, 33, 206, 33, 131, 56, 220, 82,
        153, 110, 228, 200, 53, 98, 210, 38, 177, 197, 252, 198, 36, 201, 86,
        121, 169, 238, 220, 34, 143, 112, 177, 10,
      ]);
    } else {
      config_bytes = new Uint8Array([
        0, 41, 42, 0, 32, 0, 1, 0, 1, 0, 32, 28, 62, 242, 195, 117, 7, 173, 149,
        250, 15, 139, 178, 86, 241, 117, 143, 75, 26, 57, 60, 88, 130, 199, 175,
        195, 9, 241, 130, 61, 47, 215, 101,
      ]);
    }
    response.setHeader("Content-Type", "application/dap-hpke-config");
    let bos = new BinaryOutputStream(response.bodyOutputStream);
    bos.writeByteArray(config_bytes);
  }

  uploadHandler(request, response) {
    let body = new BinaryInputStream(request.bodyInputStream);

    this.receivedReports.push({
      contentType: request.getHeader("Content-Type"),
      size: body.available(),
    });

    response.setStatusLine(request.httpVersion, 200);
  }
}

add_setup(async function () {
  do_get_profile();
  Services.fog.initializeFOG();
});

add_task(async function testIsEnabled() {
  Services.fog.testResetFOG();

  // isEnabled should match the telemetry preference without the test flag
  const ppa1 = new PrivateAttributionService();
  Assert.equal(
    ppa1.isEnabled(),
    AppConstants.MOZ_TELEMETRY_REPORTING &&
      Services.prefs.getBoolPref("datareporting.healthreport.uploadEnabled") &&
      Services.prefs.getBoolPref("dom.private-attribution.submission.enabled")
  );

  // Should always be enabled with the test flag
  const ppa2 = new PrivateAttributionService({ testForceEnabled: true });
  Assert.ok(ppa2.isEnabled());
});

add_task(async function testSuccessfulConversion() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost = "source.test";
  const targetHost = "target.test";
  const adIdentifier = "ad_identifier";
  const adIndex = 1;

  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex,
    adIdentifier,
    targetHost
  );

  await privateAttribution.onAttributionEvent(
    sourceHost,
    "click",
    adIndex,
    adIdentifier,
    targetHost
  );

  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  const expectedMeasurement = {
    task: { id: TASK_ID, time_precision: 60, measurement_type: "vecu8" },
    measurement: [0, 1, 0, 0, 0],
    timeout: 30000,
    reason: "conversion",
  };

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement, expectedMeasurement);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testImpressionsOnMultipleSites() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    dateProvider: mockDateProvider,
    testForceEnabled: true,
  });

  const sourceHost1 = "source-multiple-1.test";
  const adIndex1 = 1;

  const sourceHost2 = "source-multiple-2.test";
  const adIndex2 = 3;

  const targetHost = "target-multiple.test";
  const adIdentifier = "ad_identifier_multiple";

  // View at adIndex1 on sourceHost1 at t=0
  await privateAttribution.onAttributionEvent(
    sourceHost1,
    "view",
    adIndex1,
    adIdentifier,
    targetHost
  );

  // Click at adIndex2 on sourceHost2 at t=1
  mockDateProvider.add(1);
  await privateAttribution.onAttributionEvent(
    sourceHost2,
    "click",
    adIndex2,
    adIdentifier,
    targetHost
  );

  // Click at adIndex1 on sourceHost1 at t=2
  mockDateProvider.add(1);
  await privateAttribution.onAttributionEvent(
    sourceHost1,
    "click",
    adIndex1,
    adIdentifier,
    targetHost
  );

  // View at adIndex2 on sourceHost2 at t=3
  mockDateProvider.add(1);
  await privateAttribution.onAttributionEvent(
    sourceHost2,
    "view",
    adIndex2,
    adIdentifier,
    targetHost
  );

  // Conversion for "click" matches most recent click on sourceHost1
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "click",
    [adIdentifier],
    [sourceHost1, sourceHost2]
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 1, 0, 0, 0]);

  // Conversion for "view" matches most recent view on sourceHost2
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost1, sourceHost2]
  );

  receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 1, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testConversionWithoutImpression() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost = "source-no-impression.test";
  const targetHost = "target-no-impression.test";
  const adIdentifier = "ad_identifier_no_impression";

  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 0, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionByInteractionType() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost = "source-by-type.test";
  const targetHost = "target-by-type.test";
  const adIdentifier = "ad_identifier_by_type";

  const viewAdIndex = 2;
  const clickAdIndex = 3;

  // View at viewAdIndex
  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    viewAdIndex,
    adIdentifier,
    targetHost
  );

  // Click at clickAdIndex clobbers previous view at viewAdIndex
  await privateAttribution.onAttributionEvent(
    sourceHost,
    "click",
    clickAdIndex,
    adIdentifier,
    targetHost
  );

  // Conversion filtering for "view" matches the interaction at clickAdIndex
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 1, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionBySourceSite() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost1 = "source-by-site-1.test";
  const adIndex1 = 1;

  const sourceHost2 = "source-by-site-2.test";
  const adIndex2 = 4;

  const targetHost = "target-by-site.test";
  const adIdentifier = "ad_identifier_by_site";

  // Impression on sourceHost1 at adIndex1
  await privateAttribution.onAttributionEvent(
    sourceHost1,
    "view",
    adIndex1,
    adIdentifier,
    targetHost
  );

  // Impression for the same ad ID on sourceHost2 at adIndex2
  await privateAttribution.onAttributionEvent(
    sourceHost2,
    "view",
    adIndex2,
    adIdentifier,
    targetHost
  );

  // Conversion filtering for sourceHost1 matches impression at adIndex1
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost1]
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 1, 0, 0, 0]);

  // Conversion filtering for sourceHost2 matches impression at adIndex2
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost2]
  );

  receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 0, 1]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionByAdIdentifier() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost = "source-by-ad-id.test";
  const targetHost = "target-by-ad-id.test";

  const adIdentifier1 = "ad_identifier_1";
  const adIndex1 = 1;

  const adIdentifier2 = "ad_identifier_2";
  const adIndex2 = 2;

  // Impression for adIdentifier1 at adIndex1
  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex1,
    adIdentifier1,
    targetHost
  );

  // Impression for adIdentifier2 at adIndex2
  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex2,
    adIdentifier2,
    targetHost
  );

  // Conversion filtering for adIdentifier1 matches impression at adIndex1
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier1],
    [sourceHost]
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 1, 0, 0, 0]);

  // Conversion filtering for adIdentifier2 matches impression at adIndex2
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier2],
    [sourceHost]
  );

  receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 1, 0, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testExpiredImpressions() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    dateProvider: mockDateProvider,
    testForceEnabled: true,
  });

  const sourceHost = "source-expired.test";
  const targetHost = "target-expired.test";
  const adIdentifier = "ad_identifier_expired";
  const adIndex = 2;

  // Register impression
  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex,
    adIdentifier,
    targetHost
  );

  // Fast-forward time by LOOKBACK_DAYS days + 1 ms
  mockDateProvider.add(LOOKBACK_DAYS * DAY_IN_MILLI + 1);

  // Conversion doesn't match expired impression
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 0, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testConversionBudget() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost = "source-budget.test";
  const targetHost = "target-budget.test";
  const adIdentifier = "ad_identifier_budget";
  const adIndex = 3;

  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex,
    adIdentifier,
    targetHost
  );

  // Measurements uploaded for conversions up to MAX_CONVERSIONS
  for (let i = 0; i < MAX_CONVERSIONS; i++) {
    await privateAttribution.onAttributionConversion(
      targetHost,
      TASK_ID,
      HISTOGRAM_SIZE,
      LOOKBACK_DAYS,
      "view",
      [adIdentifier],
      [sourceHost]
    );

    const receivedMeasurement = mockSender.receivedMeasurements.pop();
    Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 1, 0]);
  }

  // Empty report uploaded on subsequent conversions
  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 0, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testHistogramSize() {
  Services.fog.testResetFOG();

  const mockSender = new MockDAPTelemetrySender();
  const privateAttribution = new PrivateAttributionService({
    dapTelemetrySender: mockSender,
    testForceEnabled: true,
  });

  const sourceHost = "source-histogram.test";
  const targetHost = "target-histogram.test";
  const adIdentifier = "ad_identifier_histogram";

  // Zero-based ad index is equal to histogram size, pushing the measurement out of the histogram's bounds
  const adIndex = HISTOGRAM_SIZE;

  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex,
    adIdentifier,
    targetHost
  );

  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, [0, 0, 0, 0, 0]);

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testTelemetry() {
  Services.fog.testResetFOG();

  // Omit mocking DAP telemetry sender in this test to defend against mock sender getting out of sync
  const mockServer = new MockServer();
  mockServer.start();

  const privateAttribution = new PrivateAttributionService({
    testForceEnabled: true,
  });

  const saveImpressionSuccessCount =
    Glean.privateAttribution.saveImpression.success.testGetValue() ?? 0;
  const saveImpressionFailureCount =
    Glean.privateAttribution.saveImpression.error.testGetValue() ?? 0;
  const measureConversionSuccessCount =
    Glean.privateAttribution.measureConversion.success.testGetValue() ?? 0;
  const measureConversionFailureCount =
    Glean.privateAttribution.measureConversion.error.testGetValue() ?? 0;

  const sourceHost = "source-telemetry.test";
  const targetHost = "target-telemetry.test";
  const adIdentifier = "ad_identifier_telemetry";
  const adIndex = 4;

  await privateAttribution.onAttributionEvent(
    sourceHost,
    "view",
    adIndex,
    adIdentifier,
    targetHost
  );

  Assert.equal(
    Glean.privateAttribution.saveImpression.last_view.testGetValue() ?? 0,
    saveImpressionSuccessCount + 1,
    "Successful saveImpression call for type==view"
  );

  await privateAttribution.onAttributionEvent(
    sourceHost,
    "click",
    adIndex,
    adIdentifier,
    targetHost
  );

  Assert.equal(
    Glean.privateAttribution.saveImpression.success.testGetValue() ?? 0,
    saveImpressionSuccessCount + 2,
    "Successful saveImpression calls."
  );
  Assert.equal(
    Glean.privateAttribution.saveImpression.error.testGetValue() ?? 0,
    saveImpressionFailureCount,
    "Failed saveImpression calls."
  );

  await privateAttribution.onAttributionConversion(
    targetHost,
    TASK_ID,
    HISTOGRAM_SIZE,
    LOOKBACK_DAYS,
    "view",
    [adIdentifier],
    [sourceHost]
  );

  Assert.equal(
    Glean.privateAttribution.measureConversion.last_view.testGetValue() ?? 0,
    measureConversionSuccessCount + 1,
    "Successful measureConversion call for type==view"
  );
  Assert.equal(
    Glean.privateAttribution.measureConversion.success.testGetValue() ?? 0,
    measureConversionSuccessCount + 1,
    "Successful measureConversion calls."
  );
  Assert.equal(
    Glean.privateAttribution.measureConversion.error.testGetValue() ?? 0,
    measureConversionFailureCount,
    "Failed measureConversion calls."
  );

  await mockServer.stop();
});
