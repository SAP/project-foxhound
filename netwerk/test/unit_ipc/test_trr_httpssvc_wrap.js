"use strict";

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

add_setup(async function setup() {
  // Set to allow the cert presented by our H2 server
  do_get_profile();

  trr_test_setup();

  Services.prefs.setBoolPref("network.security.esni.enabled", false);

  // The child will set up the TRR server, but it's not allowed
  // to install the cert, so we do it from here.
  await NodeHTTPSServer.installCert("http2-ca.pem");

  registerCleanupFunction(async () => {
    trr_clear_prefs();
    Services.prefs.clearUserPref("network.security.esni.enabled");
  });
});

add_task(function run_test() {
  let ipcListener = {
    receiveMessage(message) {
      if (message.name == "set-trr-uri") {
        Services.prefs.setCharPref("network.trr.uri", message.data);
        Services.prefs.setIntPref("network.trr.mode", 3);
      } else if (message.name == "clearCache") {
        Services.dns.clearCache(true);
      }
      do_send_remote_message(`${message.name}-done`);
    },
  };

  let mm = Cc["@mozilla.org/parentprocessmessagemanager;1"].getService();
  mm.addMessageListener("set-trr-uri", ipcListener);
  mm.addMessageListener("clearCache", ipcListener);

  do_await_remote_message("set-port-prefixed-pref").then(() => {
    Services.prefs.setBoolPref(
      "network.dns.port_prefixed_qname_https_rr",
      true
    );
    do_send_remote_message("set-port-prefixed-pref-done");
  });

  run_test_in_child("../unit/test_trr_httpssvc.js", () => {
    mm.removeMessageListener("set-trr-uri", ipcListener);
    mm.removeMessageListener("clearCache", ipcListener);
    do_test_finished();
  });
});
