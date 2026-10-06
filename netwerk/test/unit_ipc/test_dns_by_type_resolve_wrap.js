"use strict";

let h2Port;
let trrServer;

add_setup(async function setup() {
  // Set to allow the cert presented by our H2 server
  do_get_profile();

  trrServer = new TRRServer();
  await trrServer.start();
  h2Port = trrServer.port();

  trr_test_setup();

  // So we can change the pref without clearing the cache to check a pushed
  // record with a TRR path that fails.
  Services.prefs.setBoolPref("network.trr.clear-cache-on-pref-change", false);

  registerCleanupFunction(async () => {
    trr_clear_prefs();
    await trrServer.stop();
  });
});

add_task(function run_test() {
  Services.prefs.setCharPref(
    "network.trr.uri",
    "https://foo.example.com:" + h2Port + "/doh"
  );
  Services.prefs.setIntPref("network.trr.mode", 2); // TRR first
  run_test_in_child("child_dns_by_type_resolve.js");
});
