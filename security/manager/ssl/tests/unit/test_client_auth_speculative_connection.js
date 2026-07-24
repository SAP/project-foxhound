/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

ChromeUtils.defineESModuleGetters(this, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
});

do_get_profile();

var gPrompt = {
  QueryInterface: ChromeUtils.generateQI(["nsIPrompt"]),

  // This intentionally does not use arrow function syntax to avoid an issue
  // where in the context of the arrow function, |this != gPrompt| due to
  // how objects get wrapped when going across xpcom boundaries.
  alert(title, text) {
    info(`alert('${title}','${text}')`);
    ok(false, "not expecting alert() to be called");
  },

  promptPassword(dialogTitle, text, _password, _checkMsg) {
    info(`promptPassword('${dialogTitle}', '${text}')`);
    ok(false, "not expecting promptPassword() to be called");
  },
};

const gPromptFactory = {
  QueryInterface: ChromeUtils.generateQI(["nsIPromptFactory"]),
  getPrompt: () => gPrompt,
};

function getTestClientCertificate() {
  const certDB = Cc["@mozilla.org/security/x509certdb;1"].getService(
    Ci.nsIX509CertDB
  );
  const certFile = do_get_file("test_certDB_import/encrypted_with_aes.p12");
  certDB.importPKCS12File(certFile, "password");
  for (const cert of certDB.getCerts()) {
    if (cert.commonName == "John Doe") {
      return cert;
    }
  }
  return null;
}

function run_test() {
  MockRegistrar.register("@mozilla.org/prompter;1", gPromptFactory);

  // Set a primary password.
  let tokenDB = Cc["@mozilla.org/security/pk11tokendb;1"].getService(
    Ci.nsIPK11TokenDB
  );
  let token = tokenDB.getInternalKeyToken();
  token.initPassword("password");

  let clientAuthRememberService = Cc[
    "@mozilla.org/security/clientAuthRememberService;1"
  ].getService(Ci.nsIClientAuthRememberService);
  let cert = getTestClientCertificate();
  clientAuthRememberService.rememberDecisionScriptable(
    "requireclientauth.example.com",
    { partitionKey: "(https,example.com)" },
    cert,
    Ci.nsIClientAuthRememberService.Session
  );

  add_tls_server_setup("BadCertAndPinningServer", "bad_certs");
  add_test(function () {
    token.logoutSimple();
    run_next_test();
  });
  Services.prefs.setIntPref("network.http.speculative-parallel-limit", 6);

  add_test(() => {
    Services.prefs.setCharPref(
      "network.dns.localDomains",
      "requireclientauth.example.com"
    );
    let uri = Services.io.newURI("https://requireclientauth.example.com:8443");
    let principal = Services.scriptSecurityManager.createContentPrincipal(
      uri,
      {}
    );

    Services.io
      .QueryInterface(Ci.nsISpeculativeConnect)
      .speculativeConnect(uri, principal, null, false);
    // This is not a robust way to test this, but it's hard to test that
    // something *didn't* happen (the something being, the primary password
    // prompt). In any case, if after 3 seconds the prompt hasn't happened,
    // optimistically assume it won't and pass the test.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    setTimeout(run_next_test, 3000);
  });

  run_next_test();
}
