// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Bug 2045430 - WebAssembly.promising must not crash on non-final / rec-group
// function types.

// Non-final (sub) function type.
{
  const mod = new WebAssembly.Module(wasmTextToBinary(`(module
    (type $t (sub (func)))
    (func (export "f") (type $t))
  )`));
  const inst = new WebAssembly.Instance(mod);
  const pf = WebAssembly.promising(inst.exports.f);
  assertEq(typeof pf, "function");
}

// Multi-member recursion group (typical wasm-GC toolchain output).
{
  const mod = new WebAssembly.Module(wasmTextToBinary(`(module
    (rec
      (type $s (struct))
      (type $ft (func (param (ref null $s))))
    )
    (func (export "f") (type $ft) (drop (local.get 0)))
  )`));
  const inst = new WebAssembly.Instance(mod);
  const pf = WebAssembly.promising(inst.exports.f);
  assertEq(typeof pf, "function");
}
