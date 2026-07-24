// Tests with types that are defined in the module internally.

// Suspending function with internal struct parameter.
assertErrorMessage(() => {
  const sf = new WebAssembly.Suspending(async () => {});
  const ins = wasmEvalText(`(module
    (type $pair (struct (field i32) (field i32)))
    (import "" "sf" (func $sf (param (ref $pair))))
  )`, {"": {sf,}});
}, TypeError, "Unsupported JSPI function argument type");

// Suspending function with internal struct result.
assertErrorMessage(() => {
  const sf = new WebAssembly.Suspending(async () => {});
  const ins = wasmEvalText(`(module
    (type $pair (struct (field i32) (field i32)))
    (import "" "sf" (func $sf (result (ref $pair))))
  )`, {"": {sf,}});
}, TypeError, "Unsupported JSPI function argument type");

// Promising function with internal struct parameter.
assertErrorMessage(() => {
  const ins = wasmEvalText(`(module
    (type $pair (struct (field i32) (field i32)))
    (func (export "e") (param (ref $pair))
       unreachable
    )
  )`);
  var p = WebAssembly.promising(ins.exports.e);
}, TypeError, "Unsupported JSPI function argument type");

// Promising function with internal struct result.
assertErrorMessage(() => {
  const ins = wasmEvalText(`(module
    (type $pair (struct (field i32) (field i32)))
    (func (export "e") (result (ref $pair))
       unreachable
    )
  )`);
  var p = WebAssembly.promising(ins.exports.e);
}, TypeError, "Unsupported JSPI function argument type");
