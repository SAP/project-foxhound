/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  NewTabAttributionServiceClass:
    "resource://newtab/lib/NewTabAttributionService.sys.mjs",
  ObliviousHTTP: "resource://gre/modules/ObliviousHTTP.sys.mjs",
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const BinaryInputStream = Components.Constructor(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream"
);

const PREF_LEADER = "toolkit.telemetry.dap.leader.url";
const PREF_HELPER = "toolkit.telemetry.dap.helper.url";
const TASK_ID = "DSZGMFh26hBYXNaKvhL_N4AHA3P5lDn19on1vFPBxJM";
const MAX_CONVERSIONS = 2;
const DAY_IN_MILLI = 1000 * 60 * 60 * 24;
const LOOKBACK_DAYS = 1;
const MAX_LOOKBACK_DAYS = 30;
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

class MockDAPSender {
  constructor() {
    this.receivedMeasurements = [];
  }

  async sendDAPMeasurement(task, measurement, options) {
    this.receivedMeasurements.push({
      task,
      measurement,
      options,
    });
  }
}

class MockServer {
  constructor() {
    this.receivedReports = [];

    const server = new HttpServer();

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
    const serverAddr = `${i.primaryScheme}://${i.primaryHost}:${i.primaryPort}`;
    Services.prefs.setStringPref(PREF_LEADER, `${serverAddr}/leader_endpoint`);
    Services.prefs.setStringPref(PREF_HELPER, `${serverAddr}/helper_endpoint`);
  }

  async stop() {
    Services.prefs.setStringPref(PREF_LEADER, this.orig_leader);
    Services.prefs.setStringPref(PREF_HELPER, this.orig_helper);

    await this._server.stop();
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

let globalSandbox;

add_setup(async function () {
  do_get_profile();
  Services.prefs.setStringPref(
    "browser.newtabpage.activity-stream.unifiedAds.endpoint",
    "https://test.example.com"
  );
  Services.prefs.setStringPref(
    "browser.newtabpage.activity-stream.discoverystream.ohttp.configURL",
    "https://test.example.com/config"
  );
  Services.prefs.setStringPref(
    "browser.newtabpage.activity-stream.discoverystream.ohttp.relayURL",
    "https://test.example.com/relay"
  );

  globalSandbox = sinon.createSandbox();
  globalSandbox.stub(ObliviousHTTP, "getOHTTPConfig").resolves({});
  globalSandbox.stub(ObliviousHTTP, "ohttpRequest").resolves({
    status: 200,
    json: () => {
      return Promise.resolve({
        task_id: TASK_ID,
        vdaf: "histogram",
        bits: 1,
        length: HISTOGRAM_SIZE,
        time_precision: 60,
        default_measurement: 0,
      });
    },
  });

  const mockStore = {
    getState: () => ({
      Prefs: {
        values: {
          trainhopConfig: {
            attribution: {},
          },
        },
      },
    }),
  };

  globalSandbox.stub(AboutNewTab, "activityStream").value({
    store: mockStore,
  });
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref(
    "browser.newtabpage.activity-stream.unifiedAds.endpoint"
  );
  Services.prefs.clearUserPref(
    "browser.newtabpage.activity-stream.discoverystream.ohttp.configURL"
  );
  Services.prefs.clearUserPref(
    "browser.newtabpage.activity-stream.discoverystream.ohttp.relayURL"
  );

  globalSandbox.restore();
});

add_task(async function testSuccessfulConversion() {
  const mockSender = new MockDAPSender();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
  });

  const partnerIdentifier = "partner_identifier";
  const index = 1;

  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  await privateAttribution.onAttributionEvent("click", {
    partner_id: partnerIdentifier,
    index,
  });

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.task, {
    task_id: TASK_ID,
    id: TASK_ID,
    vdaf: "histogram",
    bits: 1,
    length: HISTOGRAM_SIZE,
    time_precision: 60,
    default_measurement: 0,
  });
  Assert.equal(receivedMeasurement.measurement, index);
  Assert.ok(receivedMeasurement.options.ohttp_hpke);
  Assert.equal(receivedMeasurement.options.ohttp_hpke.length, 41);
  Assert.equal(
    receivedMeasurement.options.ohttp_relay,
    Services.prefs.getStringPref("dap.ohttp.relayURL")
  );
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testZeroIndex() {
  const mockSender = new MockDAPSender();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
  });

  const partnerIdentifier = "partner_identifier_zero";
  const index = 0;

  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.equal(receivedMeasurement.measurement, index);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testConversionWithoutImpression() {
  const mockSender = new MockDAPSender();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
  });

  const partnerIdentifier = "partner_identifier_no_impression";

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.task, {
    task_id: TASK_ID,
    id: TASK_ID,
    vdaf: "histogram",
    bits: 1,
    length: HISTOGRAM_SIZE,
    time_precision: 60,
    default_measurement: 0,
  });
  Assert.equal(receivedMeasurement.measurement, 0);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testConversionWithInvalidLookbackDays() {
  const mockSender = new MockDAPSender();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
  });

  const partnerIdentifier = "partner_identifier";
  const index = 1;

  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    MAX_LOOKBACK_DAYS + 1,
    "view"
  );

  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionByLastView() {
  const mockSender = new MockDAPSender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
    dateProvider: mockDateProvider,
  });

  const partnerIdentifier = "partner_identifier_last_view";
  const selectedViewIndex = 1;
  const ignoredViewIndex = 2;
  const clickIndex = 3;

  // View event that will be ignored, as a more recent view will exist
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index: ignoredViewIndex,
  });

  // step forward time
  mockDateProvider.add(10);

  // View event that will be selected, as no more recent view exists
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index: selectedViewIndex,
  });

  // step forward time
  mockDateProvider.add(10);

  // Click event that will be ignored because the match type is "view"
  await privateAttribution.onAttributionEvent("click", {
    partner_id: partnerIdentifier,
    index: clickIndex,
  });

  // Conversion filtering for "view" finds the view event
  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, selectedViewIndex);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionByLastClick() {
  const mockSender = new MockDAPSender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
    dateProvider: mockDateProvider,
  });

  const partnerIdentifier = "partner_identifier_last_click";
  const viewIndex = 1;
  const ignoredClickIndex = 2;
  const selectedClickIndex = 3;

  // Click event that will be ignored, as a more recent click will exist
  await privateAttribution.onAttributionEvent("click", {
    partner_id: partnerIdentifier,
    index: ignoredClickIndex,
  });

  // step forward time
  mockDateProvider.add(10);

  // Click event that will be selected, as no more recent click exists
  await privateAttribution.onAttributionEvent("click", {
    partner_id: partnerIdentifier,
    index: selectedClickIndex,
  });

  // step forward time
  mockDateProvider.add(10);

  // View event that will be ignored because the match type is "click"
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index: viewIndex,
  });

  // Conversion filtering for "click" finds the click event
  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "click"
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, selectedClickIndex);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionByLastTouch() {
  const mockSender = new MockDAPSender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
    dateProvider: mockDateProvider,
  });

  const partnerIdentifier = "partner_identifier_last_touch";
  const viewIndex = 1;
  const clickIndex = 2;

  // Click at clickIndex
  await privateAttribution.onAttributionEvent("click", {
    partner_id: partnerIdentifier,
    index: clickIndex,
  });

  // step forward time so the view event occurs most recently
  mockDateProvider.add(10);

  // View at viewIndex
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index: viewIndex,
  });

  // Conversion filtering for "default" finds the view event
  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "default"
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, viewIndex);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testSelectionByPartnerId() {
  const mockSender = new MockDAPSender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
    dateProvider: mockDateProvider,
  });

  const partnerIdentifier1 = "partner_identifier_1";
  const partnerIdentifier2 = "partner_identifier_2";
  const partner1Index = 1;
  const partner2Index = 2;

  // view event associated with partner 1
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier1,
    index: partner1Index,
  });

  // step forward time so the partner 2 event occurs most recently
  mockDateProvider.add(10);

  // view event associated with partner 2
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier2,
    index: partner2Index,
  });

  // Conversion filtering for "default" finds the correct view event
  await privateAttribution.onAttributionConversion(
    partnerIdentifier1,
    LOOKBACK_DAYS,
    "default"
  );

  let receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, partner1Index);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testExpiredImpressions() {
  const mockSender = new MockDAPSender();
  const mockDateProvider = new MockDateProvider();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
    dateProvider: mockDateProvider,
  });

  const partnerIdentifier = "partner_identifier";
  const index = 1;
  const defaultMeasurement = 0;

  // Register impression
  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  // Fast-forward time by LOOKBACK_DAYS days + 1 ms
  mockDateProvider.add(LOOKBACK_DAYS * DAY_IN_MILLI + 1);

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, defaultMeasurement);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testConversionBudget() {
  const mockSender = new MockDAPSender();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
  });

  const partnerIdentifier = "partner_identifier_budget";
  const index = 1;
  const defaultMeasurement = 0;

  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  // Measurements uploaded for conversions up to MAX_CONVERSIONS
  for (let i = 0; i < MAX_CONVERSIONS; i++) {
    await privateAttribution.onAttributionConversion(
      partnerIdentifier,
      LOOKBACK_DAYS,
      "view"
    );

    const receivedMeasurement = mockSender.receivedMeasurements.pop();
    Assert.deepEqual(receivedMeasurement.measurement, index);
    Assert.equal(mockSender.receivedMeasurements.length, 0);
  }

  // default report uploaded on subsequent conversions
  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, defaultMeasurement);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testHistogramSize() {
  const mockSender = new MockDAPSender();
  const privateAttribution = new NewTabAttributionServiceClass({
    dapSender: mockSender,
  });

  const partnerIdentifier = "partner_identifier_bad_settings";
  const defaultMeasurement = 0;
  // Zero-based index equal to histogram size is out of bounds
  const index = HISTOGRAM_SIZE;

  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  const receivedMeasurement = mockSender.receivedMeasurements.pop();
  Assert.deepEqual(receivedMeasurement.measurement, defaultMeasurement);
  Assert.equal(mockSender.receivedMeasurements.length, 0);
});

add_task(async function testWithRealDAPSender() {
  // Omit mocking DAP telemetry sender in this test to defend against mock
  // sender getting out of sync
  Services.prefs.setStringPref("dap.ohttp.hpke", "");
  Services.prefs.setStringPref("dap.ohttp.relayURL", "");
  const mockServer = new MockServer();
  mockServer.start();

  const privateAttribution = new NewTabAttributionServiceClass();

  const partnerIdentifier = "partner_identifier_real_dap";
  const index = 1;

  await privateAttribution.onAttributionEvent("view", {
    partner_id: partnerIdentifier,
    index,
  });

  await privateAttribution.onAttributionConversion(
    partnerIdentifier,
    LOOKBACK_DAYS,
    "view"
  );

  await mockServer.stop();

  Assert.equal(mockServer.receivedReports.length, 1);

  const expectedReport = {
    contentType: "application/dap-report",
    size: 502,
  };

  const receivedReport = mockServer.receivedReports.pop();
  Assert.deepEqual(receivedReport, expectedReport);

  Services.prefs.clearUserPref("dap.ohttp.hpke");
  Services.prefs.clearUserPref("dap.ohttp.relayURL");
});
