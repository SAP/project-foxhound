/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

trr_test_setup();
registerCleanupFunction(async () => {
  trr_clear_prefs();
  Services.prefs.clearUserPref("network.http.debug-observations");
  Services.prefs.clearUserPref("network.trr.async_connInfo");
});

let trrServer;
add_task(async function setup() {
  trrServer = new TRRServer();
  registerCleanupFunction(async () => {
    await trrServer.stop();
  });
  await trrServer.start();

  await trrServer.registerDoHAnswers("example.com", "A", {
    answers: [
      {
        name: "example.com",
        ttl: 55,
        type: "A",
        flush: false,
        data: "1.2.3.4",
      },
    ],
  });

  Services.prefs.setIntPref("network.trr.mode", 3);
  Services.prefs.setBoolPref("network.trr.async_connInfo", true);
  Services.prefs.setCharPref(
    "network.trr.uri",
    `https://foo.example.com:${trrServer.port()}/dns-query`
  );

  // Perform an initial DNS query to ensure the TRR connection info is
  // initialized before we fire application-foreground.
  await new TRRDNSListener("example.com", { expectedAnswer: "1.2.3.4" });
});

add_task(async function test_speculative_connect_on_foreground() {
  Services.prefs.setBoolPref("network.http.debug-observations", true);

  let connectRequestPromise = TestUtils.topicObserved(
    "speculative-connect-request"
  );
  Services.obs.notifyObservers(null, "application-foreground");

  let [, hashKey] = await connectRequestPromise;
  Assert.ok(
    hashKey.includes(`foo.example.com:${trrServer.port()}`),
    `Expected speculative connect to TRR server, got: ${hashKey}`
  );
});
