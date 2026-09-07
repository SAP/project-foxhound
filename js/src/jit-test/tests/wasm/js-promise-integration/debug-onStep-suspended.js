// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Setting onStep on wasm frames suspended via JSPI must not crash.
// Verifies event counts across a 3-deep call chain: outer -> middle -> inner -> (suspending import).

var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);

var enterCount = 0, stepCount = 0, popCount = 0;
var frames = [];

dbg.onEnterFrame = function(f) {
  if (f.type !== "wasmcall") return;
  enterCount++;
  frames.push(f);
  f.onPop = function() { popCount++; };
};

g.eval(`
  var bin = wasmTextToBinary(\`
    (module
      (import "" "susp" (func $susp))
      (func $inner (call $susp))
      (func $middle (call $inner))
      (func $outer (export "outer") (call $middle))
    )
  \`);
  var resolver;
  var susp = new WebAssembly.Suspending(() => new Promise(r => { resolver = r; }));
  var inst = new WebAssembly.Instance(new WebAssembly.Module(bin), {"":{susp: susp}});
  var pf = WebAssembly.promising(inst.exports.outer);
  pf();
`);

// All 3 wasm frames entered before the suspension.
assertEq(enterCount, 3);
assertEq(frames.length, 3);

// Set onStep on each suspended frame. Since step mode is not enabled (no
// stepper counter was incremented), these handlers will never fire.
for (var f of frames) {
  f.onStep = function() { stepCount++; };
}

g.eval(`resolver();`);
drainJobQueue();

// onStep fires once per function as each resumes and returns.
assertEq(stepCount, 3);
// onPop fires once per frame as each returns after resumption.
assertEq(popCount, 3);
// No additional enter events on resumption (frames resume, not re-enter).
assertEq(enterCount, 3);
