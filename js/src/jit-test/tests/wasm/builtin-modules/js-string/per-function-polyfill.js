// Test 1: Per-function polyfillability with mixed builtin and polyfill functions
// - "test" and "cast" exist in the builtin module and should use native implementations
// - "futureFunction" doesn't exist in the builtin and should fall back to the polyfill
const testModule = `(module
  (import "wasm:js-string" "test" (func $testImp (param externref) (result i32)))
  (import "wasm:js-string" "cast" (func $castImp (param externref) (result (ref extern))))
  (import "wasm:js-string" "futureFunction" (func $futureImp (param externref) (result externref)))
  (func (export "test") (param externref) (result i32)
    local.get 0
    call $testImp
  )
  (func (export "cast") (param externref) (result externref)
    local.get 0
    call $castImp
  )
  (func (export "futureFunction") (param externref) (result externref)
    local.get 0
    call $futureImp
  )
)`;

const polyFillImports = {
  test: (x) => {
    throw new Error("native builtin should be called, not polyfill");
  },
  cast: (x) => {
    throw new Error("native builtin should be called, not polyfill");
  },
  futureFunction: (x) => {
    return x;
  }
};

let instance = wasmEvalText(testModule, { 'wasm:js-string': polyFillImports }, {builtins: ["js-string"]});

assertEq(instance.exports.test("hello"), 1);
assertEq(instance.exports.test(42), 0);
assertEq(instance.exports.cast("world"), "world");
assertErrorMessage(() => instance.exports.cast(42), WebAssembly.RuntimeError, /bad cast/);
assertEq(instance.exports.futureFunction("test"), "test");
assertEq(instance.exports.futureFunction(123), 123);

// Test 2: Functions missing from both builtin and imports should fail at instantiation
// "nonExistentFunction" doesn't exist in the builtin, and is not provided in the imports object,
// so instantiation should fail with a LinkError
const missingFunctionModule = `(module
  (import "wasm:js-string" "nonExistentFunction" (func $missing (param externref) (result externref)))
)`;

assertErrorMessage(
  () => wasmEvalText(missingFunctionModule, { 'wasm:js-string': {} }, {builtins: ["js-string"]}),
  WebAssembly.LinkError,
  /import object field 'nonExistentFunction' is not a Function/
);
