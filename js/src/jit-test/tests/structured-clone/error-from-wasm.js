// |jit-test| skip-if: !wasmIsSupported()

function testCloneError() {
  var err = new Error("our message");
  var clone = deserialize(serialize(err));
  assertEq(err.message, clone.message);
  assertEq(err.lineNumber, clone.lineNumber);
  assertEq(err.columnNumber, clone.columnNumber);
  assertEq(err.stack, clone.stack);
}
let bin = wasmTextToBinary(`
  (module
    (import "env" "testCloneError" (func $testCloneError))
    (func (export "runTest") call $testCloneError))
`);
let mod = new WebAssembly.Module(bin);
let ins = new WebAssembly.Instance(mod, {env: {testCloneError}});

// Call testCloneError directly and from Wasm code.
testCloneError();
ins.exports.runTest();
