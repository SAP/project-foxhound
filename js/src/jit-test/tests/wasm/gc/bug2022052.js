// |jit-test| allow-oom

// Test that OOM during wasm struct OOL allocation leaves the object in a
// correct state.
const mod = new WebAssembly.Module(wasmTextToBinary(`(module
  (type $s (struct
    (field i64) (field i64) (field i64) (field i64) (field i64)
    (field i64) (field i64) (field i64) (field i64) (field i64)
    (field i64) (field i64) (field i64) (field i64) (field i64)
    (field i64) (field i64) (field i64) (field i64) (field i64)
  ))
  (global (ref null $s) (struct.new_default $s))
)`));

fullcompartmentchecks(true);

for (let i = 1; ; i++) {
  oomAfterAllocations(i);
  try { new WebAssembly.Instance(mod); } catch(e) {}
  if (!resetOOMFailure()) break;
}

gc();
