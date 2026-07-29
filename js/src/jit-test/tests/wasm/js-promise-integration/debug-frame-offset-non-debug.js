// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Reading Debugger.Frame.offset on a wasm frame while JSPI is active must not
// crash. The activation contains non-debug-enabled builtin module frames;
// wasmUpdateBytecodeOffset must skip them before calling debugFrame().

var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);
var grabbed = [];
dbg.onEnterFrame = function(frame) {
  if (frame.type === "wasmcall") grabbed.push(frame);
  for (var i = 0; i < grabbed.length; i++) {
    try { if (grabbed[i].onStack) grabbed[i].offset; } catch (e) {}
  }
};
g.eval(`
  function susp(){ return Promise.resolve(0); }
  var code = wasmTextToBinary('(module (import "e" "f" (func $f (result i32))) (func $g (export "g") (param i32) (result i32) (drop (call $f)) (call $f)))');
  var inst = new WebAssembly.Instance(new WebAssembly.Module(code), {e:{f: new WebAssembly.Suspending(susp)}});
  var prom = WebAssembly.promising(inst.exports.g);
  this.go = function(){ return prom(1); };
`);
for (var k = 0; k < 100; k++) { g.go(); drainJobQueue(); }
