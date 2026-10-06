// |jit-test| --more-compartments; skip-if: wasmCompileMode() == "ion"

gczeal(5);
newGlobal().Debugger(this).memory.trackingAllocationSites = true;
function b(binary) {
  c = new WebAssembly.Module(binary)
  return new WebAssembly.Instance(c)
}
function d(e) {
  return b(wasmTextToBinary(e))
}
f = { newArray } = d(`
  (module
    (type $a (sub (array i32)))
    (func (export "newArray") (result anyref)
       i32.const 0
       i32.const 0
       array.new $a
    )
  )
`).exports;

assertErrorMessage(() => f(newArray()),
                   TypeError, "f is not a function");

