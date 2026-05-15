/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Tests the methods and attributes for interfacing with a PKCS #11 module and
// the module database.

// Ensure that the appropriate initialization has happened.
do_get_profile();

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

const gCertDB = Cc["@mozilla.org/security/x509certdb;1"].getService(
  Ci.nsIX509CertDB
);

add_task(async function test_pkcs11_module() {
  let promptFactoryCID = MockRegistrar.register(
    "@mozilla.org/prompter;1",
    gPromptFactory
  );
  registerCleanupFunction(() => {
    MockRegistrar.unregister(promptFactoryCID);
  });

  Services.fog.initializeFOG();

  equal(
    0,
    await Glean.pkcs11.thirdPartyModulesLoaded.testGetValue(),
    "should have no third-party modules to begin with"
  );

  // Check that if we have never added the test module, that we don't find it
  // in the module list.
  await checkPKCS11ModuleNotPresent("PKCS11 Test Module", "pkcs11testmodule");

  // Check that adding the test module makes it appear in the module list.
  let libraryFile = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
  libraryFile.append("pkcs11testmodule");
  libraryFile.append(ctypes.libraryName("pkcs11testmodule"));
  await loadPKCS11Module(libraryFile, "PKCS11 Test Module", true);
  equal(
    1,
    await Glean.pkcs11.thirdPartyModulesLoaded.testGetValue(),
    "should have one third-party module after loading it"
  );
  let testModule = await checkPKCS11ModuleExists(
    "PKCS11 Test Module",
    "pkcs11testmodule"
  );

  let testClientCertificate = null;
  for (const cert of gCertDB.getCerts()) {
    if (cert.subjectName == "CN=client cert rsa") {
      testClientCertificate = cert;
    }
  }
  ok(testClientCertificate, "test module should expose rsa client certificate");

  // Check that listing the slots for the test module works.
  let testModuleSlotNames = Array.from(
    testModule.listSlots(),
    slot => slot.name
  );
  testModuleSlotNames.sort();
  const expectedSlotNames = [
    "Empty PKCS11 Slot",
    "Test PKCS11 Slot",
    "Test PKCS11 Slot 二",
  ];
  deepEqual(
    testModuleSlotNames,
    expectedSlotNames,
    "Actual and expected slot names should be equal"
  );

  // Check that deleting the test module makes it disappear from the module list.
  let pkcs11ModuleDB = Cc["@mozilla.org/security/pkcs11moduledb;1"].getService(
    Ci.nsIPKCS11ModuleDB
  );
  await pkcs11ModuleDB.deleteModule("PKCS11 Test Module");
  equal(
    0,
    await Glean.pkcs11.thirdPartyModulesLoaded.testGetValue(),
    "should have no third-party modules after unloading it"
  );
  await checkPKCS11ModuleNotPresent("PKCS11 Test Module", "pkcs11testmodule");

  // Check miscellaneous module DB methods and attributes.
  const fipsUtils = Cc["@mozilla.org/security/fipsutils;1"].getService(
    Ci.nsIFIPSUtils
  );
  ok(!fipsUtils.canToggleFIPS, "It should NOT be possible to toggle FIPS");
  ok(!fipsUtils.isFIPSEnabled, "FIPS should not be enabled");
});
