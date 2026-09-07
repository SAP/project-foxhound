// |jit-test| skip-if: !wasmJSPromiseIntegrationEnabled()

// Regression test for bug 2042753:
// Debugger.Frame objects for wasm frames on a JSPI continuation must be
// terminated when the continuation is GC'd, so that a reused slot cannot
// resurrect them as apparently-live frames for a different continuation.

var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);
var oldFrames = [];
var phase = 1;

dbg.onEnterFrame = function(f) {
  if (f.type !== "wasmcall") return;
  if (phase === 2) {
    // While a new (shallow) continuation is active, verify the stale frames
    // from the old (deep, already GC'd) continuation report onStack = false
    // and do not crash when accessed.
    for (var fr of oldFrames) {
      assertEq(fr.onStack, false);
    }
  } else {
    oldFrames.push(f);
  }
};

// Phase 1: create a deep (3-frame) JSPI continuation that suspends on a
// never-resolving promise, then drop all references and GC it.
g.eval(`
  var binDeep = wasmTextToBinary(\`(module
    (import "" "susp" (func $susp))
    (func $inner (call $susp))
    (func $middle (call $inner))
    (func $outer (export "outer") (call $middle))
  )\`);
  var neverResolve = new WebAssembly.Suspending(() => new Promise(() => {}));
  var instD = new WebAssembly.Instance(new WebAssembly.Module(binDeep),
                                       {"":{susp: neverResolve}});
  var pfD = WebAssembly.promising(instD.exports.outer);
  pfD();
  pfD = null; instD = null; neverResolve = null; binDeep = null;
`);

gc(); gc(); gc();
assertEq(oldFrames.length, 3);

phase = 2;

// Phase 2: run a shallow (1-frame) continuation on the same allocator, which
// will reuse the freed slot. The onEnterFrame handler above verifies that the
// stale old frames correctly report onStack = false.
g.eval(`
  var binShallow = wasmTextToBinary(\`(module
    (import "" "susp" (func $susp))
    (func $only (export "outer") (call $susp))
  )\`);
  var s2 = new WebAssembly.Suspending(() => new Promise(() => {}));
  var instS = new WebAssembly.Instance(new WebAssembly.Module(binShallow),
                                       {"":{susp: s2}});
  var pfS = WebAssembly.promising(instS.exports.outer);
  pfS();
`);

print("ok");
