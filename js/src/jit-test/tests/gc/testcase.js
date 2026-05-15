// |jit-test| error: Error

function wasmRunWithDebugger(wast, lib, init, done) {
    let g = newGlobal({newCompartment: true});
    let dbg = new Debugger(g);
    g.eval(`
      var wasm = wasmTextToBinary(\`${wast}\`);
      var lib = ${lib || 'undefined'};
      var m = new WebAssembly.Instance(new WebAssembly.Module(wasm), lib)
    `);
    var wasmScript = dbg.findScripts().filter(s => s.format == 'wasm')[0];
    init({dbg, wasmScript, g,});
    result = g.eval("m.exports.test()");
}
let WasmStructrefValues = [];
let WasmArrayrefValues = [];
let WasmEqrefValues = [	...WasmStructrefValues, ...WasmArrayrefValues];
gczeal(6, 7);
wasmRunWithDebugger(`
 (module (memory 1 1)
 (func (param i32) (local f64) nop) 
 (export "test" (func 0))
 (data (i32.const 0) "Abcx2A"))
`, undefined,
function ({dbg}) {
  dbg.onEnterFrame = function (frame) {
    if (frame.type != 'wasmcall') return;
    var memoryContent = frame.eval('new DataView(memory0.buffer).getUint8(3)').return;
    frame.onStep = function () {
          assertEq(frame.offset, 65);
    };
  };
}, function ({error}) {} 
);
