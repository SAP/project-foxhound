// |jit-test| skip-if: helperThreadCount() === 0
// This test was triggering an issue when multiple threads concurrently
// requested synchronous tier-up of the same function in a shared module.
setPrefValue("wasm_lazy_tiering", true);
setPrefValue("wasm_lazy_tiering_synchronous", true);

var body = "";
for (var i = 0; i < 1500; i++) {
  body += "(local.set 0 (i32.add (local.get 0) (i32.const 1)))\n";
}

var wat = `
(module
  (table $t 1 funcref)
  (func $f
    (local i32)
    ${body}
  )
  (elem (i32.const 0) func $f)
  (export "t" (table $t))
)
`;

var bytes = wasmTextToBinary(wat);
var mod = new WebAssembly.Module(bytes);
setSharedObject(mod);

var ins0 = new WebAssembly.Instance(mod);
var f0 = ins0.exports.t.get(0);
f0();

var workerCode = `
  setPrefValue("wasm_lazy_tiering", true);
  setPrefValue("wasm_lazy_tiering_synchronous", true);
  setPrefValue("wasm_lazy_tiering_level", 9);
  var mod = getSharedObject();
  var ins = new WebAssembly.Instance(mod);
  var f = ins.exports.t.get(0);
  f();
`;

for (var w = 0; w < 8; w++) {
  evalInWorker(workerCode);
}
