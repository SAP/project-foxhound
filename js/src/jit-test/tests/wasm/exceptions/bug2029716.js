const code = `
(module
  (import "" "f" (func $f))
  (func (export "run")
    call $f
  )
)`;

// Throwing any JS value through wasm should still work.
let instance = wasmEvalText(code,
  {"": {f: () => { throw 42; }}});
caught = null;
try {
  instance.exports.run();
} catch (e) {
  caught = e;
}
assertEq(caught, 42);
