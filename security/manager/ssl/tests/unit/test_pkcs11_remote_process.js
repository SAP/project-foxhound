// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Ensure that the appropriate initialization has happened.
do_get_profile();

add_task(async function test_pkcs11_remote_process() {
  let libraryFile = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
  libraryFile.append("pkcs11testmodule");
  libraryFile.append(ctypes.libraryName("pkcs11testmodule"));
  ok(libraryFile.exists(), "The pkcs11testmodule file should exist");

  let moduleDB = Cc["@mozilla.org/security/pkcs11moduledb;1"].getService(
    Ci.nsIPKCS11ModuleDB
  );

  await moduleDB.addModule("PKCS11 Test Module", libraryFile.path, 0, 0);

  let testModule = await findModuleByName(moduleDB, "PKCS11 Test Module");
  notEqual(testModule, null, "should be able to find test module");
  let testSlot = findSlotByName(testModule, "Test PKCS11 Slot 二");
  notEqual(testSlot, null, "should be able to find 'Test PKCS11 Slot 二'");

  equal(
    testSlot.name,
    "Test PKCS11 Slot 二",
    "Actual and expected name should match"
  );
  equal(
    testSlot.desc,
    "Test PKCS11 Slot 二",
    "Actual and expected description should match"
  );
  equal(
    testSlot.manID,
    "Test PKCS11 Manufacturer ID",
    "Actual and expected manufacturer ID should match"
  );
  equal(
    testSlot.HWVersion,
    "0.0",
    "Actual and expected hardware version should match"
  );
  equal(
    testSlot.FWVersion,
    "0.0",
    "Actual and expected firmware version should match"
  );
  equal(
    testSlot.status,
    Ci.nsIPKCS11Slot.SLOT_NOT_LOGGED_IN,
    "Actual and expected status should match"
  );
  equal(
    testSlot.tokenName,
    "Test PKCS11 Tokeñ 2 Label",
    "Actual and expected token name should match"
  );

  throws(
    () => testSlot.getToken(),
    /NS_ERROR_NOT_AVAILABLE/,
    "getting the token of a remote slot is not yet implemented"
  );

  await moduleDB.deleteModule("PKCS11 Test Module");
  testModule = await findModuleByName(moduleDB, "PKCS11 Test Module");
  equal(
    testModule,
    null,
    "should not be able to find test module after unloading it"
  );

  // Ensure that listing the remote modules also lists modules loaded by
  // default in the main process (namely, the internal NSS modules).
  let internalModule = await findModuleByName(
    moduleDB,
    "NSS Internal PKCS #11 Module"
  );
  notEqual(internalModule, null, "internal module should be listed");
  let internalKeySlot = findSlotByName(
    internalModule,
    "Software Security Device"
  );
  notEqual(internalKeySlot, null, "internal key slot should be present");
  let internalKeyToken = internalKeySlot.getToken();
  notEqual(internalKeyToken, null, "should be able to get internal key token");
  ok(
    internalKeyToken.isInternalKeyToken,
    "internal key token should that it's the internal key token"
  );
});
