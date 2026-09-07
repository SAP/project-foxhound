// |jit-test| allow-oom

// Test that OOM during wasm array OOL allocation leaves the object in a
// correct state.
// If OOM happens in the middle of OOL creation, the array can be left in an
// inconsistent state (its shape may not yet be initialized, or it could have a
// dangling data pointer). That would make GC trace it incorrectly and
// potentially crash.
const mod = new WebAssembly.Module(wasmTextToBinary(`(module
  (type $arr (array (mut i64)))
  (global (ref null $arr) (array.new_default $arr (i32.const 200)))
)`));

fullcompartmentchecks(true);

for (let y of [ 1,1]) {
  for (let i = 1; i < 100; i++) {
    oomAfterAllocations(i);
    try { new WebAssembly.Instance(mod); } catch(e) {}
    resetOOMFailure();
  }
}

gc();
