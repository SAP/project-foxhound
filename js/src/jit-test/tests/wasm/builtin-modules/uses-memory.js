// |jit-test| --setpref=wasm_moz_intgemm=true; skip-if: !newGlobal({newCompartment: true, systemPrincipal: true}).wasmMozIntGemmEnabled()

const wat = `(module
  ;; This builtin requires a memory, but no memory is declared, so we should
  ;; fail to validate the module.
  (import "wasm_gemm" "int8_prepare_b" (func $f (param i32 f32 f32 i32 i32 i32)))
  ;; For good measure, we also attempt to call the function. This shouldn't
  ;; even validate because the module should be rejected before the code
  ;; section, but it gives us a fuller picture of validation.
  (func (export "g")
    (call $f (i32.const 0) (f32.const 0) (f32.const 0) (i32.const 64) (i32.const 64) (i32.const 0))
  )
)`;

// new WebAssembly.Module
{
  const g = newGlobal({ newCompartment: true, systemPrincipal: true });
  assertErrorMessage(() => g.eval(`
    const mod = new WebAssembly.Module(wasmTextToBinary(\`${wat}\`), { mozIntGemm: true });
  `), g.WebAssembly.CompileError, /builtin function that requires a memory/);
}

// WebAssembly.instantiate
{
  const g = newGlobal({ newCompartment: true, systemPrincipal: true });
  assertErrorMessage(() => g.eval(`
    let caught;
    WebAssembly.instantiate(wasmTextToBinary(\`${wat}\`), {}, { mozIntGemm: true })
      .then(() => {}, e => { caught = e; });
    drainJobQueue();
    if (caught) {
      throw caught;
    }
  `), g.WebAssembly.CompileError, /builtin function that requires a memory/);
}

// WebAssembly.validate
{
  const g = newGlobal({ newCompartment: true, systemPrincipal: true });
  assertEq(g.eval(`
    WebAssembly.validate(wasmTextToBinary(\`${wat}\`), { mozIntGemm: true });
  `), false);
}
