let module = new WebAssembly.Module(wasmTextToBinary(`(module
  (func
    (import "wasm:js-string" "test")
    (param externref)
    (result i32)
  )
  (global (import "'" "string") (ref extern))
)`), {builtins: ['js-string'], importedStringConstants: "'"});
let imports = WebAssembly.Module.imports(module);

// All imports that refer to a builtin module are suppressed from import
// reflection.
assertEq(imports.length, 0);

// Polyfill imports must remain visible.
{
  const mod = new WebAssembly.Module(wasmTextToBinary(`(module
    (import "wasm:js-string" "test"           (func (param externref) (result i32)))
    (import "wasm:js-string" "futureFunction" (func (param externref) (result externref)))
  )`), {builtins: ["js-string"]});
  const imp = WebAssembly.Module.imports(mod);
  assertEq(imp.length, 1);
  assertEq(imp[0].name, "futureFunction");
}

// A hidden builtin import must still advance the type counter so
// the following visible import reflects the correct type.
{
  const mod = new WebAssembly.Module(wasmTextToBinary(`(module
    (import "wasm:js-string" "test"   (func (param externref) (result i32)))
    (import "other"          "myFunc" (func (param i32 i32)   (result i32)))
  )`), {builtins: ["js-string"]});
  const imp = WebAssembly.Module.imports(mod);
  assertEq(imp.length, 1);
  assertEq(imp[0].name, "myFunc");
  // imp[0].type is only present if ENABLE_WASM_TYPE_REFLECTIONS defined.
  if (imp[0].type !== undefined) {
    assertEq(JSON.stringify(imp[0].type.parameters), '["i32","i32"]');
    assertEq(JSON.stringify(imp[0].type.results), '["i32"]');
  }
}
