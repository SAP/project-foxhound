// |jit-test| skip-if: !wasmComponentsEnabled()

// TODO(wasm-cm): Everything in here is nonstandard and should be bikeshedded
// internally and then eventually tested properly after discussion with the CG.
//
// Ideas for what to test later: calling without `new`, prototype chain,
// toString tag, instanceof, typeof, etc.

assertErrorMessage(() => new WebAssembly.Component(), TypeError, /1 argument required/);
assertErrorMessage(() => new WebAssembly.Component(42), TypeError, /first argument must be an ArrayBuffer/);

// TODO(wasm-cm)
const c = new WebAssembly.Component(wasmTextToBinary(`(component)`));
assertThrowsInstanceOfAsync(() => WebAssembly.instantiate(c), TypeError, /must be a WebAssembly.Module/);
