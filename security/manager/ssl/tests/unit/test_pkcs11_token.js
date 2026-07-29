// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Tests the methods and attributes for interfacing with a PKCS #11 token, using
// the internal key token.
// We don't use either of the test tokens in the test PKCS #11 module because:
//   1. Test token 1 cyclically inserts and removes itself in a tight loop.
//      Using token 1 would complicate the test and introduce intermittent
//      failures.
//   2. Neither test token implements login or password related functionality.
//      We want to test such functionality.
//   3. Using the internal token lets us actually test the internal token works
//      as expected.

// Ensure that the appropriate initialization has happened.
do_get_profile();

function checkBasicAttributes(token) {
  let bundle = Services.strings.createBundle(
    "chrome://pipnss/locale/pipnss.properties"
  );

  let expectedTokenName = bundle.GetStringFromName("PrivateTokenDescription");
  equal(
    token.tokenName,
    expectedTokenName,
    "Actual and expected name should match"
  );
  equal(
    token.tokenManID,
    bundle.GetStringFromName("ManufacturerID"),
    "Actual and expected manufacturer ID should match"
  );
  equal(
    token.tokenHWVersion,
    "0.0",
    "Actual and expected hardware version should match"
  );
  equal(
    token.tokenFWVersion,
    "0.0",
    "Actual and expected firmware version should match"
  );
  equal(
    token.tokenSerialNumber,
    "0000000000000000",
    "Actual and expected serial number should match"
  );
}

function run_test() {
  let token = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
    Ci.nsIPKCS11Token
  );
  notEqual(token, null, "The internal token should be present");
  ok(
    token.isInternalKeyToken,
    "The internal token should be represented as such"
  );

  checkBasicAttributes(token);

  ok(!token.isLoggedIn, "Token should not be logged into yet");
  // Test that attempting to log out even when the token was not logged into
  // does not result in an error.
  token.logout();
  ok(!token.isLoggedIn, "Token should still not be logged into");
  ok(
    !token.hasPassword,
    "Token should not have a password before it has been set"
  );

  let initialPW = "foo 1234567890`~!@#$%^&*()-_=+{[}]|\\:;'\",<.>/? 一二三";
  token.changePassword("", initialPW);
  token.login();
  ok(token.isLoggedIn, "Token should now be logged into");

  token.logout();
  ok(!token.isLoggedIn, "Token should be logged out after calling logout()");

  ok(
    token.canHavePassword,
    "The internal token should always be able to have a password"
  );
}
