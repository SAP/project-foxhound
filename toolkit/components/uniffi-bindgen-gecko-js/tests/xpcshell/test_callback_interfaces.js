/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const {
  invokeTestCallbackInterfaceNoop,
  invokeTestCallbackInterfaceGetValue,
  invokeTestCallbackInterfaceSetValue,
  TestCallbackInterface,
  UniffiSkipJsTypeCheck,
  UnitTestObjs,
} = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/tests/generated/RustUniffiBindingsTests.sys.mjs"
);

/**
 *
 */
class Callback extends TestCallbackInterface {
  constructor(value) {
    super();
    this.value = value;
  }

  noop() {}

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
  }
}

// Construct a callback interface to pass to rust
const cbi = new Callback(42);
// Before we pass it to Rust `hasRegisteredCallbacks` should return fals
Assert.equal(
  UnitTestObjs.uniffiCallbackHandlerUniffiBindingsTestsTestCallbackInterface.hasRegisteredCallbacks(),
  false
);
// Test calling callback interface methods, which we can only do indirectly.
// Each of these Rust functions inputs a callback interface, calls a method on it, then returns the result.
invokeTestCallbackInterfaceNoop(cbi);
Assert.equal(invokeTestCallbackInterfaceGetValue(cbi), 42);
invokeTestCallbackInterfaceSetValue(cbi, 43);
Assert.equal(invokeTestCallbackInterfaceGetValue(cbi), 43);

// Test lowering failures when invoking the callback interfaces.
// The main test is that we don't leak a callback interface handle when doing this.
// Even though the Rust call doesn't go through, `hasRegisteredCallbacks` should still return false
// at the end of this test.

const invalidU32Value = 2 ** 48;
try {
  invokeTestCallbackInterfaceSetValue(cbi, invalidU32Value);
} catch {
  // Errors are expected
}

// Test a trickier case of lower failing.
// This one uses `UniffiSkipJsTypeCheck` to force the JS type checking to pass and make the failure
// happen in the C++ layer.
try {
  invokeTestCallbackInterfaceSetValue(
    cbi,
    new UniffiSkipJsTypeCheck(invalidU32Value)
  );
} catch {
  // Errors are expected
}

// eslint-disable-next-line no-delete-var
delete cbi;
// Wait a bit, then check that all callbacks have been cleaned up.
// Cleanup happens in a scheduled call, so wait a bit before checking
do_test_pending();
do_timeout(100, () => {
  Assert.equal(
    UnitTestObjs.uniffiCallbackHandlerUniffiBindingsTestsTestCallbackInterface.hasRegisteredCallbacks(),
    false
  );
  do_test_finished();
});
