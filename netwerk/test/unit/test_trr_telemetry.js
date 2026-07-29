"use strict";

/* import-globals-from trr_common.js */

let trrServer;
add_setup(async function setup() {
  trr_test_setup();
  Services.fog.initializeFOG();
  Services.prefs.setBoolPref("network.trr.useGET", false);

  trrServer = new TRRServer();
  await trrServer.start();
  h2Port = trrServer.port();
});

registerCleanupFunction(async () => {
  trr_clear_prefs();
  if (trrServer) {
    await trrServer.stop();
  }
});

async function trrLookup(mode, rolloutMode) {
  if (rolloutMode) {
    info("Testing doh-rollout.mode");
    setModeAndURI(0, "doh?responseIP=2.2.2.2");
    Services.prefs.setIntPref("doh-rollout.mode", rolloutMode);
  } else {
    setModeAndURI(mode, "doh?responseIP=2.2.2.2");
  }

  let expectedKey = `(other)_${mode}`;
  if (mode == 0) {
    expectedKey = "(other)";
  }

  let metric = Glean.dns.trrSkipReasonTrrFirst[expectedKey];
  let baseline = metric.testGetValue();

  Services.dns.clearCache(true);
  await new TRRDNSListener("test.example.com", "2.2.2.2");

  await TestUtils.waitForCondition(() => {
    let snapshot = metric.testGetValue();
    info("snapshot:" + JSON.stringify(snapshot));
    return snapshot;
  });

  let current = metric.testGetValue();
  let bucketKey = String(Ci.nsITRRSkipReason.TRR_OK);
  let delta =
    (current?.values?.[bucketKey] ?? 0) - (baseline?.values?.[bucketKey] ?? 0);
  Assert.equal(delta, 1, `Expected 1 new TRR_OK entry for key ${expectedKey}`);
}

add_task(async function test_trr_lookup_mode_2() {
  await trrLookup(Ci.nsIDNSService.MODE_TRRFIRST);
});

add_task(async function test_trr_lookup_mode_3() {
  await trrLookup(Ci.nsIDNSService.MODE_TRRONLY);
});

add_task(async function test_trr_lookup_mode_0() {
  await trrLookup(
    Ci.nsIDNSService.MODE_NATIVEONLY,
    Ci.nsIDNSService.MODE_TRRFIRST
  );
});

async function trrByTypeLookup(trrURI, expectedSuccess, expectedSkipReason) {
  Services.prefs.setIntPref(
    "doh-rollout.mode",
    Ci.nsIDNSService.MODE_NATIVEONLY
  );

  let expectedKey = `(other)_2`;
  let metric = Glean.dns.trrRelevantSkipReasonTrrFirstTypeRec[expectedKey];
  let baseline = metric.testGetValue();

  setModeAndURI(Ci.nsIDNSService.MODE_TRRFIRST, trrURI);

  Services.dns.clearCache(true);
  await new TRRDNSListener("test.httpssvc.com", {
    type: Ci.nsIDNSService.RESOLVE_TYPE_HTTPSSVC,
    expectedSuccess,
  });

  await TestUtils.waitForCondition(() => {
    let snapshot = metric.testGetValue();
    info("snapshot:" + JSON.stringify(snapshot));
    return snapshot;
  });

  let current = metric.testGetValue();
  let bucketKey = String(expectedSkipReason);
  let delta =
    (current?.values?.[bucketKey] ?? 0) - (baseline?.values?.[bucketKey] ?? 0);
  Assert.equal(
    delta,
    1,
    `Expected 1 new skip reason entry for key ${expectedKey}`
  );
}

add_task(async function test_trr_by_type_lookup_success() {
  await trrByTypeLookup("doh?httpssvc=1", true, Ci.nsITRRSkipReason.TRR_OK);
});

add_task(async function test_trr_by_type_lookup_fail() {
  await trrByTypeLookup(
    "doh?responseIP=none",
    false,
    Ci.nsITRRSkipReason.TRR_NO_ANSWERS
  );
});
