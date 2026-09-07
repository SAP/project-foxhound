// |jit-test| --setpref=wasm_js_promise_integration=true; --wasm-compiler=baseline; exitstatus: 6; skip-if: !wasmIsSupported() || !wasmJSPromiseIntegrationEnabled();

// Load this directly and not through 'include', as it will do a quit() with
// exitstatus=0 if !wasmIsSupported() and fail the test. We replicate the quit
// using skip-if, which the harness can handle correctly.
load(libdir + 'wasm.js');

// The interrupt will trigger a forced return which must unwind the whole
// stack. The exitstatus 6 is returned for a timeout return.

var calls = 0;
var bin = wasmTextToBinary(`(module
  (import "" "inner" (func $inner (result i32)))
  (func (export "run") (result i32)
    (loop $l (call $inner) drop br $l)
    i32.const 0
  )
)`);
var bin2 = wasmTextToBinary(`(module
  (import "" "js" (func $js (result i32)))
  (func (export "run") (result i32)
    (if (call $js) (then (loop $l br $l)))
    i32.const 1
  )
)`);
var inst2 = new WebAssembly.Instance(new WebAssembly.Module(bin2), {"": {js: () => {
  calls++;
  if (calls >= 2) { interruptIf(true); return 1; }
  return 0;
}}});
var inner = WebAssembly.promising(inst2.exports.run);
var innerSusp = new WebAssembly.Suspending(inner);
var inst = new WebAssembly.Instance(new WebAssembly.Module(bin), {"": {inner: innerSusp}});
var run = WebAssembly.promising(inst.exports.run);
setInterruptCallback(`false;`);
var p = run();
drainJobQueue();
