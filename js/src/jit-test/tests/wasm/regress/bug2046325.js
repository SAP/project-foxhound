// |jit-test| skip-if: !wasmDebuggingEnabled()

function hitsForFuncAtIndex(numImports) {
  let g = newGlobal({newCompartment: true});
  let dbg = new Debugger(g);
  let imports = "";
  for (let i = 0; i < numImports; i++) imports += '(import "m" "f" (func)) ';
  g.MODULE_TEXT =
      `(module ${imports}(func (nop) (nop)) (export "test" (func ${numImports})))`;
  g.eval(`
    var b = wasmTextToBinary(MODULE_TEXT);
    var m = new WebAssembly.Instance(new WebAssembly.Module(b), {m: {f: () => {}}});
  `);
  let script = dbg.findScripts().filter(s => s.format == "wasm")[0];
  let offsets = script.getPossibleBreakpointOffsets();
  let hits = 0;
  for (let off of offsets) script.setBreakpoint(off, { hit: () => { hits++; } });
  g.eval("m.exports.test()");
  return hits;
}

// Use a variety of offsets in an attempt to shake out any errors relating to
// endianness or granularity in the associated debug-filter bitmap.
let indices = [0, 1, 3, 5, 7, 13, 27,   // uint32_t #0
               39, 55, 62,              // uint32_t #1
               70, 85, 94,              // uint32_t #2
               101, 117, 125,           // uint32_t #3
               130, 149];               // uint32_t #4

for (i of indices) {
  assertEq(hitsForFuncAtIndex(i), 2);
}
