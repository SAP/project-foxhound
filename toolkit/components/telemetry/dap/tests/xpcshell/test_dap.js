/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { HttpServer } = ChromeUtils.import("resource://testing-common/httpd.js");

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DAPTelemetrySender: "resource://gre/modules/DAPTelemetrySender.sys.mjs",
});

const BinaryOutputStream = Components.Constructor(
  "@mozilla.org/binaryoutputstream;1",
  "nsIBinaryOutputStream",
  "setOutputStream"
);

const BinaryInputStream = Components.Constructor(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream"
);

const PREF_LEADER = "toolkit.telemetry.dap_leader";
const PREF_HELPER = "toolkit.telemetry.dap_helper";

let received = false;
let server;
let server_addr;

function hpkeConfigHandler(request, response) {
  if (
    request.queryString == "task_id=StldO2czL_iaUF2iljFbiLiNTxxVNdPHgPuuEWLHnsk"
  ) {
    let config_bytes;
    if (request.path.startsWith("/leader")) {
      config_bytes = new Uint8Array([
        47,
        0,
        32,
        0,
        1,
        0,
        1,
        0,
        32,
        11,
        33,
        206,
        33,
        131,
        56,
        220,
        82,
        153,
        110,
        228,
        200,
        53,
        98,
        210,
        38,
        177,
        197,
        252,
        198,
        36,
        201,
        86,
        121,
        169,
        238,
        220,
        34,
        143,
        112,
        177,
        10,
      ]);
    } else {
      config_bytes = new Uint8Array([
        42,
        0,
        32,
        0,
        1,
        0,
        1,
        0,
        32,
        28,
        62,
        242,
        195,
        117,
        7,
        173,
        149,
        250,
        15,
        139,
        178,
        86,
        241,
        117,
        143,
        75,
        26,
        57,
        60,
        88,
        130,
        199,
        175,
        195,
        9,
        241,
        130,
        61,
        47,
        215,
        101,
      ]);
    }
    response.setHeader("Content-Type", "application/dap-hpke-config");
    let bos = new BinaryOutputStream(response.bodyOutputStream);
    bos.writeByteArray(config_bytes);
  } else {
    Assert.ok(false, "Unknown query string.");
  }
}

function uploadHandler(request, response) {
  Assert.equal(
    request.getHeader("Content-Type"),
    "application/dap-report",
    "Wrong Content-Type header."
  );
  let body = new BinaryInputStream(request.bodyInputStream);
  Assert.equal(body.available(), 432, "Wrong request body size.");
  received = true;
  response.setStatusLine(request.httpVersion, 200);
}

add_setup(async function() {
  do_get_profile();
  Services.fog.initializeFOG();

  // Set up a mock server to represent the DAP endpoints.
  server = new HttpServer();
  server.registerPathHandler("/leader_endpoint/hpke_config", hpkeConfigHandler);
  server.registerPathHandler("/helper_endpoint/hpke_config", hpkeConfigHandler);
  server.registerPathHandler("/leader_endpoint/upload", uploadHandler);
  server.start(-1);

  const orig_leader = Services.prefs.getStringPref(PREF_LEADER);
  const orig_helper = Services.prefs.getStringPref(PREF_HELPER);
  const i = server.identity;
  server_addr = i.primaryScheme + "://" + i.primaryHost + ":" + i.primaryPort;
  Services.prefs.setStringPref(PREF_LEADER, server_addr + "/leader_endpoint");
  Services.prefs.setStringPref(PREF_HELPER, server_addr + "/helper_endpoint");
  registerCleanupFunction(() => {
    Services.prefs.setStringPref(PREF_LEADER, orig_leader);
    Services.prefs.setStringPref(PREF_HELPER, orig_helper);

    return new Promise(resolve => {
      server.stop(resolve);
    });
  });
});

add_task(async function testVerificationTask() {
  Services.fog.testResetFOG();
  let before = Glean.dap.uploadStatus.success.testGetValue() ?? 0;
  await lazy.DAPTelemetrySender.sendVerificationTaskReport();
  let after = Glean.dap.uploadStatus.success.testGetValue();
  Assert.equal(before + 1, after, "Successful submissions should be counted.");
  Assert.ok(received, "Report upload successful.");
});

add_task(async function testNetworkError() {
  Services.fog.testResetFOG();
  let before = Glean.dap.reportGenerationStatus.failure.testGetValue() ?? 0;
  Services.prefs.setStringPref(PREF_LEADER, server_addr + "/invalid-endpoint");
  await lazy.DAPTelemetrySender.sendVerificationTaskReport();
  let after = Glean.dap.reportGenerationStatus.failure.testGetValue() ?? 0;
  Assert.equal(
    before + 1,
    after,
    "Failed report generation should be counted."
  );
});
