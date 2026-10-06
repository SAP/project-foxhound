// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Tests using a client authentication certificate via a PKCS#11 module.

// Ensure that the appropriate initialization has happened.
do_get_profile();

const gCertDB = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

// Create a windowless browser before mocking nsIWindowWatcher so that
// createWindowlessBrowser uses the real watcher service. We hand its Window
// out from the mock's activeWindow getter so the C++ caller takes the
// "if (activeWindow) { openDialog(...) }" branch and the dialog-open
// assertions in openWindow below actually run.
let gWindowlessBrowser = Services.appShell.createWindowlessBrowser(false);
let gSystemPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
gWindowlessBrowser.docShell.createAboutBlankDocumentViewer(
  gSystemPrincipal,
  gSystemPrincipal
);

// Mock nsIWindowWatcher. The protected-auth path opens
// chrome://pippki/content/protectedAuth.xhtml via nsNSSDialogHelper, which
// forwards to nsIWindowWatcher::OpenWindow. We hand out a real Window from
// activeWindow so the C++ caller takes the dialog-open branch, then
// intercept openWindow to validate the URL and dialog args, and fire
// pk11-protected-auth-complete with the dialog's unique promptId.
var gWindowWatcher = {
  get activeWindow() {
    return gWindowlessBrowser.document.defaultView;
  },
  getNewPrompter: () => {
    ok(false, "not expecting getNewPrompter() to be called");
    return null;
  },
  openWindow(_parent, url, _name, _features, args) {
    equal(
      url,
      "chrome://pippki/content/protectedAuth.xhtml",
      "expected protected-auth dialog URL"
    );
    let bag = args.QueryInterface(Ci.nsIWritablePropertyBag2);
    equal(
      bag.getPropertyAsAString("tokenName"),
      "Test PKCS11 Tokeñ 2 Label",
      "expected token name in dialog args"
    );
    let promptId = bag.getPropertyAsAString("promptId");
    Services.obs.notifyObservers(
      null,
      "pk11-protected-auth-complete",
      promptId
    );
    return null;
  },
  QueryInterface: ChromeUtils.generateQI(["nsIWindowWatcher"]),
};

let watcherCID = MockRegistrar.register(
  "@mozilla.org/embedcomp/window-watcher;1",
  gWindowWatcher
);
registerCleanupFunction(() => {
  MockRegistrar.unregister(watcherCID);
  gWindowlessBrowser.close();
});

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
