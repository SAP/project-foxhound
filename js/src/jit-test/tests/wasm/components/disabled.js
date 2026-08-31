// |jit-test| skip-if: wasmComponentsEnabled()

// This file does a few smoke tests to make sure component behavior can
// actually be disabled.

assertErrorMessage(() => new WebAssembly.Component(), TypeError, /not a constructor/);
assertEq(WebAssembly.validate(wasmTextToBinary(`(component)`)), false);
