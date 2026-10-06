// |jit-test| skip-if: !wasmDebuggingEnabled() || !('Function' in WebAssembly)
// Builtin/self-hosted wasm modules (e.g. from WebAssembly.Function) should
// not be visible via the Debugger API.

var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);

var newScriptCount = 0;
dbg.onNewScript = function(s) {
  if (s.format === "wasm") {
    newScriptCount++;
  }
};

// Instantiate a regular user wasm module. Store in a global to prevent GC.
g.eval(`
  var inst = new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(
    '(module (func (export "f") (result i32) i32.const 42))'
  )));
`);
assertEq(newScriptCount, 1, "regular wasm instance should fire onNewScript");

// WebAssembly.Function creates an internal wasm module and should NOT fire onNewScript.
g.eval(`new WebAssembly.Function({parameters: ["i32"], results: ["i32"]}, x => x + 1);`);
assertEq(newScriptCount, 1, "WebAssembly.Function internal module should not fire onNewScript");

// findScripts should also not expose the internal module.
var wasmScripts = dbg.findScripts().filter(s => s.format === "wasm");
assertEq(wasmScripts.length, 1, "findScripts should only return the regular wasm module");
