// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Test a wasm stack with debug frames mixed with non-debug frames.

// g1 is debugged, g2 is not
const g1 = newGlobal({ newCompartment: true });
const g2 = newGlobal({ sameCompartmentAs: g1 });
const dbg = new Debugger(g1);

// Observe frames that are created
dbg.onEnterFrame = function(frame) {
  if (frame.type != "wasmcall") {
    return;
  }
  frame.onStep = () => {
    frame.offset; // check if frame is valid
  };
  frame.onPop = () => {
  }
};

// Create a debugged 'passThrough' function which just calls the funcref param
// given to it.
g1.eval(`
function wasmEvalText(t, imp) {
  var wasm = wasmTextToBinary(t)
  var mod = new WebAssembly.Module(wasm);
  var ins = new WebAssembly.Instance(mod, imp);
  return ins;
}
passThrough = wasmEvalText(\`(module
    (type $func (func))
    (func (export "passThrough") (param (ref $func))
        (call_ref $func local.get 0)
    )
)\`).exports.passThrough;
`);

// Smuggle that over to the non-debugged g2
g2.debuggedPassThrough = g1.passThrough;

// Create a stack which has a debugged frame in the middle, using the
// passthrough function.
g2.eval(`
function wasmEvalText(t, imp) {
  var wasm = wasmTextToBinary(t)
  var mod = new WebAssembly.Module(wasm);
  var ins = new WebAssembly.Instance(mod, imp);
  return ins;
}

let suspend = new WebAssembly.Suspending(() => Promise.resolve());

let {run} = wasmEvalText(\`(module
    (type $func (func))
    (import "" "debuggedPassThrough" (func $debuggedPassThrough (param (ref $func))))
    (import "" "suspend" (func $suspend))

    (func $callSuspend (export "")
        call $suspend
    )

    (func (export "run")
        ref.func $callSuspend
        call $debuggedPassThrough
        
    )
)\`,
{"": {debuggedPassThrough, suspend}}
).exports;

run = WebAssembly.promising(run);

run();
drainJobQueue();
`);
