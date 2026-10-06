/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DAPTelemetrySender: "resource://gre/modules/DAPTelemetrySender.sys.mjs",
});

const BinaryInputStream = Components.Constructor(
  "@mozilla.org/binaryinputstream;1",
  "nsIBinaryInputStream",
  "setInputStream"
);

const PREF_LEADER = "toolkit.telemetry.dap.leader.url";
const PREF_HELPER = "toolkit.telemetry.dap.helper.url";
const PREF_DATAUPLOAD = "datareporting.healthreport.uploadEnabled";

let server;
let server_addr;

let server_requests = [];

const task = {
  id: "QjMD4n8l_MHBoLrbCfLTFi8hC264fC59SKHPviPF0q8",
  vdaf: "sum",
  bits: 8,
  time_precision: 300,
};

const task_report_size = 886;

function uploadHandler(request, response) {
  Assert.equal(
    request.getHeader("Content-Type"),
    "application/dap-report",
    "Wrong Content-Type header."
  );

  let body = new BinaryInputStream(request.bodyInputStream);
  server_requests.push(body.available());

  response.setStatusLine(request.httpVersion, 200);
}

add_setup(async function () {
  do_get_profile();

  server = new HttpServer();
  server.registerPrefixHandler("/leader_endpoint/tasks/", uploadHandler);
  server.start(-1);
  const i = server.identity;
  server_addr = i.primaryScheme + "://" + i.primaryHost + ":" + i.primaryPort;

  Services.prefs.setStringPref(PREF_LEADER, server_addr + "/leader_endpoint");
  Services.prefs.setStringPref(PREF_HELPER, server_addr + "/helper_endpoint");
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(PREF_LEADER);
    Services.prefs.clearUserPref(PREF_HELPER);

    return new Promise(resolve => {
      server.stop(resolve);
    });
  });
});

add_task(async function testTelemetryToggle() {
  server_requests = [];
  await lazy.DAPTelemetrySender.sendDAPMeasurement(task, 3, { timeout: 5000 });
  Assert.deepEqual(
    server_requests,
    [task_report_size],
    "Telemetry enabled works."
  );

  server_requests = [];
  Services.prefs.setBoolPref(PREF_DATAUPLOAD, false);
  await lazy.DAPTelemetrySender.sendDAPMeasurement(task, 3, { timeout: 5000 });
  Assert.deepEqual(server_requests, [], "Telemetry disabled blocks sending.");

  server_requests = [];
  Services.prefs.clearUserPref(PREF_DATAUPLOAD);
  await lazy.DAPTelemetrySender.sendDAPMeasurement(task, 3, { timeout: 5000 });
  Assert.deepEqual(
    server_requests,
    [task_report_size],
    "Telemetry re-enabled works."
  );
});
