// A Wasm trap that is copied across compartments by the Debugger's
// ErrorCopier (js::CopyErrorObject) must retain its trap flag, so it stays
// uncatchable by Wasm exception handling (catch_all).

// Exports a function that traps via `unreachable`.
const trapBytes = wasmTextToBinary(`(module
  (func (export "trap") unreachable))`);

// Imports "m.f" and wraps its call in a catch_all, returning 1 if the call
// threw something that was caught, 0 otherwise.
const catching = wasmEvalText(`(module
  (import "m" "f" (func $f))
  (func (export "run") (result i32)
    try (result i32)
      (call $f)
      (i32.const 0)
    catch_all
      (i32.const 1)
    end))`, {
  m: { f: copiedTrapThroughDebugger() },
});

// The copied trap must not be caught by catch_all; running it should propagate
// the trap as an uncatchable RuntimeError.
assertErrorMessage(() => catching.exports.run(),
                   WebAssembly.RuntimeError, /unreachable executed/);

function copiedTrapThroughDebugger() {
  const g = newGlobal({ newCompartment: true });
  g.trapBytes = trapBytes;
  g.eval(`
    var trap = new WebAssembly.Instance(
      new WebAssembly.Module(trapBytes)
    ).exports.trap;
    var proxy = new Proxy({}, { ownKeys() { trap(); } });
  `);

  const dbg = new Debugger();
  const gw = dbg.addDebuggee(g);
  const proxy = gw.getOwnPropertyDescriptor("proxy").value;

  // Calling getOwnPropertyNames() triggers the proxy's ownKeys trap across the
  // compartment boundary, routing the resulting RuntimeError through the
  // Debugger's ErrorCopier.
  return function triggerCopiedTrap() {
    proxy.getOwnPropertyNames();
  };
}
