/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Tests using a client authentication certificate via a PKCS#11 module.

// Ensure that the appropriate initialization has happened.
do_get_profile();

const gCertDB = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

var gPrompt = {
  QueryInterface: ChromeUtils.generateQI(["nsIPrompt"]),

  // This intentionally does not use arrow function syntax to avoid an issue
  // where in the context of the arrow function, |this != gPrompt| due to
  // how objects get wrapped when going across xpcom boundaries.
  alert(_title, text) {
    const EXPECTED_PROMPT_TEXT =
      "Please authenticate to the token “Test PKCS11 Tokeñ 2 Label”. How to do so depends on the token (for example, using a fingerprint reader or entering a code with a keypad).";
    equal(text, EXPECTED_PROMPT_TEXT, "expecting alert() to be called");
  },

  promptPassword() {
    ok(false, "not expecting promptPassword() to be called");
  },
};

const gPromptFactory = {
  QueryInterface: ChromeUtils.generateQI(["nsIPromptFactory"]),
  getPrompt: () => gPrompt,
};

MockRegistrar.register("@mozilla.org/prompter;1", gPromptFactory);

// Replace the UI dialog that prompts the user to pick a client certificate.
const gClientAuthDialogService = {
  set certificateNameToUse(name) {
    this._certificateNameToUse = name;
  },

  chooseCertificate(hostname, certArray, loadContext, caNames, callback) {
    for (let cert of certArray) {
      if (cert.subjectName == this._certificateNameToUse) {
        callback.certificateChosen(cert, false);
        return;
      }
    }
    callback.certificateChosen(null, false);
  },

  QueryInterface: ChromeUtils.generateQI([Ci.nsIClientAuthDialogService]),
};

MockRegistrar.register(
  "@mozilla.org/security/ClientAuthDialogService;1",
  gClientAuthDialogService
);

add_task(async function run_test() {
  let libraryFile = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
  libraryFile.append("pkcs11testmodule");
  libraryFile.append(ctypes.libraryName("pkcs11testmodule"));
  await loadPKCS11Module(libraryFile, "PKCS11 Test Module", false);

  Services.prefs.setCharPref(
    "network.dns.localDomains",
    "requireclientauth.example.com"
  );

  // The test module currently has a slot that uses a protected authentication
  // path (i.e., when Firefox wants to authenticate to it, it opens a dialog
  // that says "okay, authenticate to your token by using an external keypad or
  // something" and waits for that to happen). For some reason, if this
  // authentication happens as a result of the socket thread looking for client
  // auth certificates, it results in an assertion failure ("Assertion
  // failure: mSleep == AWAKE") in profiler_thread_sleep(). This probably has
  // something to do with the fact that the socket thread is synchronously
  // waiting on the main thread, which is spinning a nested event loop (which
  // tends to cause problems like this).
  // Since this is an uncommon configuration and since this issue hasn't been
  // reproduced outside of this test infrastructure, this works around it for
  // the time being by authenticating to all tokens on the main thread so that
  // the socket thread doesn't have to.
  gCertDB.getCerts();

  await asyncStartTLSTestServer("BadCertAndPinningServer", "bad_certs");
  gClientAuthDialogService.certificateNameToUse = "CN=client cert rsa";
  await asyncConnectTo("requireclientauth.example.com", PRErrorCodeSuccess);
  gClientAuthDialogService.certificateNameToUse = "CN=client cert ecdsa";
  await asyncConnectTo("requireclientauth.example.com", PRErrorCodeSuccess);
});
