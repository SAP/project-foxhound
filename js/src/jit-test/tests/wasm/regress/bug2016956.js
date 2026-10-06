// Regression test for bug 2016956: assert in WasmBaselinePerfSpewer::recordInstruction
// when the profiler is toggled during wasm compilation.

var bytes = wasmTextToBinary(`(module
  (func (export "f") (param i32) (result i32)
    local.get 0
    i32.const 1
    i32.add
  )
)`);

enableGeckoProfiling();
for (var i = 0; i < 10; i++) {
  WebAssembly.instantiate(bytes);
  disableGeckoProfiling();
  enableGeckoProfiling();
}
