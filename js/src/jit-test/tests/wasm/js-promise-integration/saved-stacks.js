// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

let count = 0;
var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);
dbg.onEnterFrame = function(f) {
  count += 1;
};

g.eval(`
var ins = new WebAssembly.Instance(new WebAssembly.Module(wasmTextToBinary(\`
(module
  (import "" "imp" (func $imp))
  (import "" "susp" (func $susp (result i32)))
  (func (export "run") (result i32)
    call $imp
    call $susp
    drop
    call $imp
    i32.const 1
  )
)
\`)), {
  "": {
    imp: function imp() { saveStack(); },
    susp: new WebAssembly.Suspending(async () => { await 0; return 1; })
  }
});
var run = WebAssembly.promising(ins.exports.run);
run();
(function f() { drainJobQueue(); })();
`);

assertEq(count, 7);
