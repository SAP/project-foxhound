// |jit-test| --setpref=wasm_moz_intgemm=true; skip-if: !newGlobal({newCompartment: true, systemPrincipal: true}).wasmMozIntGemmEnabled()

// Explicitly constructing a builtin module
{
  const g = newGlobal({ newCompartment: true, systemPrincipal: true });
  assertErrorMessage(() => g.eval(`
    const mem = new WebAssembly.Memory({ shared: true, initial: 1, maximum: 1 });
    new WebAssembly.Instance(WebAssembly.mozIntGemm(), { "": { "memory": mem } });
  `), g.WebAssembly.LinkError, /imported shared memory but unshared required/);
}

// Importing builtin functions directly
{
  const wat = `(module
    (import "wasm_gemm" "int8_prepare_b" (func $f (param i32 f32 f32 i32 i32 i32)))
    (import "" "mem" (memory 1 1 shared))
  )`;
  const g = newGlobal({ newCompartment: true, systemPrincipal: true });
  assertErrorMessage(() => g.eval(`
    const mod = new WebAssembly.Module(wasmTextToBinary(\`${wat}\`), { mozIntGemm: true });
    const mem = new WebAssembly.Memory({ shared: true, initial: 1, maximum: 1 });
    new WebAssembly.Instance(mod, { "": { mem } });
  `), g.WebAssembly.CompileError, /builtin funcs are not compatible with shared memories/);
}
