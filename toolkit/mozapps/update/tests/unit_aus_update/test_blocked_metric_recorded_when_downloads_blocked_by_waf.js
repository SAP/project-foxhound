/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

add_setup(async () => {
  setupTestCommon();
  start_httpserver();
  setUpdateURL(gURLData + gHTTPHandlerPath);

  do_get_profile();
  Services.fog.initializeFOG();
  Services.fog.testResetFOG();
  Services.prefs.setBoolPref(PREF_APP_UPDATE_BITS_ENABLED, true);
});

add_task(async function test_blockedMetricRecordedWhenDownloadsBlockedByWaf() {
  Assert.equal(
    Glean.update.blocked.testGetValue(),
    null,
    "Metric value is initially null"
  );

  // Register an endpoint that always returns HTTP 406 responses to simulate a
  // WAF blocking the download
  const endpoint = "/406";
  gTestserver.registerPathHandler(endpoint, (request, response) => {
    response.setStatusLine(request.httpVersion, 406, "Not Acceptable");
    response.write("406 Not Acceptable");
  });

  const url = new URL(endpoint, gURLData).href;
  let patch = getRemotePatchString({ url });
  let updates = getRemoteUpdateString({}, patch);
  gResponseBody = getRemoteUpdatesXMLString(updates);

  let updateCheck = await waitForUpdateCheck(true, { updateCount: 1 });
  let update = updateCheck.updates[0];

  await gAUS.downloadUpdate(update, false);

  await TestUtils.waitForCondition(
    () =>
      gAUS.currentState == Ci.nsIApplicationUpdateService.STATE_IDLE ||
      gAUS.currentState == Ci.nsIApplicationUpdateService.STATE_DOWNLOAD_FAILED,
    "Download failed",
    100,
    60000
  );

  Assert.equal(Glean.update.blocked.testGetValue(), 1, "Metric value is 1");
});

add_task(async function teardown() {
  stop_httpserver(doTestFinish);
});
