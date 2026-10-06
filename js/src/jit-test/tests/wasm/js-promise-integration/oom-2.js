// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// An OOM during the synthetic module construction performed by
// WebAssembly.promising() (and by the WebAssembly.Suspending wrapper built at
// instantiation time) must leave a pending exception, rather than returning to
// the caller with no exception set.

var ins = new WebAssembly.Instance(
  new WebAssembly.Module(wasmTextToBinary(`(module (func (export "f")))`)));

oomTest(function() {
  return WebAssembly.promising(ins.exports.f);
});

var susp = new WebAssembly.Suspending(() => Promise.resolve(42));
var mod = new WebAssembly.Module(wasmTextToBinary(`(module
  (import "" "s" (func $s (result i32)))
  (func (export "f") (result i32) call $s)
)`));

oomTest(function() {
  return new WebAssembly.Instance(mod, {"": { s: susp }});
});
